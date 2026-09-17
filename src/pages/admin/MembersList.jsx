import { useState, useEffect, useMemo } from 'react'
import { db, auth, functions } from '../../data/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { currency } from '../../data/firebaseData'
import { getReferralStatusMeta } from '../../utils/referralStatus'
import {
  Search, ChevronDown, ChevronUp, X, Loader2,
  AlertCircle, CheckCircle2, Circle, UserPlus
} from 'lucide-react'

/* ─── PALMS traffic light ─────────────────────────────────────────────────── */
const trafficLight = (palms) => {
  if (!palms) return 'gray'
  const score =
    ((palms.referrals || 0) >= 3 ? 1 : 0) +
    ((palms.attendance || 0) >= 22 ? 1 : 0) +
    ((palms.oneToOne || 0) >= 8 ? 1 : 0) +
    ((palms.tyfcb || 0) >= 100000 ? 1 : 0)
  return score >= 3 ? 'green' : score >= 2 ? 'yellow' : 'red'
}

const trafficConfig = {
  green: {
    pill: 'bg-[#e8f5e9] text-[#2e7d32] dark:bg-green-900/30 dark:text-green-400',
    label: 'On track',
    icon: CheckCircle2,
  },
  yellow: {
    pill: 'bg-[#fff3e0] text-[#e65100] dark:bg-orange-900/30 dark:text-orange-400',
    label: 'Needs attention',
    icon: AlertCircle,
  },
  red: {
    pill: 'bg-[#fce8e8] text-[#E31E24] dark:bg-red-900/30 dark:text-red-400',
    label: 'At risk',
    icon: AlertCircle,
  },
  gray: {
    pill: 'bg-[#EEF0F7] text-[#9ea3ba] dark:bg-[#1c2035] dark:text-[#50567a]',
    label: 'No data',
    icon: Circle,
  },
}

const progressColor = (p) =>
  p >= 75 ? 'bg-[#2e7d32]' : p >= 40 ? 'bg-[#1B2E6B]' : 'bg-[#e65100]'

/* ─── Shared tokens ───────────────────────────────────────────────────────── */
const card =
  'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-[#F9FAFC] dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 transition-all placeholder:text-[#9ea3ba]'

const labelCls =
  'block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] mb-1.5'

const emptyInvite = { name: '', email: '', business: '', industry: '' }

/* ─── Sort icon ───────────────────────────────────────────────────────────── */
const SortIcon = ({ sortState, k }) =>
  sortState.key === k
    ? sortState.dir === 'asc'
      ? <ChevronUp size={12} className="text-[#1B2E6B] dark:text-[#7b95e4]" />
      : <ChevronDown size={12} className="text-[#1B2E6B] dark:text-[#7b95e4]" />
    : <ChevronDown size={12} className="opacity-25" />

const TABLE_COLS = [
  { label: 'Member', key: 'name' },
  { label: 'Industry', key: 'industry' },
  { label: 'Status', key: 'status' },
  { label: 'Projects', key: null },
  { label: 'Referrals', key: null },
  { label: 'Portfolio', key: 'portfolioValue' },
  { label: 'Health', key: 'tl' },
  { label: '', key: null },
]

export default function MembersList() {
  const [members, setMembers] = useState([])
  const [palmsMap, setPalmsMap] = useState({})
  const [projectsMap, setProjectsMap] = useState({})
  const [referralsMap, setReferralsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })

  const [showCreate, setShowCreate] = useState(false)
  const [invite, setInvite] = useState(emptyInvite)
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  const [authReady, setAuthReady] = useState(false)
  const [adminUser, setAdminUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAdminUser(user)
      setAuthReady(true)
      console.log('onAuthStateChanged user:', user)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [usersSnap, projectsSnap, referralsSnap, palmsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'referrals')),
          getDocs(collection(db, 'palms')),
        ])

        setMembers(
          usersSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.role === 'member')
        )

        const pm = {}
        palmsSnap.docs.forEach(d => { pm[d.data().uid] = d.data() })
        setPalmsMap(pm)

        const pjm = {}
        projectsSnap.docs.forEach(d => {
          const p = { id: d.id, ...d.data() }
          if (!pjm[p.memberId]) pjm[p.memberId] = []
          pjm[p.memberId].push(p)
        })
        setProjectsMap(pjm)

        const rm = {}
        referralsSnap.docs.forEach(d => {
          const r = { id: d.id, ...d.data() }
          if (r.historyType && r.historyType !== 'referrals') return
          ;[r.from, r.to].forEach(uid => {
            if (!uid) return
            if (!rm[uid]) rm[uid] = []
            if (!rm[uid].find(x => x.id === r.id)) rm[uid].push(r)
          })
        })
        setReferralsMap(rm)
      } catch (err) {
        console.error('Failed to load members list:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openCreate = () => {
    setInvite(emptyInvite)
    setInviteError('')
    setInviteSent(false)
    setShowCreate(true)
  }

  const closeCreate = () => {
    if (inviting) return
    setShowCreate(false)
    setInvite(emptyInvite)
    setInviteError('')
    setInviteSent(false)
  }

  const handleCreate = async () => {
    if (!invite.name.trim()) return setInviteError('Name is required')
    if (!invite.email.includes('@')) return setInviteError('Valid email required')
    if (!authReady) return setInviteError('Checking admin session, please wait...')
    if (!adminUser) return setInviteError('You must be logged in as admin.')

    setInviting(true)
    setInviteError('')

    try {
      console.log('auth.currentUser before callable:', auth.currentUser)
      console.log('adminUser before callable:', adminUser)

      const createMember = httpsCallable(functions, 'createMember')

      const result = await createMember({
        name: invite.name.trim(),
        email: invite.email.trim(),
        business: invite.business.trim(),
        industry: invite.industry.trim(),
      })

      // ✅ FIX 1: Was broken — `const { uid } = result.data...` had a stray ellipsis
      const { uid } = result.data

      setMembers(prev => [
        ...prev,
        {
          uid,
          email: invite.email.trim(),
          name: invite.name.trim(),
          business: invite.business.trim(),
          industry: invite.industry.trim(),
          role: 'member',
          status: 'active',
          memberSince: new Date().getFullYear().toString(),
          attendanceRate: 0,
          ceuPoints: 0,
          avatarInitials: invite.name
            .trim()
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
        },
      ])

      setInviteSent(true)
      setTimeout(() => closeCreate(), 2500)
    } catch (err) {
      console.error('Failed to create member:', err)

      const cleanCode = (err?.code || '').replace('functions/', '')

      const msg =
        cleanCode === 'already-exists'
          ? 'This email is already registered.'
          : cleanCode === 'invalid-argument'
            ? (err.message || 'Please check the entered details.')
            : cleanCode === 'unauthenticated'
              ? 'You must be logged in as admin.'
              : cleanCode === 'permission-denied'
                ? 'You do not have permission to create members.'
                : cleanCode === 'internal'
                  ? 'Server error while creating member. Please check Cloud Function logs.'
                  : (err.message || 'Failed to create account. Please try again.')

      setInviteError(msg)
    } finally {
      setInviting(false)
    }
  }

  const toggleSort = (key) =>
    setSort(s => ({
      key,
      dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc',
    }))

  const enriched = useMemo(
    () =>
      members.map(m => {
        const palms = palmsMap[m.uid] || {}
        const projects = projectsMap[m.uid] || []
        const referrals = referralsMap[m.uid] || []
        const portfolioValue = projects.reduce((a, b) => a + (b.value || 0), 0)
        const tl = trafficLight(palms)
        return { ...m, palms, projects, referrals, portfolioValue, tl }
      }),
    [members, palmsMap, projectsMap, referralsMap]
  )

  const filtered = useMemo(
    () =>
      enriched
        .filter(m => {
          const q = search.toLowerCase()
          const matchSearch =
            m.name?.toLowerCase().includes(q) ||
            m.business?.toLowerCase().includes(q) ||
            m.industry?.toLowerCase().includes(q)
          const matchStatus = filterStatus === 'all' || m.status === filterStatus
          return matchSearch && matchStatus
        })
        .sort((a, b) => {
          let va = a[sort.key]
          let vb = b[sort.key]
          if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase() }
          if (va == null && vb == null) return 0
          if (va == null) return 1
          if (vb == null) return -1
          return sort.dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
        }),
    [enriched, search, filterStatus, sort]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
          <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading members…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ─── Header ─── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.10em] text-[#E31E24] mb-1">
            Admin Panel
          </p>
          <h1
            className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Members
          </h1>
          <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
            Manage and monitor all chapter members
          </p>
          <p className="text-xs text-[#9ea3ba] mt-2">
            Admin session: {authReady ? (adminUser ? adminUser.email : 'Not signed in') : 'Checking...'}
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:shadow-[0_4px_12px_rgba(27,46,107,0.35)] hover:-translate-y-0.5 duration-150 flex-shrink-0"
        >
          <UserPlus size={15} strokeWidth={2.5} />
          New Member
        </button>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: members.length, accentText: 'text-[#1B2E6B] dark:text-[#7b95e4]', bar: 'bg-[#1B2E6B]' },
          { label: 'Active', value: members.filter(m => m.status === 'active').length, accentText: 'text-[#2e7d32]', bar: 'bg-[#2e7d32]' },
          { label: 'On Track', value: enriched.filter(m => m.tl === 'green').length, accentText: 'text-[#2a3f8f] dark:text-[#7b95e4]', bar: 'bg-[#2a3f8f]' },
          { label: 'At Risk', value: enriched.filter(m => m.tl === 'red' || m.tl === 'yellow').length, accentText: 'text-[#E31E24]', bar: 'bg-[#E31E24]' },
        ].map(({ label, value, accentText, bar }) => (
          <div
            key={label}
            className={`${card} relative overflow-hidden flex flex-col items-center gap-1.5 p-4 text-center hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200`}
          >
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${bar}`} />
            <div
              className={`text-[1.6rem] font-bold leading-none tabular-nums mt-1 ${accentText}`}
              style={{ fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
            >
              {value}
            </div>
            <div className="text-xs text-[#9ea3ba] font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* ─── Search & Filter ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ba]" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#161929] border border-[#CDD0E0] dark:border-[#313655] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm rounded-xl transition-all focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 placeholder:text-[#9ea3ba]"
            placeholder="Search name, business, industry…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                filterStatus === s
                  ? 'bg-[#1B2E6B] text-white border-transparent shadow-[0_2px_8px_rgba(27,46,107,0.25)]'
                  : 'border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] bg-white dark:bg-[#161929]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F6FA] dark:bg-[#1c2035] border-b border-[#CDD0E0] dark:border-[#313655]">
                {TABLE_COLS.map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={key ? () => toggleSort(key) : undefined}
                    className={`px-5 py-3.5 text-left text-[11px] font-semibold text-[#5c607a] dark:text-[#8890b0] uppercase tracking-[0.07em] whitespace-nowrap ${
                      key ? 'cursor-pointer select-none hover:text-[#1B2E6B] dark:hover:text-[#7b95e4] transition-colors' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {key && <SortIcon sortState={sort} k={key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EEF0F7] dark:divide-[#1c2035]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Search size={32} className="mx-auto mb-3 text-[#CDD0E0] dark:text-[#313655]" />
                    <p className="text-sm font-semibold text-[#5c607a] dark:text-[#8890b0]">
                      No members match your filters
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(m => {
                  const tc = trafficConfig[m.tl]
                  const TLIcon = tc.icon
                  const initials =
                    m.avatarInitials ||
                    m.name?.split(' ').map(n => n[0]).join('').slice(0, 2)

                  return (
                    <tr
                      key={m.uid}
                      className="hover:bg-[#F9FAFC] dark:hover:bg-[#1c2035] transition-colors duration-100 cursor-pointer"
                      onClick={() => setSelected(m)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1B2E6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight">
                              {m.name}
                            </div>
                            <div className="text-xs text-[#9ea3ba]">{m.business || '—'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#EEF0F7] dark:bg-[#1c2035] text-[#5c607a] dark:text-[#8890b0]">
                          {m.industry || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          m.status === 'active'
                            ? 'bg-[#e8f5e9] text-[#2e7d32] dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-[#fce8e8] text-[#E31E24] dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {m.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold tabular-nums text-[#1a1d2e] dark:text-[#e4e6f0]"
                          style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>
                          {m.projects.length}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold tabular-nums text-[#1a1d2e] dark:text-[#e4e6f0]"
                          style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>
                          {m.referrals.length}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold tabular-nums text-sm text-[#1a1d2e] dark:text-[#e4e6f0]"
                          style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>
                          {currency(m.portfolioValue)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${tc.pill}`}>
                          <TLIcon size={11} strokeWidth={2.5} />
                          {tc.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-[#1B2E6B] dark:text-[#7b95e4] text-xs font-semibold hover:underline whitespace-nowrap">
                          View →
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Create Member Modal ─── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1B2E6B]/40 backdrop-blur-sm" onClick={closeCreate} />

          <div className={`relative w-full max-w-lg ${card} p-6 flex flex-col gap-5 animate-fade-in shadow-2xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#dce1f5] dark:bg-[#1e254a] flex items-center justify-center">
                  <UserPlus size={17} className="text-[#1B2E6B] dark:text-[#7b95e4]" strokeWidth={2} />
                </div>
                <div>
                  <h2
                    className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Create New Member
                  </h2>
                  <p className="text-xs text-[#9ea3ba] mt-0.5">
                    Creates account and sends a password setup email
                  </p>
                </div>
              </div>
              <button
                onClick={closeCreate}
                disabled={inviting}
                className="p-2 rounded-xl hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035] text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] transition-colors disabled:opacity-40"
              >
                <X size={17} />
              </button>
            </div>

            {inviteError && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 border border-[#f5c6c7] dark:border-red-900 text-[#E31E24] dark:text-red-400 text-sm font-medium">
                <X size={14} className="mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                {inviteError}
              </div>
            )}

            {inviteSent && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#e8f5e9] dark:bg-green-900/20 border border-[#c8e6c9] dark:border-green-900 text-[#2e7d32] dark:text-green-400 text-sm font-semibold">
                <CheckCircle2 size={15} /> Member account created and welcome email sent successfully!
              </div>
            )}

            {!inviteSent && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name <span className="text-[#E31E24]">*</span></label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Ravi Shankar"
                    value={invite.name}
                    onChange={e => setInvite(i => ({ ...i, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email Address <span className="text-[#E31E24]">*</span></label>
                  <input
                    className={inputCls}
                    type="email"
                    placeholder="ravi@business.com"
                    value={invite.email}
                    onChange={e => setInvite(i => ({ ...i, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Business Name</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Shankar IT Services"
                    value={invite.business}
                    onChange={e => setInvite(i => ({ ...i, business: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Industry</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Technology"
                    value={invite.industry}
                    onChange={e => setInvite(i => ({ ...i, industry: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {!inviteSent && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={inviting || !authReady || !adminUser}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:-translate-y-0.5 duration-150 disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
                >
                  {inviting
                    ? <><Loader2 size={14} className="animate-spin" /> Creating account…</>
                    : <><UserPlus size={14} strokeWidth={2.5} /> Create Member Account</>
                  }
                </button>
                <button
                  onClick={closeCreate}
                  disabled={inviting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Member Detail Drawer ─── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#1B2E6B]/40 backdrop-blur-sm" onClick={() => setSelected(null)} />

          <div className="relative w-full max-w-lg bg-white dark:bg-[#161929] border-l border-[#CDD0E0] dark:border-[#313655] h-full overflow-y-auto shadow-2xl flex flex-col gap-6 animate-slide-in">
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#161929]/95 backdrop-blur-sm border-b border-[#EEF0F7] dark:border-[#1c2035] px-6 py-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#1B2E6B] text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-[0_4px_12px_rgba(27,46,107,0.25)]">
                  {selected.avatarInitials || selected.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div
                    className="font-bold text-xl text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {selected.name}
                  </div>
                  <div className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-0.5">
                    {selected.business || '—'}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${trafficConfig[selected.tl].pill}`}>
                    {selected.tl === 'green'
                      ? <CheckCircle2 size={11} strokeWidth={2.5} />
                      : <AlertCircle size={11} strokeWidth={2.5} />
                    }
                    {trafficConfig[selected.tl].label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035] text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] transition-colors flex-shrink-0"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-col gap-6 px-6 pb-8">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Industry', val: selected.industry },
                  { label: 'Phone', val: selected.phone },
                  { label: 'Email', val: selected.email },
                  { label: 'Member since', val: selected.memberSince },
                  { label: 'Status', val: selected.status },
                  { label: 'Attendance', val: `${selected.attendanceRate || 0}%` },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl p-3 border border-[#EEF0F7] dark:border-[#313655]">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#9ea3ba] mb-1">{label}</div>
                    <div className="font-semibold text-sm text-[#1a1d2e] dark:text-[#e4e6f0] truncate">{val || '—'}</div>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9ea3ba] mb-3">PALMS Metrics</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Referrals', val: selected.palms.referrals || 0 },
                    { label: '1-to-1', val: selected.palms.oneToOne || 0 },
                    { label: 'CEU', val: selected.palms.ceu || 0 },
                    { label: 'Attended', val: selected.palms.attendance || 0 },
                    { label: 'TYFCB', val: currency(selected.palms.tyfcb || 0) },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl p-3 text-center border border-[#EEF0F7] dark:border-[#313655]">
                      <div
                        className="font-bold text-xl text-[#1B2E6B] dark:text-[#7b95e4] tabular-nums leading-none"
                        style={{ fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
                      >
                        {val}
                      </div>
                      <div className="text-[10px] text-[#9ea3ba] uppercase tracking-wide mt-1.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9ea3ba] mb-3">
                  Projects ({selected.projects.length})
                </p>
                {selected.projects.length === 0 ? (
                  <p className="text-sm text-[#9ea3ba]">No projects yet</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selected.projects.map(p => (
                      <div key={p.id} className="bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl p-3.5 flex items-center justify-between gap-3 border border-[#EEF0F7] dark:border-[#313655]">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[#1a1d2e] dark:text-[#e4e6f0] truncate">{p.title}</div>
                          <div className="mt-2 h-1.5 bg-[#EEF0F7] dark:bg-[#313655] rounded-full overflow-hidden w-32">
                            <div
                              className={`h-full rounded-full transition-all ${progressColor(p.progress || 0)}`}
                              style={{ width: `${p.progress || 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-[#1a1d2e] dark:text-[#e4e6f0] tabular-nums"
                            style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>
                            {currency(p.value)}
                          </div>
                          <div className="text-xs text-[#9ea3ba]">{p.progress || 0}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9ea3ba] mb-3">
                  Referrals ({selected.referrals.length})
                </p>
                {selected.referrals.length === 0 ? (
                  <p className="text-sm text-[#9ea3ba]">No referrals yet</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selected.referrals.map(r => (
                      <div key={r.id} className="bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl p-3.5 flex items-center justify-between gap-3 border border-[#EEF0F7] dark:border-[#313655]">
                        <div>
                          <div className="font-semibold text-sm text-[#1a1d2e] dark:text-[#e4e6f0]">{r.client}</div>
                          <div className="text-xs text-[#9ea3ba] mt-0.5">{r.date}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-[#1a1d2e] dark:text-[#e4e6f0] tabular-nums"
                            style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}>
                            {currency(r.value)}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold mt-1 ${getReferralStatusMeta(r.status).badge}`}>
                            {getReferralStatusMeta(r.status).label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}