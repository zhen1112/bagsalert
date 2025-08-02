const WebSocket = require('ws');
const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const TelegramBot = require('node-telegram-bot-api');
const { db, insertUser, checkId, selectWallet, tickerInsert, deleteTickerByUser, selectPrivateKey, getPrivateKey, updateUser } = require('./connection.js');
const tokenTelegram = '';
const bot = new TelegramBot(tokenTelegram, { polling: true });
const {createSolanaWallet } = require('./createwallet.js')
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC);
const heliusSocket = new WebSocket('wss://mainnet.helius-rpc.com/?api-key=bdd50eae-c7f0-4924-8594-fff7f2199038');
const {checkSolBalance} = require('./checksolbalance.js');
const {sendSol} = require('./sendsol.js');
const {getTokensDetailed} = require('./checkposition.js');
const {sellToken} = require('./sell.js');
const { getTokenAmountByMint } = require('./cekalert.js')
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = (msg.from.username || msg.from.first_name || "Pengguna").trim();

        const exists = await checkId(chatId);
        if (!exists) {
            await insertUser(chatId, username);
            await createSolanaWallet(chatId)
        }
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "💰 Feature" }, { text: "⚙️ Setting" }],
                [{ text: "💰 Deposit" }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };

    bot.sendMessage(chatId, `Hallo ${username}, welcome to our functional bot on BagsApp. See how you can use this bot below.\n\n✨ Available Features:✨\n🔍 Auto Snipe — Auto Snipe new token on BAGS\n📊 Auto Snipe With Ticker\n🔁 Auto Boost Volume (FOR CREATOR)`, options);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
   if (
        msg.reply_to_message &&
        msg.reply_to_message.text &&
        msg.reply_to_message.text.includes('Please Send a ticker to snipe reply this message')
    ) {
        const ticker = text.trim().toUpperCase();
        return bot.sendMessage(chatId,
            `🆔 Ticker received: *$${ticker}*\nPlease reply with the *amount in SOL* you want to use for sniping.`,
            {   
                parse_mode: 'Markdown',
                reply_markup: { force_reply: true }
            }
            
        );
    }

    if (
        msg.reply_to_message &&
        msg.reply_to_message.text &&
        msg.reply_to_message.text.includes('Ticker received:')
    ) {
        const amount = parseFloat(text.trim());
        if (isNaN(amount)) {
            return bot.sendMessage(chatId, '⚠️ Invalid amount. Please enter a number.');
        }

        const match = msg.reply_to_message.text.match(/\*?\$([A-Z0-9]+)\*?/);

        const ticker = match ? match[1] : null;

        if (!ticker) return bot.sendMessage(chatId, '❌ Ticker not found. Please restart.');

        return bot.sendMessage(chatId,
            `✅ Ticker: *${ticker}*\n💸 Amount: *${amount} SOL*\nProceed?`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🟢 ON', callback_data: `snipe_on_${ticker}_${amount}` },
                            { text: '🔴 OFF', callback_data: `snipe_off` }
                        ]
                    ]
                }
            }
        );
    }
    if (text === '💰 Feature') {
        return bot.sendMessage(chatId,'⚙️ Block Chain',
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: ' Send SOL', callback_data: 'send_' }],
                        [{ text: ' Check Position ', callback_data: 'cek_'}]
                    ]
                }
            }
            
        );
    }

    if (text === '⚙️ Setting') {
        return bot.sendMessage(chatId, '⚙️ Choose a setting below:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎯 Snipe New Token', callback_data: 'snipe_new' }],
                    [{ text: '🔤 Snipe With Ticker', callback_data: 'snipe_ticker' }],
                    [{ text: '🚀 Auto BOOST', callback_data: 'auto_boost' }]
                ]
            }
        });
    }
    if (text === '💰 Deposit') {
        const walletAddress = await selectWallet(chatId)
        const balance = await checkSolBalance(walletAddress)
bot.sendMessage(chatId, 
`💸 *Deposit to your wallet address:*

\`${walletAddress}\` \n
Balance : ${balance} SOL
`,
{
    parse_mode: 'Markdown'
});

    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'snipe_new') {
  bot.sendMessage(chatId, 'Please enter the amount you want to use to snipe (in SOL):', {
    parse_mode: 'Markdown',
    reply_markup: { force_reply: true }
  }).then(sent => {
    bot.onReplyToMessage(sent.chat.id, sent.message_id, async reply => {
      const amount = parseFloat(reply.text);
      if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ Invalid amount. Please try again.');
      }

      bot.sendMessage(chatId, '🔍 Please click ON/OFF to snipe new token...', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🟢 ON', callback_data: `onsniper_${amount}` }],
            [{ text: '🔴 OFF', callback_data: 'ofsniper' }]
          ]
        }
      });
    });
  });
}

    if (data === 'send_') {
        bot.sendMessage(chatId, 'Please reply with your address destination (must be a valid Solana address)', {
            reply_markup: { force_reply: true }
        }).then(addressMsg => {
            bot.onReplyToMessage(chatId, addressMsg.message_id, (addressReply) => {
                const address = addressReply.text.trim();

                bot.sendMessage(chatId, 'Send amount of SOL you want to send (e.g. 0.1):', {
                    reply_markup: { force_reply: true }
                }).then(amountMsg => {
                    bot.onReplyToMessage(chatId, amountMsg.message_id, (amountReply) => {
                        const amount = amountReply.text.trim();

                        bot.sendMessage(chatId, `Are you sure you want to send ${amount} SOL to:\n\n${address}?`, {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: '✅ Confirm', callback_data: `confirm_send|${address}|${amount}` },
                                        { text: '❌ Cancel', callback_data: `cancel_send` }
                                    ]
                                ]
                            }
                        });
                    });
                });
            });
        });
    }
    if (data === 'snipe_ticker') {
        return bot.sendMessage(chatId, '🔤 Please Send a ticker to snipe reply this message (do not include the ticker in the message)',
            {
                   reply_markup: { force_reply: true }
            }
        );
    }
    if (data === 'cek_') {
    const address = await selectWallet(chatId);
    if (!address) {
        return bot.sendMessage(chatId, '⚠️ Wallet not found.');
    }

    const tokens = await getTokensDetailed(address);

    if (tokens.length === 0) {
        return bot.sendMessage(chatId, '❗ No tokens with amount ≥ 1.');
    }

    let message = '*Your Tokens:*\n\n';
    const buttons = [];

    let index = 1;
    for (const token of tokens) {
        message += `${index++}. *${token.symbol}* (${token.name})\n`;
        message += `Mint: \`${token.mint}\`\n`;
        message += `Amount: ${token.amount}\n\n`;
        const cleanAmount = token.amount.toString().split('.')[0]; 
        buttons.push([
        { text: `💸 Sell ${token.symbol}`, callback_data: `sell_${token.mint}_${cleanAmount}` }
        ]);
    }

    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
        inline_keyboard: buttons
        }
    });
    }
    if (data === 'auto_boost') {
        return bot.sendMessage(chatId, '⚠️  Auto BOOST is under development...');
    }

     if (data.startsWith('snipe_on')) {
    const [action, status, ticker, amountStr] = data.split('_');
    const amount = parseFloat(amountStr);
    const user_id = chatId;
    const walletUser = await selectWallet(chatId)
    const currentToken = await getTokenAmountByMint(walletUser)
    if(currentToken < 500000){
        return bot.sendMessage(chatId, '❗️ You do not have enough tokens to perform this action.');
    }

    if (!ticker || isNaN(amount)) {
        return bot.sendMessage(chatId, `❌ Invalid snipe data. Please try again.`);
    }
    const privateKey = await selectPrivateKey(chatId)
    const success = await tickerInsert({ ticker, amount, user_id, privateKey, status });
    if (success) {
        await bot.sendMessage(chatId, `✅ *${status.toUpperCase()}* snipe for *${ticker}* with *${amount} SOL* saved.`, { parse_mode: 'Markdown' });
    } else {
        await bot.sendMessage(chatId, `❌ Failed to save snipe info.`, { parse_mode: 'Markdown' });
    }
}
if (data.startsWith('onsniper_')) {
  const amount = parseFloat(data.split('_')[1]);
  if (isNaN(amount) || amount <= 0) {
    return bot.sendMessage(chatId, '❌ Invalid amount format.');
  }
      const walletUser = await selectWallet(chatId)
    const currentToken = await getTokenAmountByMint(walletUser)
    if(currentToken < 500000){
        return bot.sendMessage(chatId, '❗️ You do not have enough tokens to perform this action.');
    }

  await updateUser(chatId, 'ON', amount)
    .then((updated) => {
      if (updated) {
        bot.sendMessage(chatId, `✅ Snipe New Mode enabled.\nAmount set to ${amount} SOL.`);
      } else {
        bot.sendMessage(chatId, '⚠️ Failed to enable Snipe New Mode. User not found.');
      }
    })
    .catch((err) => {
      console.error('❌ Error enabling Snipe New Mode:', err.message);
      bot.sendMessage(chatId, '❌ An error occurred while enabling Snipe New Mode.');
    });
}

if (data === 'ofsniper') {
  await updateUser(chatId, 'OFF')
    .then((updated) => {
      if (updated) {
        bot.sendMessage(chatId, '✅ Snipe New Mode has been disabled for your account.');
      } else {
        bot.sendMessage(chatId, '⚠️ Failed to enable Snipe New Mode. Please try again later.');
      }
    })
    .catch((err) => {
      console.error('❌ Error enabling Snipe New Mode:', err.message);
      bot.sendMessage(chatId, '❌ An error occurred while enabling Snipe New Mode.');
    });
}
if (data.startsWith('confirm_send')) {
    const [, address, amount] = data.split('|');

    try {
        const privateKeyBase58 = await getPrivateKey(chatId);
        console.log(privateKeyBase58)

        if (!privateKeyBase58) {
            return bot.sendMessage(chatId, '❌ Private key not found.');
        }

        console.log(`🚀 Attempting to send ${amount} SOL to ${address} for user ${chatId}`);

        const txid = await sendSol(address, amount, privateKeyBase58);
        bot.sendMessage(chatId, `✅ Successfully sent ${amount} SOL to ${address}\n🔗 https://solscan.io/tx/${txid}`);
        console.log(`✅ Transaction sent! Tx ID: ${txid}`);
    } catch (error) {
        console.error(`❌ Failed to send SOL: ${error.message}`);
        bot.sendMessage(chatId, `❌ Failed to send SOL: ${error.message}`);
    }
}

if (data === 'snipe_off') {
    bot.deleteMessage(chatId, query.message.message_id)
    const deleted = await deleteTickerByUser(chatId);
    if (deleted) {
        await bot.sendMessage(chatId, '❌ Snipe cancelled and data removed.');
        
    } else {
        await bot.sendMessage(chatId, '⚠️ No active snipe found or deletion failed.');
    }
}
if (data.startsWith('sell_')) {
const parts = data.split('_');
const mint = parts[1];
const amount = parts[2];
  const private_key = await selectPrivateKey(chatId);

  bot.sendMessage(chatId, `🔁 Selling token...\nMint: \`${mint}\`\nAmount: ${amount}`, { parse_mode: 'Markdown' });

  try {
    const txid = await sellToken(mint, private_key, amount);
    if (txid) {
      bot.sendMessage(chatId, `✅ Successfully sold!\n🔗 [View on Solana Explorer](https://solscan.io/tx/${txid})`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    } else {
      bot.sendMessage(chatId, `❌ Failed to sell token. No transaction sent.`);
    }
  } catch (err) {
    console.error('Sell error:', err.message);
    bot.sendMessage(chatId, `❌ Error while selling token:\n${err.message}`);
  }
}

});
