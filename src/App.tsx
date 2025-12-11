import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { CHAINS, DEFAULT_CHAIN_ID, getChainById } from './chains'
import { useWalletStore } from './store/wallet'
import { formatAddress, formatDate } from './utils/format'
import type { ActivityRow } from './types'
import { fetchActivityForChain } from './services/alchemy'
import type { SupportedChain } from './chains'

type ActivityState = {
  loading: boolean
  error?: string
  rows: ActivityRow[]
}

const useSelectedChain = (): SupportedChain => {
  const selectedId = useWalletStore((s) => s.selectedChainId)
  return useMemo(() => getChainById(selectedId) ?? getChainById(DEFAULT_CHAIN_ID)!, [selectedId])
}

function App() {
  const [activity, setActivity] = useState<ActivityState>({ loading: false, rows: [] })
  const selectedChain = useSelectedChain()

  const { address, status, network, error, connect, disconnect, switchChain, setSelectedChainId } =
    useWalletStore()

  const walletChainId = network ? Number(network.chainId) : undefined
  const networkMismatch =
    status === 'connected' &&
    walletChainId !== undefined &&
    walletChainId !== selectedChain.chainId &&
    !!network

  useEffect(() => {
    const load = async () => {
      if (!address) {
        setActivity({ loading: false, rows: [] })
        return
      }
      setActivity((prev) => ({ ...prev, loading: true, error: undefined }))
      try {
        const rows = await fetchActivityForChain(address, selectedChain)
        setActivity({ loading: false, rows })
      } catch (err: unknown) {
        setActivity({ loading: false, rows: [], error: (err as Error).message })
      }
    }
    void load()
  }, [address, selectedChain])

  const handleChainChange = async (chainId: number) => {
    setSelectedChainId(chainId)
    if (status === 'connected') {
      try {
        await switchChain(chainId)
      } catch {
        /* already captured in store error */
      }
    }
  }

  const onConnect = async () => {
    try {
      await connect()
    } catch {
      /* error surfaced in UI */
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Cross-Chain Wallet Activity Dashboard</p>
          <h1>Monitor wallet activity across Ethereum, Polygon, and Arbitrum</h1>
          <p className="lede">
            Connect a wallet, pick a chain, and view the last 10 transfers with USD equivalents.
            Minimal, responsive, and built with React, ethers.js, and TypeScript.
          </p>
        </div>
        <div className="actions">
          {status === 'connected' ? (
            <button className="secondary" onClick={disconnect}>
              Disconnect
            </button>
          ) : (
            <button className="primary" onClick={onConnect} disabled={status === 'connecting'}>
              {status === 'connecting' ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Wallet</p>
            <h2>Connection</h2>
          </div>
          <div className="status-row">
            <span className={`status-dot ${status === 'connected' ? 'ok' : 'idle'}`} />
            <span className="status-text">
              {status === 'connected' && address
                ? `Connected as ${formatAddress(address)}`
                : 'Not connected'}
            </span>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <div className="label">Network</div>
            <select
              value={selectedChain.chainId}
              onChange={(e) => handleChainChange(Number(e.target.value))}
            >
              {CHAINS.map((chain) => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
            <p className="hint">Network switch will prompt your wallet if connected.</p>
          </div>
          <div className="card">
            <div className="label">Wallet Address</div>
            <div className="mono">
              {address ?? 'Connect a wallet to view activity and switch networks.'}
            </div>
            {network && (
              <p className="hint">
                Current wallet network: {network.name} (chainId {walletChainId})
              </p>
            )}
          </div>
        </div>

        {(error || networkMismatch) && (
          <div className="alert">
            <strong>{networkMismatch ? 'Network mismatch: ' : 'Error: '}</strong>
            {networkMismatch
              ? `Wallet is on ${network?.name ?? 'unknown'}, but you selected ${selectedChain.name}. Use the selector above to switch.`
              : error}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Activity</p>
            <h2>Last 10 transfers on {selectedChain.name}</h2>
          </div>
          <div className="pill">{selectedChain.nativeSymbol}</div>
        </div>

        {!address && <div className="placeholder">Connect a wallet to load activity.</div>}
        {address && activity.loading && <div className="placeholder">Loading activity…</div>}
        {address && activity.error && <div className="alert">Error: {activity.error}</div>}
        {address && !activity.loading && !activity.error && (
          <div className="list">
            {activity.rows.length === 0 && (
              <div className="placeholder">No activity found for this chain.</div>
            )}
            {activity.rows.map((item) => (
              <div key={item.txHash} className="list-item">
                <div className="list-main">
                  <div className="badge-row">
                    <span className={`badge ${item.direction}`}>{item.direction}</span>
                    <span className={`badge status ${item.status}`}>{item.status}</span>
                  </div>
                  <div className="mono">{formatAddress(item.txHash)}</div>
                  <div className="muted">
                    {item.direction === 'sent'
                      ? `To ${formatAddress(item.to)}`
                      : `From ${formatAddress(item.from)}`}
                  </div>
                </div>
                <div className="list-meta">
                  <div className="amount">
                    {item.direction === 'sent' ? '-' : '+'}
                    {item.amount} {item.symbol}
                  </div>
                  {item.usdValue !== undefined && (
                    <div className="muted">${item.usdValue.toLocaleString()}</div>
                  )}
                  <div className="muted">{formatDate(item.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel muted-block">
        <h3>Notes & assumptions</h3>
        <ul>
          <li>Alchemy API key is required via VITE_ALCHEMY_API_KEY.</li>
          <li>Transfers use alchemy_getAssetTransfers (external + erc20) per chain.</li>
          <li>Price lookup via CoinGecko; cache prevents redundant calls for 1 minute.</li>
          <li>Chain selection is persisted locally; wallet switching prompts MetaMask.</li>
        </ul>
      </section>
    </div>
  )
}

export default App
