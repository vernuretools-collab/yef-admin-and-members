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

/** IST has no DST; 06:00 Asia/Kolkata = 00:30 UTC. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const WEDNESDAY = 3
const PALMS_RESET_HOUR = 6

export const getPalmsWeekStart = (now = Date.now()) => {
  const instant = typeof now === 'number' ? now : new Date(now).getTime()
  const ist = new Date(instant + IST_OFFSET_MS)
  let daysBack = (ist.getUTCDay() - WEDNESDAY + 7) % 7
  if (daysBack === 0 && ist.getUTCHours() < PALMS_RESET_HOUR) daysBack = 7
  const startAsUtc = Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate() - daysBack,
    PALMS_RESET_HOUR,
    0,
    0,
    0,
  )
  return startAsUtc - IST_OFFSET_MS
}

export const inPalmsWeek = (item, now = Date.now()) => {
  if (item?.prior) return false
  const ms = itemMillis(item)
  if (!ms) return false
  return ms >= getPalmsWeekStart(now) && ms <= (typeof now === 'number' ? now : new Date(now).getTime())
}

const itemTyfcbId = (item) => item?.tyfcbId || item?.details?.tyfcbId || null

export const summarizeWeeklyActivity = (historyItems, uid, now = Date.now()) => {
  const items = (historyItems || []).filter(i => inPalmsWeek(i, now))
  const linkedTyfcbIds = new Set((historyItems || []).map(itemTyfcbId).filter(Boolean))

  const receivedConverted = items
    .filter(i =>
      i.type === 'referrals' &&
      i.toUid === uid &&
      isConvertedReferral(i)
    )
    .reduce((sum, i) => sum + slipAmount(i), 0)

  const standaloneTyfcb = items
    .filter(i =>
      i.type === 'tyfcb' &&
      i.fromUid === uid &&
      !linkedTyfcbIds.has(i.id)
    )
    .reduce((sum, i) => sum + slipAmount(i), 0)

  return {
    tyfcb: receivedConverted + standaloneTyfcb,
    referrals: countEvents(items, uid, 'referrals'),
    oneToOne: countEvents(items, uid, 'oneToOne'),
    visitors: countEvents(items, uid, 'visitors'),
  }
}

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
