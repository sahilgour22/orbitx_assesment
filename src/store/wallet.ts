import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BrowserProvider, JsonRpcSigner, Network, ethers } from 'ethers'
import { CHAINS, DEFAULT_CHAIN_ID, getChainById } from '../chains'
import type { SupportedChain } from '../chains'

type WalletStatus = 'idle' | 'connecting' | 'connected'

type WalletState = {
  address?: string
  network?: Network
  provider?: BrowserProvider
  signer?: JsonRpcSigner
  status: WalletStatus
  error?: string
  selectedChainId: number
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>
  setSelectedChainId: (chainId: number) => void
}

type EthereumWindow = typeof window & {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  }
}

const buildProvider = () => {
  const ethWindow = window as EthereumWindow
  if (!ethWindow.ethereum) {
    throw new Error('No injected wallet found. Please install MetaMask.')
  }
  return new ethers.BrowserProvider(ethWindow.ethereum)
}

const maybeAddChain = async (provider: BrowserProvider, chain: SupportedChain) => {
  try {
    await provider.send('wallet_switchEthereumChain', [{ chainId: chain.hexChainId }])
  } catch (error: unknown) {
    // MetaMask error code 4902 = chain not added
    const needsAdd = (error as { code?: number })?.code === 4902
    if (!needsAdd) throw error
    await provider.send('wallet_addEthereumChain', [
      {
        chainId: chain.hexChainId,
        chainName: chain.name,
        nativeCurrency: { name: chain.nativeSymbol, symbol: chain.nativeSymbol, decimals: 18 },
        rpcUrls: [chain.rpcUrl.replace('${API_KEY}', '<your-key>')],
        blockExplorerUrls: [chain.blockExplorer],
      },
    ])
    await provider.send('wallet_switchEthereumChain', [{ chainId: chain.hexChainId }])
  }
}

export const useWalletStore = create<
  WalletState,
  [['zustand/persist', Pick<WalletState, 'selectedChainId'>]]
>(
  persist(
    (set, get) => ({
      address: undefined,
      network: undefined,
      provider: undefined,
      signer: undefined,
      status: 'idle',
      error: undefined,
      selectedChainId: DEFAULT_CHAIN_ID,
      setSelectedChainId: (chainId) => set({ selectedChainId: chainId }),
      connect: async () => {
        set({ status: 'connecting', error: undefined })
        try {
          const provider = buildProvider()
          await provider.send('eth_requestAccounts', [])
          const signer = await provider.getSigner()
          const [address, network] = await Promise.all([signer.getAddress(), provider.getNetwork()])
          set({ provider, signer, address, network, status: 'connected', error: undefined })
        } catch (error: unknown) {
          set({ status: 'idle', error: (error as Error).message })
          throw error
        }
      },
      disconnect: () => set({ address: undefined, signer: undefined, provider: undefined, network: undefined, status: 'idle' }),
      switchChain: async (chainId: number) => {
        const chain = getChainById(chainId)
        const provider = get().provider ?? buildProvider()
        if (!chain) {
          throw new Error('Unsupported chain')
        }
        try {
          await maybeAddChain(provider, chain)
          const signer = await provider.getSigner()
          const [address, network] = await Promise.all([signer.getAddress(), provider.getNetwork()])
          set({ provider, signer, address, network, selectedChainId: chainId, status: 'connected', error: undefined })
        } catch (error: unknown) {
          set({ error: (error as Error).message })
          throw error
        }
      },
    }),
    {
      name: 'wallet-preferences',
      partialize: (state) => ({ selectedChainId: state.selectedChainId }),
      version: 1,
    },
  ),
)

export const getSelectedChain = (): SupportedChain =>
  getChainById(useWalletStore.getState().selectedChainId) ?? CHAINS[0]

