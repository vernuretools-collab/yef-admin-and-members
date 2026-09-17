import { useState, useEffect, useMemo } from 'react'
import { getAllReferrals, getMembers, currency } from '../../data/firebaseData'
import { Handshake, ArrowRight, Search, Loader2, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react'
import { getReferralStatusMeta, isConvertedReferral } from '../../utils/referralStatus'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer
} from 'recharts'

/* ─── Status config — YEF tokens ────────────────────────────────────── */
const STATUS_FILTERS = ['all', 'open', 'converted']

const rowBadge = (r) => getReferralStatusMeta(r.status)

/* ─── Shared tokens ──────────────────────────────────────────────────────── */
const card      = 'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'
const inputCls  = 'bg-white dark:bg-[#161929] border border-[#CDD0E0] dark:border-[#313655] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm rounded-xl transition-all focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 placeholder:text-[#9ea3ba]'

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #CDD0E0',
  boxShadow: '0 4px 12px rgba(27,46,107,0.10)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
}

export default function AdminReferrals() {
  const [referrals,    setReferrals]    = useState([])
  const [membersMap,   setMembersMap]   = useState({})
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const [referralList, memberList] = await Promise.all([
          getAllReferrals(),
          getMembers(),
        ])
        setReferrals(referralList)
        const map = {}
        memberList.forEach(m => { map[m.uid] = m })
        setMembersMap(map)
      } catch (err) {
        console.error('Failed to fetch referrals:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* ── Derived stats ── */
  const converted  = useMemo(() => referrals.filter(r => isConvertedReferral(r)), [referrals])
  const totalTYFCB = useMemo(() => converted.reduce((a, b) => a + (b.value || 0), 0), [converted])
  const convRate   = referrals.length
    ? Math.round((converted.length / referrals.length) * 100)
    : 0

  const topReferrers = useMemo(() => {
    const map = {}
    referrals.forEach(r => { map[r.from] = (map[r.from] || 0) + 1 })
    return Object.entries(map)
      .map(([uid, count]) => ({
        name: membersMap[uid]?.name?.split(' ')[0] || 'Unknown',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [referrals, membersMap])

  const filtered = useMemo(() => referrals.filter(r => {
    const from = membersMap[r.from]
    const to   = membersMap[r.to]
    const matchSearch =
      r.client?.toLowerCase().includes(search.toLowerCase()) ||
      from?.name?.toLowerCase().includes(search.toLowerCase()) ||
      to?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'converted' && isConvertedReferral(r)) ||
      (filterStatus === 'open' && !isConvertedReferral(r))
    return matchSearch && matchStatus
  }), [referrals, membersMap, search, filterStatus])

  /* ── Stat cards ── */
  const statCards = [
    {
      label: 'Total Referrals',
      value: referrals.length,
      icon: Handshake,
      accentBg:   'bg-[#dce1f5] dark:bg-[#1e254a]',
      accentText: 'text-[#1B2E6B] dark:text-[#7b95e4]',
      bar: 'bg-[#1B2E6B]',
    },
    {
      label: 'Converted',
      value: converted.length,
      icon: CheckCircle2,
      accentBg:   'bg-[#e8f5e9] dark:bg-green-900/25',
      accentText: 'text-[#2e7d32]',
      bar: 'bg-[#2e7d32]',
    },
    {
      label: 'Conversion Rate',
      value: `${convRate}%`,
      icon: TrendingUp,
      accentBg:   'bg-[#dce1f5] dark:bg-[#1e254a]',
      accentText: 'text-[#2a3f8f] dark:text-[#7b95e4]',
      bar: 'bg-[#2a3f8f]',
    },
    {
      label: 'Total TYFCB',
      value: currency(totalTYFCB),
      icon: RefreshCw,
      accentBg:   'bg-[#fce8e8] dark:bg-[#2d1a1a]',
      accentText: 'text-[#E31E24]',
      bar: 'bg-[#E31E24]',
    },
  ]

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading referrals…</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.10em] text-[#E31E24] mb-1">
          Admin Panel
        </p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Referrals
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          All chapter referral slips and conversion tracking
        </p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, accentBg, accentText, bar }) => (
          <div
            key={label}
            className={`${card} relative overflow-hidden flex flex-col items-center gap-2 p-4 text-center hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200`}
          >
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${bar}`} />
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentBg} mt-1`}>
              <Icon size={14} className={accentText} strokeWidth={2} />
            </div>
            <div
              className={`text-[1.6rem] font-bold leading-none tabular-nums ${accentText}`}
              style={{ fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
            >
              {value}
            </div>
            <div className="text-xs text-[#9ea3ba] font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Top Referrers Chart ──────────────────────────────────────────── */}
      <div className={`${card} p-6`}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2
              className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Top Referrers
            </h2>
            <p className="text-xs text-[#9ea3ba] mt-0.5">Number of referral slips given</p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]">
            Top 8
          </span>
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={topReferrers} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F7" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#5c607a', fontFamily: 'Inter, sans-serif' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ea3ba', fontFamily: 'Inter, sans-serif' }}
              allowDecimals={false} axisLine={false} tickLine={false}
            />
            <Tooltip
              formatter={v => [v, 'Referrals']}
              contentStyle={tooltipStyle}
              cursor={{ fill: '#F5F6FA' }}
            />
            <Bar dataKey="count" fill="#1B2E6B" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ba]" />
          <input
            className={`w-full pl-9 pr-4 py-2.5 ${inputCls}`}
            placeholder="Search client, from, to…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status pill filters */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
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

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            {/* Head */}
            <thead>
              <tr className="bg-[#F5F6FA] dark:bg-[#1c2035] border-b border-[#CDD0E0] dark:border-[#313655]">
                {['Client', 'From → To', 'Status', 'Value', 'Date'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#5c607a] dark:text-[#8890b0] uppercase tracking-[0.07em] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-[#EEF0F7] dark:divide-[#1c2035]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <Handshake size={36} className="mx-auto mb-3 text-[#CDD0E0] dark:text-[#313655]" />
                    <p className="text-sm font-semibold text-[#5c607a] dark:text-[#8890b0]">
                      No referrals match your filters
                    </p>
                    <p className="text-xs text-[#9ea3ba] mt-1">
                      Try adjusting your search or status filter
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const from = membersMap[r.from]
                  const to   = membersMap[r.to]
                  const cfg  = rowBadge(r)

                  const fromInitials =
                    from?.avatarInitials ||
                    from?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'
                  const toInitials =
                    to?.avatarInitials ||
                    to?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[#F9FAFC] dark:hover:bg-[#1c2035] transition-colors duration-100"
                    >

                      {/* Client */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight">
                          {r.client}
                        </div>
                        {r.notes && (
                          <div className="text-xs text-[#9ea3ba] mt-0.5 truncate max-w-[180px]">
                            {r.notes}
                          </div>
                        )}
                      </td>

                      {/* From → To */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">

                          {/* From */}
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#1B2E6B] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {fromInitials}
                            </div>
                            <span className="text-sm font-medium text-[#1a1d2e] dark:text-[#e4e6f0]">
                              {from?.name?.split(' ')[0] || 'Unknown'}
                            </span>
                          </div>

                          <ArrowRight size={12} className="text-[#CDD0E0] dark:text-[#313655] flex-shrink-0" />

                          {/* To */}
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#2a3f8f] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {toInitials}
                            </div>
                            <span className="text-sm font-medium text-[#1a1d2e] dark:text-[#e4e6f0]">
                              {to?.name?.split(' ')[0] || 'Unknown'}
                            </span>
                          </div>

                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="px-5 py-4">
                        <span
                          className="font-bold tabular-nums text-[#1a1d2e] dark:text-[#e4e6f0]"
                          style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}
                        >
                          {r.value
                            ? currency(r.value)
                            : <span className="text-[#CDD0E0] dark:text-[#313655]">—</span>
                          }
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        {r.date
                          ? <span className="text-[#5c607a] dark:text-[#8890b0] text-sm">{r.date}</span>
                          : <span className="text-[#CDD0E0] dark:text-[#313655]">—</span>
                        }
                      </td>

                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}