
const { Connection, Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');  // Correct import for bs58
const { clusterApiUrl, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');


async function sendSol(receiverPublicKey, amount, private_key) {
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=784ae35b-5d95-4a39-b058-0d24eaf50230', 'confirmed');
    const sender = Keypair.fromSecretKey(bs58.decode(private_key));
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: sender.publicKey,
    }).add(
        SystemProgram.transfer({
            fromPubkey: sender.publicKey,
            toPubkey: new PublicKey(receiverPublicKey),
            lamports: amount * LAMPORTS_PER_SOL,
        })
    );
    try {
        const signature = await connection.sendTransaction(transaction, [sender]);
        const confirmation = await connection.confirmTransaction(
            { signature, blockhash, lastValidBlockHeight },
            'confirmed'
        );
        if (confirmation.value.err) {
            throw new Error("Konfirmasi transaksi gagal.");
        }

        console.log('✅ Transaksi sukses:', signature);
        return signature;
    } catch (error) {
        if (error.name === 'TransactionExpiredBlockheightExceededError') {
            console.warn('⚠️ Transaksi expired, cek status manual:', error.signature);
            const tx = await connection.getTransaction(error.signature);
            if (tx && tx.meta && !tx.meta.err) {
                console.log('✅ Transaksi tetap berhasil:', error.signature);
                return error.signature;
            }
        }

        console.error('❌ Transaksi gagal:', error);
        throw error;
    }
}

module.exports = { sendSol };