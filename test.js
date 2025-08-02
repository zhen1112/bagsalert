const WebSocket = require('ws');
const axios = require('axios');
const bs58 = require('bs58');
const fetch = require('cross-fetch');
const { Connection, Keypair, VersionedTransaction } = require('@solana/web3.js');
const { Wallet } = require('@project-serum/anchor');
const { getPrivateKeysByTicker } = require('./connection.js');
const API_KEY = '784ae35b-5d95-4a39-b058-0d24eaf50230';
const walletAddress = 'BAGSB9TpGrZxQbEsrEznv5jXXdwyP6AXerN8aVRiAmcv';
const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`;
const connection = new Connection(rpcUrl);

async function sendTelegramMessage(userId, message) {
  try {
    const sql = 'SELECT telegram_id FROM users WHERE user_id = ?';
    const [rows] = await pool.query(sql, [userId]);
    if (rows.length === 0) return console.log('❌ Telegram ID tidak ditemukan');

    const chatId = rows[0].telegram_id;
    const token = '7469761183:AAEM9MEoWMBJCiRFV4MPO7TbEbZb7kmxVm4'; // ganti token ini
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    await axios.post(url, {
      chat_id: chatId,
      text: message
    });
  } catch (err) {
    console.error('❌ Gagal kirim pesan Telegram:', err.message);
  }
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

        console.log(`json_uri belum ada, retrying ${attempt}/${maxRetries}...`);
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


        console.log('Hasil DB:', privateKeys);
        if (privateKeys.length > 0) {
        console.log(`✅ ${symbol} ditemukan di DB. Menjalankan snipe...`);
        for (const { user_id, private_key, amount } of privateKeys) {
        console.log(`🚀 Eksekusi snipe untuk user ${user_id} token ${symbol}`);
        console.log(private_key)
        console.log(amount)
        console.log(user_id)
        snipe(tokenAddress, private_key,amount)
            .then(txid => sendTelegramMessage(user_id, `✅ Success snipe token ${symbol}: https://solscan.io/tx/${txid}`))
            .catch(err => sendTelegramMessage(user_id, `❌ Gagal snipe token ${symbol}: ${err.message}`));
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
getTokenInfo('F3jFrhPFbx78KKePZ585WTL6L5vZxa59VJ3UJAyBBAGS')