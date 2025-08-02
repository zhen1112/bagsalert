const axios = require('axios');
const bs58 = require('bs58');
const fetch = require('cross-fetch');
const { Connection, Keypair, VersionedTransaction, PublicKey } = require('@solana/web3.js');
const { Wallet } = require('@project-serum/anchor');
const { getPKsniperON } = require('./connection');

const API_KEY = '784ae35b-5d95-4a39-b058-0d24eaf50230';
const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`;
const connection = new Connection(rpcUrl);

async function getTokenDecimals(mintAddress) {
  const res = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
  const info = res?.value?.data?.parsed?.info;
  return info?.decimals ?? 0;
}
 async function sellToken(outputMint, private_key, amount) {
    const keypair = Keypair.fromSecretKey(bs58.decode(private_key));
    const wallet = new Wallet(keypair);
    const decimals = await getTokenDecimals(outputMint);
    const rawAmount = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals)).toString();
    try {
      console.log(`🚀 Attempting snipe for ${outputMint} with user ${wallet.publicKey.toBase58()}`);
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${outputMint}&outputMint=So11111111111111111111111111111111111111112&amount=${rawAmount}&slippageBps=50&onlyDirectRoutes=true`;
      const quoteRes = await axios.get(quoteUrl);
      const route = quoteRes.data;

      if (!route || !route.routePlan || route.routePlan.length === 0) {
        console.error('❌ No swap route found.');
        return
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
    const errorData = err.response?.data || { error: err.message };
    console.error(`❌ Error for user ${wallet.publicKey.toBase58()}:`, errorData);
    return errorData; 
    }

 }

module.exports = { sellToken };
