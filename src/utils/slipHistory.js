import { currency } from '../data/firebaseData'

export const SLIP_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'tyfcb', label: 'TYFCB' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'oneToOne', label: 'One-to-Ones' },
  { key: 'visitors', label: 'Visitors' },
]

export const typeConfig = {
  tyfcb: {
    label: 'TYFCB',
    badge: 'bg-[#e8f5e9] text-[#2e7d32] dark:bg-green-900/30 dark:text-green-400',
  },
  referrals: {
    label: 'Referral',
    badge: 'bg-[#fce8e8] text-[#E31E24] dark:bg-[#2d1a1a] dark:text-red-400',
  },
  oneToOne: {
    label: 'One-to-One',
    badge: 'bg-[#EEF0F7] text-[#5c607a] dark:bg-[#1c2035] dark:text-[#8890b0]',
  },
  visitors: {
    label: 'Visitor',
    badge: 'bg-[#fff8e1] text-[#d97706] dark:bg-yellow-900/20 dark:text-yellow-400',
  },
}

export const formatSlipDate = (item) => {
  const ts = item?.createdAt
  const date = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null
  if (date && !Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  if (item?.details?.date) return item.details.date
  if (item?.date) return item.date
  if (item?.prior) return 'Before detailed tracking'
  return '—'
}

export const slipSummary = (item) => {
  const d = item.details || {}
  if (item.type === 'tyfcb') {
    const parts = [currency(item.amount || d.amount || 0)]
    if (d.businessType) parts.push(d.businessType)
    if (d.referralType) parts.push(d.referralType)
    return parts.join(' · ')
  }
  if (item.type === 'referrals') {
    return d.referral || d.client || 'Referral slip'
  }
  if (item.type === 'oneToOne') {
    if (item.prior && item.priorCount) return `${item.priorCount} one-to-ones (no names saved)`
    const parts = [d.date, d.where].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'One-to-one meeting'
  }
  if (item.type === 'visitors') {
    if (item.prior && item.priorCount) return `${item.priorCount} visitors (no names saved)`
    const name = d.visitorName || d.name
    const company = d.company
    return [name, company].filter(Boolean).join(' · ') || 'Visitor'
  }
  return ''
}

export const otherPartyName = (item, uid) => {
  if (item.prior) return 'Name not recorded'
  if (uid && item.fromUid === uid) return item.toName || '—'
  if (uid && item.toUid === uid) return item.fromName || 'Unknown'
  if (item.fromName && item.toName) return `${item.fromName} → ${item.toName}`
  return item.toName || item.fromName || '—'
}
