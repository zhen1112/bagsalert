const WebSocket = require('ws');
const axios = require('axios');
const bs58 = require('bs58');
const fetch = require('cross-fetch');
const { Connection, Keypair, VersionedTransaction } = require('@solana/web3.js');
const { Wallet } = require('@project-serum/anchor');
const { getPrivateKeySnipeTicker, getPrivateKeysByTicker } = require('./connection.js');



const API_KEY = '784ae35b-5d95-4a39-b058-0d24eaf50230';
const walletAddress = 'BAGSB9TpGrZxQbEsrEznv5jXXdwyP6AXerN8aVRiAmcv';
const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`;
const connection = new Connection(rpcUrl);

async function sendTelegramMessage(userId, message) {
  try {
    const token = '';
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    await axios.post(url, {
      chat_id: userId,
      text: message
    });
  } catch (err) {
    console.error('❌ Gagal kirim pesan Telegram:', err.message);
  }
}

function solToLamports(sol) {
  return Math.floor(sol * 1_000_000_000);
}
async function snipe(outputMint, privateKey, amounts) {
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const wallet = new Wallet(keypair);
  const amount = solToLamports(amounts);

  try {
    console.log(`🚀 Attempting snipe for ${outputMint}`);

    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${outputMint}&amount=${amount}&slippageBps=50&onlyDirectRoutes=true`;
    const quoteRes = await axios.get(quoteUrl);
    const route = quoteRes.data;

    if (!route || !route.routePlan || route.routePlan.length === 0) {
      console.error('❌ No swap route found.');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    const swapRes = await axios.post('https://quote-api.jup.ag/v6/swap', {
      quoteResponse: route,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapUnwrapSOL: true,
      feeAccount: null
    });

    const swapTxBase64 = swapRes.data.swapTransaction;
    const swapTxBuffer = Buffer.from(swapTxBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTxBuffer);

    transaction.sign([keypair]);
    const rawTx = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTx, { skipPreflight: true });

    console.log(`✅ Swap sent! Tx ID: ${txid}`);
    return txid;
  } catch (err) {
    console.error('❌ Error during swap:', err.response?.data || err.message);
  }
}

function startWebSocket() {
  const ws = new WebSocket(rpcUrl.replace('https://', 'wss://'));

  ws.on('open', () => {
    console.log('✅ WebSocket connected');
    const req = {
      jsonrpc: "2.0",
      id: 1,
      method: "logsSubscribe",
      params: [{ mentions: [walletAddress] }, { commitment: "confirmed" }]
    };
    ws.send(JSON.stringify(req));
  });

  ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    if (msg.method === 'logsNotification') {
      const signature = msg.params.result?.value?.signature;
      if (!signature) return;

      console.log('📝 Signature Found:', signature);
      try {
        await getTransaction(signature);
      } catch (err) {
        console.error('❌ Error processing transaction:', err.message);
      }
    }
  });

  ws.on('error', (err) => console.error('❌ WebSocket error:', err.message));

  ws.on('close', () => {
    console.log('🔁 Reconnecting WebSocket in 5s...');
    setTimeout(startWebSocket,  1000);
  });
}

async function getTransaction(signature) {
  const maxRetries = 5;
  for (let i = 1; i <= maxRetries; i++) {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed"
    });
    if (tx) {
      const staticKeys = tx.transaction.message.staticAccountKeys;
      const foundKey = staticKeys.find(key => /BAGS$/.test(key.toBase58()));
      if (foundKey) {
        const tokenAddress = foundKey.toBase58();
        console.log('✅ CA TOKEN FOUND:', tokenAddress);
        await new Promise(r => setTimeout(r, 2000));
        await getTokenInfo(tokenAddress);
      }
      return;
    }
    console.log(`⏳ Retry ${i}/${maxRetries}...`);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('❌ Transaction not found after retries.');
}

async function getTokenInfo(tokenAddress) {
  const maxRetries = 5;
  const delayMs = 1500;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`,
        {
          jsonrpc: "2.0",
          id: "1",
          method: "getAsset",
          params: { id: tokenAddress },
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;

      if (!data.result?.content?.json_uri) {

        console.log(`json_uri not yet find, retrying ${attempt}/${maxRetries}...`);
        await new Promise(res => setTimeout(res, delayMs));
        continue;
      }
      const url = data.result.content.json_uri;
      console.log(url)
      const resp = await axios.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
    }
    });
    console.log(resp.data)
      const { symbol } = resp.data;
        const cleanSymbol = symbol.trim().toUpperCase();
        const privateKeys = Array.from(await getPrivateKeysByTicker(cleanSymbol));

        if (privateKeys.length > 0) {
        console.log(`✅ ${symbol}  Running Snipe...`);
        for (const { user_id, private_key, amount } of privateKeys) {
        console.log(`🚀 Execution snipe for user ${user_id} token ${symbol}`);
        console.log(private_key)
        snipe(tokenAddress, private_key, amount)
            .then(txid => sendTelegramMessage(user_id, `✅ Success snipe token ${symbol}: https://solscan.io/tx/${txid}`))
            .catch(err => sendTelegramMessage(user_id, `❌ Failed snipe token ${symbol}: ${err.message}`));
        }
    }

      return resp.data;
    } catch (error) {
      console.error('Error fetching token info:', error.message);
      break;
    }
  }

  console.log('❌ Failed json_uri after retry');
}
startWebSocket();
