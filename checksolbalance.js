const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');

const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

async function checkSolBalance(walletAddress) {
    try {
        const pubkey = new PublicKey(walletAddress);
        const lamports = await connection.getBalance(pubkey);
        const sol = lamports / 1e9;
        console.log(`Balance for ${walletAddress}: ${sol} SOL`);
        return sol;
    } catch (err) {
        console.error('Error checking SOL balance:', err);
        return null;
    }
}

module.exports = { checkSolBalance };
