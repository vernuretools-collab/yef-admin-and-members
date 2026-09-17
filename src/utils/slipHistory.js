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

const pushDetail = (rows, label, value) => {
  if (value === undefined || value === null || value === '') return
  if (typeof value === 'boolean') {
    rows.push({ label, value: value ? 'Yes' : 'No' })
    return
  }
  rows.push({ label, value: String(value) })
}

export const slipDetailRows = (item) => {
  const d = item?.details || {}
  const rows = []
  if (item?.type === 'tyfcb') {
    pushDetail(rows, 'Amount', currency(item.amount || d.amount || 0))
    pushDetail(rows, 'Thank you to', d.thankYouTo || item.toName)
    pushDetail(rows, 'Business type', d.businessType)
    pushDetail(rows, 'Referral type', d.referralType)
    pushDetail(rows, 'Comments', d.comments)
  } else if (item?.type === 'referrals') {
    pushDetail(rows, 'Referral name', d.referral || d.client || item.client)
    pushDetail(rows, 'To', d.to || item.toName)
    pushDetail(rows, 'From', item.fromName)
    pushDetail(rows, 'Referral type', d.referralType)
    pushDetail(rows, 'Telephone', d.telephone)
    pushDetail(rows, 'Email', d.email)
    pushDetail(rows, 'Address', d.address)
    pushDetail(rows, 'Told them you would call', d.toldThem)
    pushDetail(rows, 'Given your card', d.givenCard)
    if (d.heat !== undefined && d.heat !== null && d.heat !== '') {
      pushDetail(rows, 'Strength', `${Number(d.heat) + 1} / 5`)
    }
    pushDetail(rows, 'Comments', d.comments || item.notes)
  } else if (item?.type === 'oneToOne') {
    pushDetail(rows, 'With', d.with || item.toName)
    pushDetail(rows, 'Initiated by', d.initiatedBy)
    pushDetail(rows, 'Where', d.where)
    pushDetail(rows, 'Date', d.date || item.date)
    pushDetail(rows, 'Topics', d.topics)
  } else if (item?.type === 'visitors') {
    pushDetail(rows, 'Visitor name', d.visitorName || d.name)
    pushDetail(rows, 'Company', d.company)
    pushDetail(rows, 'Telephone', d.telephone)
    pushDetail(rows, 'Email', d.email)
    pushDetail(rows, 'Invited by', d.invitedBy || item.toName)
    pushDetail(rows, 'Visit source', d.source)
    pushDetail(rows, 'Date of visit', d.date || item.date)
    pushDetail(rows, 'Interested in membership', d.interestedInMembership)
    pushDetail(rows, 'Comments', d.comments)
  }
  pushDetail(rows, 'Logged on', formatSlipDate(item))
  return rows
}
