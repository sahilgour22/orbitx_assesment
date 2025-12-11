import { format } from 'date-fns'

export const formatAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

export const formatDate = (value?: string) => {
  if (!value) return ''
  try {
    return format(new Date(value), 'MMM d, yyyy HH:mm')
  } catch {
    return value
  }
}

