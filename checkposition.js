const fetch = require('node-fetch');

const API_KEY = '784ae35b-5d95-4a39-b058-0d24eaf50230';
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${API_KEY}`;

async function getTokensDetailed(ownerAddress) {
  const tokens = await (async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getTokenAccountsByOwner',
        params: [
          ownerAddress,
          {
            programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
          },
          {
            encoding: 'jsonParsed'
          }
        ]
      })
    });

    const data = await response.json();
    return data.result?.value || [];
  })();

  const resultList = [];

  for (const token of tokens) {
    const mint = token.account.data.parsed.info.mint;
    const amount = parseFloat(token.account.data.parsed.info.tokenAmount.uiAmount);
    if (amount < 1) continue;

    const metadata = await (async () => {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getAsset',
          params: { id: mint }
        })
      });

      const result = await response.json();
      const meta = result?.result?.content?.metadata;
      return {
        symbol: meta?.symbol || 'UNKNOWN',
        name: meta?.name || 'Unnamed Token'
      };
    })();

    resultList.push({
      mint,
      symbol: metadata.symbol,
      name: metadata.name,
      amount
    });
  }

  return resultList;
}

module.exports = { getTokensDetailed };
