import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../data/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { getMembers, currency, updateReferralStatus, recordTyfcb } from '../../data/firebaseData'
import {
  REFERRAL_STATUSES,
  isConvertedReferral,
  getReferralStatusMeta,
  normalizeReferralStatus,
} from '../../utils/referralStatus'
import { Handshake, X, ArrowRight, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'

const isGivenBy = (r, uid) => r.from === uid || r.fromUid === uid
const isReceivedBy = (r, uid) => r.to === uid || r.toUid === uid

const emptyTyfcb = { amount: '', businessType: 'New', referralType: 'Inside', comments: '' }

const inputCls = `w-full px-3.5 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655]
  bg-white dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0]
  placeholder:text-[#9ea3ba] text-sm focus:outline-none
  focus:ring-2 focus:ring-[#1B2E6B]/30 dark:focus:ring-[#7b95e4]/30
  focus:border-[#1B2E6B] dark:focus:border-[#7b95e4] transition`

const labelCls = 'block text-xs font-semibold text-[#5c607a] dark:text-[#8890b0] mb-1.5 uppercase tracking-wide'

function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-[#CDD0E0] dark:border-[#313655]">
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all
            ${i !== 0 ? 'border-l border-[#CDD0E0] dark:border-[#313655]' : ''}
            ${
              value === opt
                ? 'bg-[#1B2E6B] text-white dark:bg-[#7b95e4] dark:text-[#161929]'
                : 'bg-white dark:bg-[#1c2035] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#252a45]'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function MyReferrals() {
  const { user } = useAuth()

  const [referrals,   setReferrals]   = useState([])
  const [membersMap,  setMembersMap]  = useState({})
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [filter,      setFilter]      = useState('all')
  const [error,       setError]       = useState('')
  const [tyfcbTarget, setTyfcbTarget] = useState(null)
  const [tyfcbForm,   setTyfcbForm]   = useState(emptyTyfcb)
  const [tyfcbSaving, setTyfcbSaving] = useState(false)
  const [tyfcbError,  setTyfcbError]  = useState('')

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      try {
        const [fromSnap, toSnap, memberList] = await Promise.all([
          getDocs(query(collection(db, 'referrals'), where('from', '==', user.uid))),
          getDocs(query(collection(db, 'referrals'), where('to',   '==', user.uid))),
          getMembers(),
        ])
        const map = {}
        ;[...fromSnap.docs, ...toSnap.docs].forEach(d => {
          const row = { id: d.id, ...d.data() }
          if (!row.historyType || row.historyType === 'referrals') map[d.id] = row
        })
        setReferrals(Object.values(map))
        const mMap = {}
        memberList.forEach(m => { mMap[m.uid] = m })
        setMembersMap(mMap)
      } catch (err) {
        console.error('Failed to load referrals:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  const filtered = useMemo(() => {
    if (filter === 'all') return referrals
    if (filter === 'given') return referrals.filter(r => isGivenBy(r, user?.uid))
    if (filter === 'received') return referrals.filter(r => isReceivedBy(r, user?.uid))
    if (filter === 'converted') return referrals.filter(r => isConvertedReferral(r) && isReceivedBy(r, user?.uid))
    return referrals
  }, [referrals, filter, user?.uid])

  const converted     = useMemo(
    () => referrals.filter(r => isConvertedReferral(r) && isReceivedBy(r, user?.uid)),
    [referrals, user]
  )
  const givenCount    = useMemo(() => referrals.filter(r => isGivenBy(r, user?.uid)).length, [referrals, user])
  const receivedCount = useMemo(() => referrals.filter(r => isReceivedBy(r, user?.uid)).length, [referrals, user])
  const tyfcbTotal    = useMemo(() => converted.reduce((a, b) => a + (b.value || 0), 0), [converted])

  const openThankYou = (referral) => {
    setTyfcbError('')
    setTyfcbForm(emptyTyfcb)
    setTyfcbTarget(referral)
  }

  const handleStatusChange = async (referral, nextStatus) => {
    const current = normalizeReferralStatus(referral.status)
    if (nextStatus === current) {
      if (nextStatus === 'got_business' && !referral.tyfcbId) openThankYou(referral)
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateReferralStatus(referral.id, nextStatus)
      const next = { ...referral, status: nextStatus }
      setReferrals(prev => prev.map(r => r.id === referral.id ? next : r))
      if (nextStatus === 'got_business' && !referral.tyfcbId) openThankYou(next)
    } catch (err) {
      console.error(err)
      setError('Could not update referral status.')
    } finally {
      setSaving(false)
    }
  }

  const handleTyfcbConfirm = async () => {
    if (!tyfcbTarget) return
    const amount = Number(tyfcbForm.amount)
    if (!tyfcbForm.amount || isNaN(amount) || amount <= 0) {
      setTyfcbError('Enter the amount this referral made')
      return
    }
    setTyfcbSaving(true)
    setTyfcbError('')
    try {
      const giverId = tyfcbTarget.from
      const giverName = membersMap[giverId]?.name || tyfcbTarget.fromName || 'Member'
      const tyfcbId = await recordTyfcb({
        fromUid: user.uid,
        fromName: user?.name || user?.displayName || '',
        toUid: giverId,
        toName: giverName,
        amount,
        details: {
          thankYouTo: giverName,
          amount,
          businessType: tyfcbForm.businessType,
          referralType: tyfcbForm.referralType,
          comments: tyfcbForm.comments,
        },
        referralId: tyfcbTarget.id,
      })
      setReferrals(prev => prev.map(r => r.id === tyfcbTarget.id
        ? { ...r, status: 'got_business', value: amount, amount, tyfcbId }
        : r
      ))
      setTyfcbTarget(null)
      setTyfcbForm(emptyTyfcb)
    } catch (err) {
      console.error(err)
      setTyfcbError('Failed to save thank-you slip. Please try again.')
    } finally {
      setTyfcbSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading your referrals…</p>
      </div>
    </div>
  )

  const stats = [
    { label: 'Given',       value: givenCount,          icon: ArrowRight, accentBg: 'bg-[#dce1f5] dark:bg-[#1e254a]',      accentText: 'text-[#1B2E6B] dark:text-[#7b95e4]', bar: 'bg-[#1B2E6B]' },
    { label: 'Received',    value: receivedCount,        icon: ArrowLeft,  accentBg: 'bg-[#fff3e0] dark:bg-orange-900/20',  accentText: 'text-[#e65100]',                      bar: 'bg-[#e65100]' },
    { label: 'Converted',   value: converted.length,     icon: RefreshCw,  accentBg: 'bg-[#e8f5e9] dark:bg-green-900/20',  accentText: 'text-[#2e7d32]',                      bar: 'bg-[#2e7d32]' },
    { label: 'TYFCB Value', value: currency(tyfcbTotal), icon: Handshake,  accentBg: 'bg-[#dce1f5] dark:bg-[#1e254a]',     accentText: 'text-[#1B2E6B] dark:text-[#7b95e4]', bar: 'bg-[#E31E24]' },
  ]

  const thankYouName = tyfcbTarget
    ? (membersMap[tyfcbTarget.from]?.name || tyfcbTarget.fromName || 'the giver')
    : ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Member Portal</p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
        >
          My Referrals
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          Referrals you give and receive. The receiver updates status; Got The Business logs the thank-you amount.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, accentBg, accentText, bar }) => (
          <div
            key={label}
            className="card relative overflow-hidden p-4 text-center hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${bar}`} />
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mt-1 mb-2.5 ${accentBg}`}>
              <Icon size={16} className={accentText} strokeWidth={2} />
            </div>
            <div
              className={`text-[1.75rem] font-bold leading-none tabular-nums ${accentText}`}
              style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
            >
              {value}
            </div>
            <div className="text-xs text-[#9ea3ba] mt-1.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'given', 'received', 'converted'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
              filter === f
                ? 'bg-[#1B2E6B] text-white border-transparent shadow-[0_2px_8px_rgba(27,46,107,0.25)]'
                : 'border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] bg-white dark:bg-[#161929]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 text-[#E31E24] dark:text-red-400 text-sm font-medium border border-[#f5c6c7] dark:border-red-900">
          <X size={13} strokeWidth={2.5} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Handshake size={40} className="mx-auto text-[#CDD0E0] dark:text-[#313655] mb-4" />
          <p className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
            No {filter !== 'all' ? filter : ''} referrals yet
          </p>
          <p className="text-xs text-[#9ea3ba] mt-1">
            Log a referral from the dashboard My Activity card
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(r => {
            const cfg      = getReferralStatusMeta(r.status)
            const isFromMe = isGivenBy(r, user?.uid)
            const isToMe   = isReceivedBy(r, user?.uid)
            const fromName = membersMap[r.from]?.name || r.fromName || 'Unknown'
            const toName   = membersMap[r.to]?.name || r.toName || 'Unknown'
            const client   = r.client || r.details?.referral || 'Referral'
            const notes    = r.notes || r.details?.comments
            const canAddTyfcb = isToMe && isConvertedReferral(r) && !r.tyfcbId

            return (
              <div
                key={r.id}
                className="card p-5 hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isFromMe
                        ? 'bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]'
                        : 'bg-[#fff3e0] dark:bg-orange-900/20 text-[#e65100]'
                    }`}>
                      {isFromMe
                        ? <ArrowRight size={17} strokeWidth={2.5} />
                        : <ArrowLeft  size={17} strokeWidth={2.5} />
                      }
                    </div>

                    <div>
                      <div
                        className="font-bold text-[15px] text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                        style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
                      >
                        {client}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-[#9ea3ba] mt-1">
                        <span className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
                          {fromName.split(' ')[0]}
                        </span>
                        <ArrowRight size={11} className="text-[#CDD0E0]" />
                        <span className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
                          {toName.split(' ')[0]}
                        </span>
                        {isFromMe && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4] text-[11px] font-semibold">
                            You referred
                          </span>
                        )}
                        {isToMe && !isFromMe && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#fff3e0] dark:bg-orange-900/20 text-[#e65100] text-[11px] font-semibold">
                            You received
                          </span>
                        )}
                      </div>
                      {notes && (
                        <div className="text-xs text-[#9ea3ba] mt-1.5 italic">"{notes}"</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div
                      className="font-bold text-lg text-[#1a1d2e] dark:text-[#e4e6f0] tabular-nums"
                      style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
                    >
                      {currency(r.value)}
                    </div>
                    {isToMe ? (
                      <select
                        value={normalizeReferralStatus(r.status)}
                        disabled={saving}
                        onChange={(e) => handleStatusChange(r, e.target.value)}
                        className="mt-1 max-w-[220px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[#CDD0E0] dark:border-[#313655] bg-white dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0] focus:outline-none focus:ring-2 focus:ring-[#1B2E6B]/30 disabled:opacity-50"
                      >
                        {REFERRAL_STATUSES.map(opt => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    )}
                    <div className="text-xs text-[#9ea3ba]">{r.date}</div>
                    {canAddTyfcb && (
                      <button
                        type="button"
                        onClick={() => openThankYou(r)}
                        className="mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1B2E6B] hover:bg-[#152458] text-white"
                      >
                        Add thank-you slip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tyfcbTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(10,12,25,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !tyfcbSaving && setTyfcbTarget(null)}
        >
          <div className="bg-white dark:bg-[#161929] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEF0F7] dark:border-[#313655]">
              <div>
                <h2 className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0]">Record TYFCB</h2>
                <p className="text-xs text-[#9ea3ba] mt-0.5">How much business did this referral make?</p>
              </div>
              <button
                type="button"
                disabled={tyfcbSaving}
                onClick={() => setTyfcbTarget(null)}
                className="p-1.5 rounded-lg hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035] text-[#9ea3ba]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              {tyfcbError && (
                <div className="px-4 py-3 rounded-xl bg-[#fce8e8] text-[#E31E24] text-sm font-medium">
                  {tyfcbError}
                </div>
              )}
              <div>
                <label className={labelCls}>Thank you to</label>
                <input className={inputCls} value={thankYouName} readOnly />
              </div>
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ba] font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={tyfcbForm.amount}
                    onChange={e => setTyfcbForm(f => ({ ...f, amount: e.target.value }))}
                    className={inputCls + ' pl-8'}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Business Type</label>
                <ToggleGroup
                  options={['New', 'Repeat']}
                  value={tyfcbForm.businessType}
                  onChange={v => setTyfcbForm(f => ({ ...f, businessType: v }))}
                />
              </div>
              <div>
                <label className={labelCls}>Referral Type</label>
                <ToggleGroup
                  options={['Inside', 'Outside', 'Tier3+']}
                  value={tyfcbForm.referralType}
                  onChange={v => setTyfcbForm(f => ({ ...f, referralType: v }))}
                />
              </div>
              <div>
                <label className={labelCls}>Comments</label>
                <textarea
                  rows={3}
                  placeholder="Add a note…"
                  value={tyfcbForm.comments}
                  onChange={e => setTyfcbForm(f => ({ ...f, comments: e.target.value }))}
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={tyfcbSaving}
                  onClick={() => setTyfcbTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] text-sm font-semibold text-[#5c607a]"
                >
                  Later
                </button>
                <button
                  type="button"
                  disabled={tyfcbSaving}
                  onClick={handleTyfcbConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#152458] text-sm font-semibold text-white disabled:opacity-40"
                >
                  {tyfcbSaving ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
