import { isConvertedReferral } from './referralStatus'

export const STATS_PERIODS = [
  { key: '6m', label: '6 Months', months: 6 },
  { key: '12m', label: '12 Months', months: 12 },
  { key: 'lifetime', label: 'Lifetime', months: null },
]

const itemMillis = (item) => {
  const ts = item?.createdAt
  if (ts?.toMillis) return ts.toMillis()
  if (typeof ts === 'number') return ts
  if (typeof ts === 'string') {
    const n = Date.parse(ts)
    if (!Number.isNaN(n)) return n
  }
  const date = item?.date || item?.details?.date
  if (date) {
    const n = Date.parse(date)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

const inPeriod = (item, period, now = Date.now()) => {
  if (period === 'lifetime') return true
  const months = period === '6m' ? 6 : 12
  const ms = itemMillis(item)
  if (!ms) return false
  const start = new Date(now)
  start.setMonth(start.getMonth() - months)
  return ms >= start.getTime() && ms <= now
}

const involved = (item, uid) => item.fromUid === uid || item.toUid === uid

const countEvents = (items, uid, type) =>
  items
    .filter(i => i.type === type && involved(i, uid))
    .reduce((sum, i) => sum + (Number(i.priorCount) || 1), 0)

const slipAmount = (item) => Number(item.amount) || Number(item.value) || 0

export const summarizeMemberPeriodStats = (historyItems, uid, period, palms = {}) => {
  const items = (historyItems || []).filter(i => inPeriod(i, period))

  const tyfcbGiven = items
    .filter(i => i.type === 'tyfcb' && i.fromUid === uid)
    .reduce((sum, i) => sum + slipAmount(i), 0)

  const convertedReceived = items
    .filter(i =>
      i.type === 'referrals' &&
      i.toUid === uid &&
      isConvertedReferral(i)
    )
    .reduce((sum, i) => sum + slipAmount(i), 0)

  const tyfcbReceived = items
    .filter(i => i.type === 'tyfcb' && i.toUid === uid && i.toUid !== i.fromUid)
    .reduce((sum, i) => sum + slipAmount(i), 0)

  const ceuDated = items
    .filter(i => i.type === 'ceu' && involved(i, uid))
    .reduce((sum, i) => sum + (Number(i.amount) || Number(i.priorCount) || 1), 0)

  return {
    oneToOne: countEvents(items, uid, 'oneToOne'),
    referralsGiven: items.filter(i => i.type === 'referrals' && i.fromUid === uid).length,
    referralsReceived: items.filter(i => i.type === 'referrals' && i.toUid === uid).length,
    tyfcbGiven,
    revenueReceived: convertedReceived + tyfcbReceived,
    visitors: countEvents(items, uid, 'visitors'),
    ceus: period === 'lifetime' ? Number(palms.ceu || 0) : ceuDated,
  }
}
