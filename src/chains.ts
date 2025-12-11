export type SupportedChain = {
  chainId: number
  hexChainId: string
  name: string
  nativeSymbol: string
  alchemyNetwork: string
  rpcUrl: string
  blockExplorer: string
  coingeckoId: string
}

export const CHAINS: SupportedChain[] = [
  {
    chainId: 1,
    hexChainId: '0x1',
    name: 'Ethereum',
    nativeSymbol: 'ETH',
    alchemyNetwork: 'eth-mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/${API_KEY}',
    blockExplorer: 'https://etherscan.io',
    coingeckoId: 'ethereum',
  },
  {
    chainId: 137,
    hexChainId: '0x89',
    name: 'Polygon',
    nativeSymbol: 'MATIC',
    alchemyNetwork: 'polygon-mainnet',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/${API_KEY}',
    blockExplorer: 'https://polygonscan.com',
    coingeckoId: 'matic-network',
  },
  {
    chainId: 42161,
    hexChainId: '0xa4b1',
    name: 'Arbitrum',
    nativeSymbol: 'ETH',
    alchemyNetwork: 'arb-mainnet',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/${API_KEY}',
    blockExplorer: 'https://arbiscan.io',
    coingeckoId: 'ethereum',
  },
]

export const DEFAULT_CHAIN_ID = CHAINS[0].chainId

export const getChainById = (chainId: number | undefined): SupportedChain | undefined =>
  CHAINS.find((c) => c.chainId === chainId)

