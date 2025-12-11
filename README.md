# Cross-Chain Wallet Activity Dashboard

Minimal dashboard to connect a Web3 wallet, switch networks, and view recent transfers across Ethereum, Polygon, and Arbitrum. Built with React, TypeScript, Vite, ethers.js, and Zustand.

## Features

- MetaMask/Web3 wallet connect & graceful disconnect
- Chain selector (Ethereum, Polygon, Arbitrum) persisted in local storage
- Wallet network switch prompt via `wallet_switchEthereumChain`
- Last 10 transfers per chain via Alchemy `alchemy_getAssetTransfers` (sent + received)
- USD equivalents fetched from CoinGecko
- Loading and error states, rate-limit/error messaging
- Responsive, minimal UI

## Tech choices

- **State management:** Zustand for small, composable global state (wallet + chain preference) without boilerplate.
- **Data:** Alchemy RPC (free plan) for transfers; CoinGecko for native token USD price.
- **Fetching strategy:** Parallel requests for sent/received transfers and price; cached in-memory for 1 minute to avoid redundant RPCs.
- **Styling:** Lightweight custom CSS (no design system) with mobile responsiveness.

## Getting started

```bash
npm install
cp .env.example .env            # add your keys
npm run dev
```

Open http://localhost:5173.

## Configuration

Create `.env` with:

```
VITE_ALCHEMY_API_KEY=your_key_here
```

The key is used for all three networks through their respective Alchemy base URLs.

## Key flows

- **Connect:** `ethers.BrowserProvider` requests accounts; Zustand stores provider, signer, address, and network. Errors surface in the UI banner.
- **Switch chain:** Selector updates persisted preference; when connected, wallet is prompted to switch (adds chain if missing).
- **Activity fetch:** For the selected chain + address, calls `alchemy_getAssetTransfers` twice (sent + received), merges, sorts by timestamp, limits to 10, and annotates direction/status/fiat value. Results cached per address/chain for 60s.
- **USD price:** CoinGecko simple price endpoint, mapped per chain native token.

## Known limitations / next steps

- Does not paginate beyond the last 10 transfers.
- Uses CoinGecko unauthenticated endpoint; could add fallback or rate-limit handling UI.
- No unit tests yet; could add tests for wallet store and transfer normalization.
- Would harden amount parsing if token metadata varies across chains.
