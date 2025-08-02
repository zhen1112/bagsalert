const mysql = require('mysql');
const util = require('util');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bagsalert'
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to database via pool');
    connection.release();
});

// Promisify query untuk async/await
pool.query = util.promisify(pool.query);

async function insertUser(userId, username) {
    try {
        const sql = `
            INSERT INTO user (user_id, username)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE username = VALUES(username)
        `;
        const result = await pool.query(sql, [userId, username]);
        console.log('User inserted or updated:', result.insertId || 'OK');
    } catch (err) {
        console.error('Error inserting user:', err);
    }
}

async function checkId(userId) {
    try {
        const sql = `SELECT * FROM user WHERE user_id = ?`;
        const rows = await pool.query(sql, [userId]);
        if (rows.length > 0) {
            console.log(`User ID ${userId} found in database.`);
            return true;
        } else {
            console.log(`User ID ${userId} tidak ditemukan di database.`);
            return false;
        }
    } catch (err) {
        console.error('Error checking user ID:', err);
        throw err;
    }
}

async function insertWallet(userId, walletAddress, privateKey) {
    console.log(`Inserting wallet for user ID: ${userId}`);
    const sql = `
        UPDATE user 
        SET wallet_address = ?, private_key = ? 
        WHERE user_id = ?
    `;
    try {
        const result = await pool.query(sql, [walletAddress, privateKey, userId]);
        console.log('Wallet info updated for user:', userId);
        return result;
    } catch (err) {
        console.error('Error inserting wallet:', err);
        throw err;
    }
}
async function selectWallet(userId) {
    const sql = `SELECT wallet_address FROM user WHERE user_id = ?`;
    try {
        const rows = await pool.query(sql, [userId]);
        if (rows.length > 0) {
            const walletAddress = rows[0].wallet_address;
            console.log(`Wallet for user ID ${userId}: ${walletAddress}`);
            return walletAddress;
        } else {
            console.log(`User ID ${userId} tidak ditemukan di database.`);
            return null;
        }
    } catch (err) {
        console.error('Error selecting wallet:', err);
        throw err;
    }
}
async function selectPrivateKey(userId) {
    const sql = `SELECT private_key FROM user WHERE user_id = ?`;
    try {
        const rows = await pool.query(sql, [userId]);
        if (rows.length > 0) {
            const private_key = rows[0].private_key;
            return private_key;
        } else {
            console.log(`User ID ${userId} tidak ditemukan di database.`);
            return null;
        }
    } catch (err) {
        console.error('Error selecting wallet:', err);
        throw err;
    }
}
async function tickerInsert({ status, ticker, amount, privateKey, user_id }) {
    const sql = `INSERT INTO ticker (ticker, amount, user_id, private_key, status) VALUES (?, ?, ?, ?, ?)`;
    try {
        const result = await pool.query(sql, [ticker, amount, user_id, privateKey, status]);
        console.log('Ticker inserted:', result.insertId || 'OK');
        return true;
    } catch (err) {
        console.error('Error inserting ticker:', err);
        return false;
    }
}
async function deleteTickerByUser(user_id) {
    const sql = 'DELETE FROM ticker WHERE user_id = ?';
    try {
        const result = await pool.query(sql, [user_id]);
        return result.affectedRows > 0;
    } catch (err) {
        console.error('❌ Error deleting ticker by user:', err);
        return false;
    }
}
async function getPrivateKeySnipeTicker() {
    const sql = `SELECT private_key FROM ticker`;
    try {
        const [rows] = await pool.query(sql);
        if (rows.length > 0) {
            return rows[0].private_key;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching private key:', error);
        return null;
    }
}

async function getTickerSnipe() {
    const sql = `SELECT ticker FROM ticker`;
    try {
        const [rows] = await pool.query(sql);
        if (rows.length > 0) {
            return rows[0].ticker;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching ticker:', error);
        return null;
    }
}
async function getPrivateKey(chatId) {
    const sql = `SELECT private_key FROM user WHERE user_id = ?`;
    try {
        const rows = await pool.query(sql, [chatId]);
        if (rows && rows.length > 0) {
            console.log('✅ Found private key:', rows[0].private_key);
            return rows[0].private_key;
        } else {
            console.log('❌ No private key found for user:', chatId);
            return null;
        }
    } catch (err) {
        console.error('❌ Error fetching private key:', err.message);
        return null;
    }
}
async function getPKsniperON() {
  const sql = 'SELECT private_key, amount_snipe FROM user WHERE status = ?';
  return new Promise((resolve, reject) => {
    pool.query(sql, ['ON'], (err, results) => {
      if (err) {
        console.error('❌ Error fetching sniper ON private keys:', err.message);
        return reject(err);
      }
      const keys = results.map(row => ({
        private_key: row.private_key,
        amount: row.amount_snipe
      }));
      console.log(`✅ Found ${keys.length} sniper(s) with status ON`);
      resolve(keys);
    });
  });
}

async function updateUser(chatId, status, amount) {
  const sql = `UPDATE user SET status_snipenew = ?, amount_snip = ? WHERE user_id = ?`;
  try {
    const result = await new Promise((resolve, reject) => {
      pool.query(sql, [status, amount, chatId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (result.affectedRows > 0) {
      console.log(`✅ User ${chatId} updated: status = ${status}, amount = ${amount}`);
      return true;
    } else {
      console.warn(`⚠️ No user found with ID ${chatId}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error updating user:`, err.message);
    return false;
  }
}

function getPrivateKeysByTicker(ticker) {
  const sql = `SELECT user_id, private_key, amount FROM ticker WHERE ticker = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [ticker], (err, results) => {
      if (err) {
        console.error('Error fetching private keys by ticker:', err);
        return resolve([]);
      }

      // Pastikan hasilnya array biasa
      const cleanResults = results.map(row => ({ ...row }));
      resolve(cleanResults);
    });
  });
}


module.exports = {
    pool,
    insertUser,
    checkId,
    insertWallet,
    selectWallet,
    tickerInsert,
    deleteTickerByUser,
    getPrivateKeySnipeTicker,
    getTickerSnipe,
    getPrivateKeysByTicker,
    selectPrivateKey,
    getPrivateKey,
    updateUser,
    getPKsniperON
};
