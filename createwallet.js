const { Keypair } = require('@solana/web3.js');
const { insertWallet } = require('./connection');
const bs58 = require('bs58'); 

async function createSolanaWallet(userId) {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKey = bs58.encode(keypair.secretKey);

    console.log('Wallet Address:', publicKey);
    console.log('Private Key (hex):', privateKey);

    try {
        await insertWallet(userId, publicKey, privateKey);
        console.log('Wallet info successfully inserted into database.');
    } catch (err) {
        console.error('Failed to insert wallet info:', err);
    }
}

module.exports = { createSolanaWallet };
