const fetch = require('node-fetch');

const API_KEY = '784ae35b-5d95-4a39-b058-0d24eaf50230';
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`;
const TARGET_MINT = 'FNeRuC6NKu1WttG4HKM7MDX6XpPQQynJHeD2NLCHBAGS';

async function getTokenAmountByMint(ownerAddress) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'getTokenAccountsByOwner',
      params: [
        ownerAddress,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' }
      ]
    })
  });

  const data = await response.json();
  const tokens = data.result?.value || [];

  for (const token of tokens) {
    const mint = token.account.data.parsed.info.mint;
    if (mint === TARGET_MINT) {
      const amount = parseFloat(token.account.data.parsed.info.tokenAmount.uiAmount);
      console.log('Token amount:', amount);
      return { mint, amount };
    }
  }

  console.log('Token not found or zero amount');
  return { mint: TARGET_MINT, amount: 0 };
}

module.exports = { getTokenAmountByMint };
