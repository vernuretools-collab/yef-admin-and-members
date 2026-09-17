export const REFERRAL_STATUSES = [
  {
    key: 'not_contacted',
    label: 'Not Contacted Yet',
    badge: 'bg-[#dce1f5] text-[#1B2E6B] dark:bg-[#1e254a] dark:text-[#7b95e4]',
  },
  {
    key: 'contacted',
    label: 'Contacted',
    badge: 'bg-[#e3f2fd] text-[#1565c0] dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    key: 'no_response',
    label: 'No Response',
    badge: 'bg-[#fff3e0] text-[#e65100] dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    key: 'got_business',
    label: 'Got The Business',
    badge: 'bg-[#e8f5e9] text-[#2e7d32] dark:bg-green-900/30 dark:text-green-400',
  },
  {
    key: 'did_not_get_business',
    label: 'Did Not Get The Business',
    badge: 'bg-[#fce8e8] text-[#E31E24] dark:bg-[#2d1a1a] dark:text-red-400',
  },
  {
    key: 'not_good_fit',
    label: 'Not a Good Fit',
    badge: 'bg-[#EEF0F7] text-[#5c607a] dark:bg-[#1c2035] dark:text-[#8890b0]',
  },
  {
    key: 'confidential',
    label: 'Confidential',
    badge: 'bg-[#f3e8fd] text-[#7b1fa2] dark:bg-purple-900/30 dark:text-purple-300',
  },
]

export const normalizeReferralStatus = (status) => {
  if (status === 'converted') return 'got_business'
  if (status === 'pending' || status === 'given' || status === 'received' || !status) {
    return 'not_contacted'
  }
  if (REFERRAL_STATUSES.some(s => s.key === status)) return status
  return 'not_contacted'
}

export const isConvertedReferral = (referralOrStatus) => {
  const status = typeof referralOrStatus === 'string'
    ? referralOrStatus
    : referralOrStatus?.status
  return status === 'converted' || status === 'got_business'
}

export const getReferralStatusMeta = (status) => {
  const key = normalizeReferralStatus(status)
  return REFERRAL_STATUSES.find(s => s.key === key) || REFERRAL_STATUSES[0]
}
