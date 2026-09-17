import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../data/firebase'
import { collection, getDocs } from 'firebase/firestore'
import {
  getMemberProjects,
  getMemberReferrals,
  getMemberPalms,
  getAllMeetings,
  incrementSlip,
  getMemberSlips,
  addSlipHistory,
  recordTyfcb,
  sumMemberTyfcbCredit,
  getMemberSlipHistory,
} from '../../data/firebaseData'
import { STATS_PERIODS, summarizeMemberPeriodStats } from '../../utils/memberPeriodStats'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  CalendarDays,
  Loader2,
  Plus,
  Handshake,
  Users,
  BadgeDollarSign,
  CheckCircle2,
  X,
  UserPlus,
  Copy,
} from 'lucide-react'
import {
  TYFCBForm,
  ReferralForm,
  OneToOneForm,
  SearchField,
  ToggleGroup,
  FormActions,
  inputCls,
  labelCls,
} from '../../components/slips/SlipForms'

// ─── Helpers ────────────────────────────────────────────────────────────────

const greet = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const meetingBadge = {
  weekly: 'bg-[#dce1f5] text-[#1B2E6B] dark:bg-[#1e254a] dark:text-[#7b95e4]',
  special: 'bg-[#fff3e0] text-[#e65100] dark:bg-orange-900/30 dark:text-orange-400',
  'one-to-one': 'bg-[#EEF0F7] text-[#5c607a] dark:bg-[#1c2035] dark:text-[#8890b0]',
}

const card =
  'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #CDD0E0',
  boxShadow: '0 4px 12px rgba(27,46,107,0.10)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SLIP_ITEMS = [
  {
    key: 'tyfcb',
    label: 'TYFCBs',
    icon: BadgeDollarSign,
    accentBg: 'bg-[#e8f5e9] dark:bg-green-900/25',
    accentText: 'text-[#2e7d32]',
    bar: 'bg-[#2e7d32]',
    btnBg: 'bg-[#2e7d32] hover:bg-[#256427]',
    isAmount: true,
    step: 1000,
  },
  {
    key: 'referrals',
    label: 'Referrals',
    icon: Handshake,
    accentBg: 'bg-[#fce8e8] dark:bg-[#2d1a1a]',
    accentText: 'text-[#E31E24]',
    bar: 'bg-[#E31E24]',
    btnBg: 'bg-[#E31E24] hover:bg-[#c41920]',
    step: 1,
  },
  {
    key: 'oneToOne',
    label: 'One-to-Ones',
    icon: Users,
    accentBg: 'bg-[#EEF0F7] dark:bg-[#1c2035]',
    accentText: 'text-[#5c607a] dark:text-[#8890b0]',
    bar: 'bg-[#5c607a]',
    btnBg: 'bg-[#5c607a] hover:bg-[#474b61]',
    step: 1,
  },
  {
    key: 'visitors',
    label: 'Visitors',
    icon: UserPlus,
    accentBg: 'bg-[#fff8e1] dark:bg-yellow-900/20',
    accentText: 'text-[#f59e0b]',
    bar: 'bg-[#f59e0b]',
    btnBg: 'bg-[#f59e0b] hover:bg-[#d97706]',
    step: 1,
  },
]

function VisitorsForm({ onConfirm, onCancel, members = [] }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    visitorName: '',
    company: '',
    telephone: '',
    email: '',
    invitedBy: '',
    source: 'Member Invite',
    date: today,
    interestedInMembership: false,
    comments: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Visitor Name</label>
          <input type="text" placeholder="Full name" value={form.visitorName} onChange={e => set('visitorName', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Company</label>
          <input type="text" placeholder="Company name" value={form.company} onChange={e => set('company', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Telephone</label>
          <input type="tel" placeholder="+91 00000 00000" value={form.telephone} onChange={e => set('telephone', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Invited By</label>
        <SearchField
          placeholder="Click to select a member…"
          value={form.invitedBy}
          onChange={v => set('invitedBy', v)}
          options={members}
          onSelectOption={(opt) => set('invitedBy', opt.label || opt)}
        />
      </div>
      <div>
        <label className={labelCls}>Visit Source</label>
        <ToggleGroup options={['Member Invite', 'Walk-in', 'Social Media']} value={form.source} onChange={v => set('source', v)} />
      </div>
      <div>
        <label className={labelCls}>Date of Visit</label>
        <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => set('interestedInMembership', !form.interestedInMembership)}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
            form.interestedInMembership
              ? 'bg-[#f59e0b] border-[#f59e0b]'
              : 'bg-white dark:bg-[#1c2035] border-[#CDD0E0] dark:border-[#313655]'
          }`}
        >
          {form.interestedInMembership && <CheckCircle2 size={11} className="text-white" strokeWidth={3} />}
        </div>
        <span className="text-sm text-[#1a1d2e] dark:text-[#e4e6f0]">Interested in Membership</span>
      </label>
      <div>
        <label className={labelCls}>Comments</label>
        <textarea rows={2} placeholder="Additional notes…" value={form.comments} onChange={e => set('comments', e.target.value)} className={inputCls + ' resize-none'} />
      </div>
      <FormActions onConfirm={() => onConfirm(form)} onCancel={onCancel} disabled={!form.visitorName} />
    </div>
  )
}

// ─── SlipModal ────────────────────────────────────────────────────────────────

const FORM_TITLES = {
  tyfcb: 'Record TYFCB',
  referrals: 'Referral Slip',
  oneToOne: 'One-to-One Slip',
  visitors: 'Visitor Slip',
}

function SlipModal({ slipKey, slip, onConfirm, onClose, members = [] }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const FormComponent = {
    tyfcb: TYFCBForm,
    referrals: ReferralForm,
    oneToOne: OneToOneForm,
    visitors: VisitorsForm,
  }[slipKey]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(10,12,25,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#161929] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEF0F7] dark:border-[#313655] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${slip.accentBg}`}>
              <slip.icon size={15} className={slip.accentText} strokeWidth={2} />
            </div>
            <h2
              className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {FORM_TITLES[slipKey]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] hover:bg-[#EEF0F7] dark:hover:bg-[#252a45] transition"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          {FormComponent && <FormComponent onConfirm={onConfirm} onCancel={onClose} members={members} />}
        </div>
      </div>
    </div>
  )
}

// ─── SlipCard ─────────────────────────────────────────────────────────────────

function PeriodStatsCard({ stats, period, onPeriodChange }) {
  const rows = [
    { label: 'One-to-One', value: stats.oneToOne },
    { label: 'Referrals Given', value: stats.referralsGiven },
    { label: 'Referrals Received', value: stats.referralsReceived },
    { label: 'TYFCB Given', value: stats.tyfcbGiven },
    { label: 'Revenue Received', value: stats.revenueReceived },
    { label: 'Visitors', value: stats.visitors },
    { label: 'CEUs', value: stats.ceus },
  ]

  return (
    <div className={card + ' p-6'}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2
          className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          My PALMS Statistics
        </h2>
        <div className="flex items-center gap-3 flex-shrink-0">
          {STATS_PERIODS.map(p => {
            const active = period === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onPeriodChange(p.key)}
                className={`pb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b-2 transition-colors ${
                  active
                    ? 'text-[#E31E24] border-[#E31E24]'
                    : 'text-[#9ea3ba] border-transparent hover:text-[#5c607a] dark:hover:text-[#c5c9da]'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between py-3 ${
              i < rows.length - 1 ? 'border-b border-[#EEF0F7] dark:border-[#313655]' : ''
            }`}
          >
            <span className="text-sm text-[#5c607a] dark:text-[#8890b0]">{row.label}</span>
            <span
              className="text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] tabular-nums"
              style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}
            >
              {Number(row.value || 0).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlipCard({ slip, value, saving, onOpenModal, onCopyInvite }) {
  const display = slip.isAmount ? `₹${Number(value).toLocaleString('en-IN')}` : value
  const isVisitors = slip.key === 'visitors'

  return (
    <div className="relative bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl p-4 border border-[#EEF0F7] dark:border-[#313655] flex flex-col gap-3 overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${slip.bar}`} />
      <div className="flex items-center justify-between pt-0.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${slip.accentBg}`}>
          <slip.icon size={16} className={slip.accentText} strokeWidth={2} />
        </div>
        <div className="flex items-center gap-2">
          {isVisitors ? (
            <button
              type="button"
              onClick={onCopyInvite}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#f3d38b] dark:border-yellow-800/50 bg-[#fff8e1] dark:bg-yellow-900/20 text-[#f59e0b] hover:bg-[#fef3c7] dark:hover:bg-yellow-900/30 transition-all hover:scale-105 active:scale-95"
              title="Copy visitor invite link"
              aria-label="Copy visitor invite link"
            >
              <Copy size={15} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              onClick={() => !saving && onOpenModal(slip.key)}
              disabled={saving}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${slip.btnBg}`}
              title={`Add ${slip.label}`}
              aria-label={`Add ${slip.label}`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} strokeWidth={2.5} />}
            </button>
          )}
        </div>
      </div>
      <div>
        <div
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-none truncate select-none"
          style={{ fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
        >
          {display}
        </div>
        <div className="text-sm font-medium text-[#5c607a] dark:text-[#8890b0] mt-1.5 leading-snug">
          {slip.label}
        </div>
      </div>
    </div>
  )
}

// ─── MemberDashboard ──────────────────────────────────────────────────────────

export default function MemberDashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [referrals, setReferrals] = useState([])
  const [palms, setPalms] = useState({})
  const [meetings, setMeetings] = useState([])
  const [slips, setSlips] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeModal, setActiveModal] = useState(null)
  const [members, setMembers] = useState([])
  const [slipHistory, setSlipHistory] = useState([])
  const [statsPeriod, setStatsPeriod] = useState('lifetime')

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      try {
        const [proj, refs, pal, meets, sl, userSnap, tyfcbCredit, history] = await Promise.all([
          getMemberProjects(user.uid),
          getMemberReferrals(user.uid),
          getMemberPalms(user.uid),
          getAllMeetings(),
          getMemberSlips(user.uid),
          getDocs(collection(db, 'users')),
          sumMemberTyfcbCredit(user.uid),
          getMemberSlipHistory(user.uid),
        ])
        setProjects(proj)
        setReferrals(refs)
        setPalms({ ...(pal || {}), tyfcb: tyfcbCredit })
        setMeetings(meets)
        setSlips({ ...(sl || {}), tyfcb: tyfcbCredit })
        setSlipHistory(history || [])
        const memberList = userSnap.docs
          .map(d => {
            const data = d.data() || {}
            const label =
              data.displayName || data.name || data.fullName ||
              data.business || data.businessName || data.username || ''
            return { id: d.id, label, ...data }
          })
          .filter(x => {
            if (!x.label) return false
            const status = String(x.status || 'active').toLowerCase()
            const role = String(x.role || '').toLowerCase()
            return status === 'active' && role !== 'admin'
          })
        setMembers(memberList)
      } catch (err) {
        console.error('Dashboard load failed:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  const showToast = useCallback((label) => {
    setToast(label)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const handleIncrement = useCallback(async (key, step) => {
    const prev = slips[key] || 0
    const next = prev + step
    setSavingKey(key)
    setSlips(s => ({ ...s, [key]: next }))
    try {
      await incrementSlip(user.uid, key, step)
      showToast(SLIP_ITEMS.find(s => s.key === key)?.label)
      const [freshPalms, history] = await Promise.all([
        getMemberPalms(user.uid),
        getMemberSlipHistory(user.uid),
      ])
      setPalms(freshPalms || {})
      setSlipHistory(history || [])
    } catch (err) {
      setSlips(s => ({ ...s, [key]: prev }))
      console.error(err)
    } finally {
      setSavingKey(null)
    }
  }, [slips, user?.uid, showToast])

  const handleModalConfirm = useCallback(async (formData) => {
    if (!activeModal) return
    const slip = SLIP_ITEMS.find(s => s.key === activeModal)
    let otherMember = formData._selectedMember
    if (!otherMember && formData.invitedBy) {
      otherMember = members.find(m => m.label === formData.invitedBy) || null
    }

    let step = slip.step
    if (activeModal === 'tyfcb') step = Number(formData.amount) || slip.step

    const fromName = user?.name || user?.displayName || user?.email || ''
    const toName = otherMember?.label || otherMember?.name || formData.thankYouTo || formData.to || formData.with || formData.invitedBy || ''

    if (activeModal === 'tyfcb') {
      setActiveModal(null)
      const prev = slips.tyfcb || 0
      setSlips(s => ({ ...s, tyfcb: prev + step }))
      setSavingKey('tyfcb')
      try {
        await recordTyfcb({
          fromUid: user.uid,
          fromName,
          toUid: otherMember?.id || null,
          toName,
          amount: step,
          details: formData,
        })
        const [tyfcbCredit, freshPalms, history] = await Promise.all([
          sumMemberTyfcbCredit(user.uid),
          getMemberPalms(user.uid),
          getMemberSlipHistory(user.uid),
        ])
        setSlips(s => ({ ...s, tyfcb: tyfcbCredit }))
        showToast('TYFCBs')
        setPalms({ ...(freshPalms || {}), tyfcb: tyfcbCredit })
        setSlipHistory(history || [])
      } catch (err) {
        setSlips(s => ({ ...s, tyfcb: prev }))
        console.error(err)
        setToast('Failed to save thank-you slip')
      } finally {
        setSavingKey(null)
      }
      return
    }

    setActiveModal(null)

    await handleIncrement(activeModal, step)

    if (otherMember?.id) {
      try {
        await incrementSlip(otherMember.id, activeModal, step)
      } catch (err) {
        console.error(`Failed to increment ${otherMember.label}:`, err)
      }
    }

    try {
      await addSlipHistory({
        type: activeModal,
        fromUid: user.uid,
        fromName,
        toUid: otherMember?.id || null,
        toName,
        amount: activeModal === 'tyfcb' ? step : 0,
        details: formData,
      })
      const history = await getMemberSlipHistory(user.uid)
      setSlipHistory(history || [])
    } catch (err) {
      console.error('Failed to save slip history:', err)
      setToast('Slip saved, but history did not update')
    }
  }, [activeModal, handleIncrement, members, user, slips.tyfcb, showToast])

  const upcoming = useMemo(
    () => meetings.filter(m => new Date(m.date) >= new Date()).slice(0, 3),
    [meetings]
  )

  const periodStats = useMemo(
    () => summarizeMemberPeriodStats(slipHistory, user?.uid, statsPeriod, palms),
    [slipHistory, user?.uid, statsPeriod, palms]
  )

  const radarData = useMemo(() => {
    const refs = Number(palms.referrals || 0)
    const vis = Number(palms.visitors || 0)
    const one = Number(palms.oneToOne || 0)
      const tyfcb = Number(slips.tyfcb || palms.tyfcb || 0)
    return [
      { subject: 'Referrals', A: Math.min((refs / 5) * 100, 100) },
      { subject: 'Visitors', A: Math.min((vis / 25) * 100, 100) },
      { subject: '1-to-1s', A: Math.min((one / 6) * 100, 100) },
      { subject: 'TYFCB', A: Math.min((tyfcb / 10000) * 100, 100) },
    ]
  }, [palms, slips.tyfcb])

  // ✅ FIX: Always use window.location.origin — no env variable fallback
  // so the copied link always matches the current site's domain
  const inviteLink = useMemo(() => {
    if (!user?.uid) return ''
    return `${window.location.origin}/visit-meeting?ref=${user.uid}`
  }, [user?.uid])

  const handleCopyInviteLink = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      showToast('Visitor link copied')
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }, [inviteLink, showToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
          <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  const displayName = user?.displayName || user?.name || 'Member'
  const activeSlip = SLIP_ITEMS.find(s => s.key === activeModal)

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      <div
        className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-[#1a1d2e] dark:bg-[#e4e6f0] text-white dark:text-[#1a1d2e] text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl pointer-events-none transition-all duration-300 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <CheckCircle2 size={15} className="text-[#4ade80] dark:text-[#2e7d32] flex-shrink-0" />
        {toast}
      </div>

      {/* Slip Modal */}
      {activeModal && activeSlip && (
        <SlipModal
          slipKey={activeModal}
          slip={activeSlip}
          onConfirm={handleModalConfirm}
          onClose={() => setActiveModal(null)}
          members={members}
        />
      )}

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.10em] text-[#E31E24] mb-1">Member Portal</p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {greet()}, {displayName}
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          {user?.business} · Member since {user?.memberSince}
        </p>
      </div>

      {/* Slip Cards */}
      <div className={card + ' p-5 sm:p-6'}>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            My Activity
          </h2>
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]">
            Overall
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SLIP_ITEMS.map(slip => (
            <SlipCard
              key={slip.key}
              slip={slip}
              value={slips[slip.key] || 0}
              saving={savingKey === slip.key}
              onOpenModal={setActiveModal}
              onCopyInvite={handleCopyInviteLink}
            />
          ))}
        </div>
      </div>

      {/* Period stats + PALMS + Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <PeriodStatsCard
          stats={periodStats}
          period={statsPeriod}
          onPeriodChange={setStatsPeriod}
        />

        {/* Radar */}
        <div className={card + ' p-6'}>
          <div className="flex items-start justify-between mb-5">
            <h2
              className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              My PALMS Activity
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]">
              PALMS
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#EEF0F7" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 12, fill: '#5c607a', fontFamily: 'Inter, sans-serif' }}
              />
              <Radar
                dataKey="A"
                name="Activity"
                stroke="#1B2E6B"
                fill="#1B2E6B"
                fillOpacity={0.18}
                strokeWidth={2}
                dot={{ r: 4, fill: '#1B2E6B', strokeWidth: 0 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={v => [v.toFixed(1), 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Meetings */}
        <div className={card + ' p-6'}>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Upcoming Meetings
            </h2>
            <CalendarDays size={16} className="text-[#9ea3ba]" />
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CalendarDays size={30} className="text-[#CDD0E0] dark:text-[#313655]" />
              <p className="text-sm text-[#9ea3ba]">No upcoming meetings</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map(m => {
                const dateObj = new Date(m.date)
                return (
                  <div
                    key={m.id}
                    className="bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl p-4 flex items-start gap-4 border border-[#EEF0F7] dark:border-[#313655]"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#dce1f5] dark:bg-[#1e254a] flex flex-col items-center justify-center">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-[#1B2E6B] dark:text-[#7b95e4]">
                        {dateObj.toLocaleString('en', { month: 'short' })}
                      </div>
                      <div
                        className="text-lg font-bold leading-none text-[#1B2E6B] dark:text-[#7b95e4]"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {dateObj.getDate()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight">
                        {m.title}
                      </div>
                      <div className="text-xs text-[#9ea3ba] mt-1">
                        {m.time}{m.venue ? ` · ${m.venue}` : ''}
                      </div>
                      <span
                        className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          meetingBadge[m.type] || meetingBadge.weekly
                        }`}
                      >
                        {m.type}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}