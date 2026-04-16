// Format VND currency
export const formatVND = (amount) => {
  if (amount === undefined || amount === null) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount)
}

// Short format (e.g. 1.5tr, 250k)
export const formatVNDShort = (amount) => {
  if (!amount) return '0'
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')}tr`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`
  return `${amount}`
}

// Format date to Vietnamese
export const formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch { return dateStr }
}

export const formatDateShort = (dateStr) => {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    }).format(d)
  } catch { return dateStr }
}

export const formatMonth = (year, month) => {
  const d = new Date(year, month - 1)
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(d)
}

// Get today's date string YYYY-MM-DD
export const getTodayStr = () => new Date().toISOString().split('T')[0]

// Parse amount input (allow commas, dots)
export const parseAmount = (str) => {
  const cleaned = str.replace(/[.,\s]/g, '')
  return isNaN(Number(cleaned)) ? 0 : Number(cleaned)
}

// Group transactions by date
export const groupByDate = (transactions) => {
  const groups = {}
  transactions.forEach((tx) => {
    if (!groups[tx.date]) groups[tx.date] = []
    groups[tx.date].push(tx)
  })
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }))
}

// Get current year and month
export const getCurrentYearMonth = () => {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

// Check if date is today
export const isToday = (dateStr) => getTodayStr() === dateStr

// Check if date is yesterday
export const isYesterday = (dateStr) => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0] === dateStr
}

// Friendly date label
export const friendlyDate = (dateStr) => {
  if (isToday(dateStr)) return 'Hôm nay'
  if (isYesterday(dateStr)) return 'Hôm qua'
  return formatDate(dateStr)
}
