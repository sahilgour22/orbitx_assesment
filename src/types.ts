import type { SupportedChain } from './chains'

export type ActivityStatus = 'pending' | 'confirmed' | 'failed'
export type ActivityDirection = 'sent' | 'received'

export type ActivityRow = {
  txHash: string
  timestamp: string
  direction: ActivityDirection
  amount: number
  symbol: string
  usdValue?: number
  from: string
  to: string
  status: ActivityStatus
  chain: SupportedChain
}

