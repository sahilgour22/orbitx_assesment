import type { SupportedChain } from '../chains'
import type { ActivityRow, ActivityStatus } from '../types'

const MAX_ITEMS = 10
const ONE_MINUTE = 60 * 1000

type Transfer = {
  from: string
  to: string
  value?: string | number
  hash: string
  asset?: string
  category?: string
  rawContract?: { decimals?: number; address?: string }
  metadata?: { blockTimestamp?: string }
}

type CachedValue = {
  timestamp: number
  data: ActivityRow[]
}

const activityCache = new Map<string, CachedValue>()

const coingeckoIds: Record<number, string> = {
  1: 'ethereum',
  137: 'matic-network',
  42161: 'ethereum',
}

const parseUsdPrice = async (chain: SupportedChain) => {
  const id = coingeckoIds[chain.chainId]
  if (!id) return undefined
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
  )
  if (!res.ok) return undefined
  const json = (await res.json()) as Record<string, { usd: number }>
  return json[id]?.usd
}

const alchemyRequest = async (url: string, payload: unknown) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RPC error ${res.status}: ${text}`)
  }
  const json = await res.json()
  if (json.error) {
    throw new Error(json.error.message ?? 'RPC error')
  }
  return json.result as { transfers?: Transfer[] }
}

const normalizeTransfer = (
  transfer: Transfer,
  address: string,
  chain: SupportedChain,
  usdPrice?: number,
): ActivityRow => {
  const decimals = transfer.rawContract?.decimals ?? 18
  const raw = typeof transfer.value === 'string' ? transfer.value : transfer.value ?? '0'
  const amount =
    typeof raw === 'string'
      ? Number(raw) / 10 ** decimals
      : Number(raw) / 10 ** decimals

  const direction = transfer.from?.toLowerCase() === address.toLowerCase() ? 'sent' : 'received'
  const status: ActivityStatus =
    transfer.category === 'internal' || transfer.category === 'external' ? 'confirmed' : 'confirmed'

  const usdValue = usdPrice ? Number((amount * usdPrice).toFixed(2)) : undefined
  return {
    txHash: transfer.hash,
    timestamp: transfer.metadata?.blockTimestamp ?? '',
    direction,
    amount: Number(amount.toFixed(6)),
    symbol: transfer.asset ?? chain.nativeSymbol,
    usdValue,
    from: transfer.from,
    to: transfer.to,
    status,
    chain,
  }
}

export const fetchActivityForChain = async (
  address: string,
  chain: SupportedChain,
): Promise<ActivityRow[]> => {
  const key = `${address}-${chain.chainId}`
  const cached = activityCache.get(key)
  if (cached && Date.now() - cached.timestamp < ONE_MINUTE) {
    return cached.data
  }

  const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_ALCHEMY_API_KEY in .env')
  }
  const baseUrl = `https://${chain.alchemyNetwork}.g.alchemy.com/v2/${apiKey}`

  const payload = (filter: Record<string, unknown>) => ({
    id: 1,
    jsonrpc: '2.0',
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        fromBlock: '0x0',
        toBlock: 'latest',
        category: ['external', 'erc20'],
        withMetadata: true,
        maxCount: `0x${MAX_ITEMS.toString(16)}`,
        order: 'desc',
        excludeZeroValue: true,
        ...filter,
      },
    ],
  })

  const [sent, received, usdPrice] = await Promise.all([
    alchemyRequest(baseUrl, payload({ fromAddress: address })),
    alchemyRequest(baseUrl, payload({ toAddress: address })),
    parseUsdPrice(chain),
  ])

  const combined = [...(sent.transfers ?? []), ...(received.transfers ?? [])]
  const deduped = new Map<string, Transfer>()
  combined.forEach((tx) => {
    deduped.set(tx.hash, tx)
  })

  const items = Array.from(deduped.values())
    .map((tx) => normalizeTransfer(tx, address, chain, usdPrice))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, MAX_ITEMS)

  activityCache.set(key, { data: items, timestamp: Date.now() })
  return items
}

