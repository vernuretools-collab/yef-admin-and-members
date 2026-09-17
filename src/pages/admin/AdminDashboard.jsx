import { useEffect, useState, useMemo } from 'react'
import { db } from '../../data/firebase'
import { collection, getDocs } from 'firebase/firestore'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Users, FolderKanban, Handshake, TrendingUp,
  AlertCircle, CheckCircle2, Circle, Loader2
} from 'lucide-react'
import { isConvertedReferral } from '../../utils/referralStatus'


/* ─── Brand Tokens ───────────────────────────────────────────────────────── */
const CHART_COLORS = ['#1B2E6B', '#2a3f8f', '#E31E24', '#e65100']

const currency = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(v)


/* ─── PALMS Traffic Light ─────────────────────────────────────────────────── */
const trafficLight = (palms) => {
  if (!palms) return 'gray'
  const score =
    ((palms.referrals  || 0) >= 3      ? 1 : 0) +
    ((palms.attendance || 0) >= 22     ? 1 : 0) +
    ((palms.oneToOne   || 0) >= 8      ? 1 : 0) +
    ((palms.tyfcb      || 0) >= 100000 ? 1 : 0)
  return score >= 3 ? 'green' : score >= 2 ? 'yellow' : 'red'
}

const trafficConfig = {
  green:  { label: 'On track',        dotColor: '#2e7d32', bg: 'bg-[#e8f5e9]  dark:bg-green-900/30',  text: 'text-[#2e7d32]',  icon: CheckCircle2 },
  yellow: { label: 'Needs attention', dotColor: '#e65100', bg: 'bg-[#fff3e0]  dark:bg-orange-900/30', text: 'text-[#e65100]',  icon: AlertCircle  },
  red:    { label: 'At risk',         dotColor: '#E31E24', bg: 'bg-[#fce8e8]  dark:bg-red-900/30',    text: 'text-[#E31E24]',  icon: AlertCircle  },
  gray:   { label: 'No data',         dotColor: '#9ea3ba', bg: 'bg-[#EEF0F7]  dark:bg-gray-800',      text: 'text-[#9ea3ba]',  icon: Circle       },
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']


/* ─── Shared card class ───────────────────────────────────────────────────── */
const card = 'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07),0_1px_2px_rgba(27,46,107,0.04)]'

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #CDD0E0',
  boxShadow: '0 4px 12px rgba(27,46,107,0.10)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
}


export default function AdminDashboard() {
  const [members,   setMembers]   = useState([])
  const [projects,  setProjects]  = useState([])
  const [referrals, setReferrals] = useState([])
  const [palmsMap,  setPalmsMap]  = useState({})
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
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
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setReferrals(referralsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => !r.historyType || r.historyType === 'referrals')
        )
        const pm = {}
        palmsSnap.docs.forEach(d => { pm[d.data().uid] = d.data() })
        setPalmsMap(pm)
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const monthlyReferrals = useMemo(() => {
    const counts = {}
    referrals.forEach(r => {
      if (!r.date) return
      const month = MONTH_LABELS[new Date(r.date).getMonth()]
      counts[month] = (counts[month] || 0) + 1
    })
    return MONTH_LABELS
      .filter(m => counts[m])
      .map(m => ({ month: m, count: counts[m] }))
  }, [referrals])

  const active     = useMemo(() => members.filter(m => m.status === 'active'),        [members])
  const completed  = useMemo(() => projects.filter(p => p.status === 'completed'),    [projects])
  const converted  = useMemo(() => referrals.filter(r => isConvertedReferral(r)),   [referrals])
  const totalValue = useMemo(() => projects.reduce((a, b) => a + (b.value || 0), 0), [projects])

  const memberValueData = useMemo(() =>
    members.map(m => ({
      name: m.name?.split(' ')[0],
      value: projects
        .filter(p => p.memberId === m.uid)
        .reduce((a, b) => a + (b.value || 0), 0) / 1000,
    })),
    [members, projects]
  )

  const statusCounts = useMemo(() => [
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length },
    { name: 'Ongoing',   value: projects.filter(p => p.status === 'ongoing').length },
    { name: 'Pending',   value: projects.filter(p => p.status === 'pending').length },
  ], [projects])


  /* ── Stat card definitions ── */
  const statCards = [
    {
      label: 'Active Members',
      value: active.length,
      note: `${members.length} total members`,
      icon: Users,
      accentBg:   'bg-[#dce1f5] dark:bg-[#1e254a]',
      accentText: 'text-[#1B2E6B] dark:text-[#7b95e4]',
      blob:       'bg-[#1B2E6B]',
    },
    {
      label: 'Projects Tracked',
      value: projects.length,
      note: `${completed.length} completed`,
      icon: FolderKanban,
      accentBg:   'bg-[#dce1f5] dark:bg-[#1e254a]',
      accentText: 'text-[#2a3f8f] dark:text-[#7b95e4]',
      blob:       'bg-[#2a3f8f]',
    },
    {
      label: 'Total Business Value',
      value: currency(totalValue),
      note: 'All projects combined',
      icon: TrendingUp,
      accentBg:   'bg-[#e8f5e9] dark:bg-green-900/25',
      accentText: 'text-[#2e7d32]',
      blob:       'bg-[#2e7d32]',
    },
    {
      label: 'Referrals Converted',
      value: converted.length,
      note: `of ${referrals.length} total`,
      icon: Handshake,
      accentBg:   'bg-[#fce8e8] dark:bg-[#2d1a1a]',
      accentText: 'text-[#E31E24]',
      blob:       'bg-[#E31E24]',
    },
  ]


  /* ── Loading state ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading dashboard…</p>
      </div>
    </div>
  )


  return (
    <div className="flex flex-col gap-8 p-1">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.10em] text-[#E31E24] mb-1">
            Admin Panel
          </p>
          <h1
            className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Chapter Overview
          </h1>
          <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
            Real-time chapter performance snapshot
          </p>
        </div>

        {/* Live pulse badge */}
        <div className="flex items-center gap-2 self-start mt-1 px-3 py-1.5 rounded-full bg-[#e8f5e9] dark:bg-green-900/30 border border-[#c8e6c9] dark:border-green-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2e7d32] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2e7d32]" />
          </span>
          <span className="text-[11px] font-semibold text-[#2e7d32] uppercase tracking-wide">Live</span>
        </div>
      </div>


      {/* ── KPI Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, note, icon: Icon, accentBg, accentText, blob }) => (
          <div
            key={label}
            className={`${card} relative overflow-hidden flex flex-col gap-4 p-5
              hover:shadow-[0_6px_20px_rgba(27,46,107,0.11)] transition-all duration-200 hover:-translate-y-1`}
          >
            {/* Decorative background blob — no top border line */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.08] ${blob}`} />

            {/* Icon bubble */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentBg} flex-shrink-0 z-10`}>
              <Icon size={19} className={accentText} strokeWidth={2} />
            </div>

            {/* Value + Label */}
            <div className="z-10">
              <div
                className="text-[1.75rem] font-bold leading-none text-[#1a1d2e] dark:text-[#e4e6f0]"
                style={{ fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
              >
                {value}
              </div>
              <div className="text-sm font-medium text-[#1a1d2e] dark:text-[#e4e6f0] mt-1.5 leading-snug">
                {label}
              </div>
              <div className="text-xs text-[#9ea3ba] mt-0.5">{note}</div>
            </div>
          </div>
        ))}
      </div>


      {/* ── Charts Row 1 ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Business Value Bar Chart — 2/3 width */}
        <div className={`${card} p-6 lg:col-span-2`}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2
                className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Business Value by Member
              </h2>
              <p className="text-xs text-[#9ea3ba] mt-0.5">Total project portfolio (₹ thousands)</p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]">
              All Members
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={memberValueData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F7" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#5c607a', fontFamily: 'Inter, sans-serif' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ea3ba', fontFamily: 'Inter, sans-serif' }}
                unit="k" axisLine={false} tickLine={false}
              />
              <Tooltip
                formatter={v => [`₹${v}k`, 'Value']}
                contentStyle={tooltipStyle}
                cursor={{ fill: '#F5F6FA' }}
              />
              <Bar dataKey="value" fill="#1B2E6B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Donut — 1/3 width */}
        <div className={`${card} p-6`}>
          <div className="mb-5">
            <h2
              className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Project Status
            </h2>
            <p className="text-xs text-[#9ea3ba] mt-0.5">Chapter-wide breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusCounts}
                cx="50%" cy="45%"
                innerRadius={52} outerRadius={86}
                paddingAngle={3} dataKey="value"
                strokeWidth={0}
              >
                {statusCounts.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                formatter={v => (
                  <span className="text-xs text-[#5c607a] dark:text-[#8890b0]">{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* ── Charts Row 2 ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Monthly Referral Trend */}
        <div className={`${card} p-6`}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2
                className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Monthly Referral Trend
              </h2>
              <p className="text-xs text-[#9ea3ba] mt-0.5">Referrals logged per month</p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#fce8e8] dark:bg-[#2d1a1a] text-[#E31E24]">
              {referrals.length} total
            </span>
          </div>

          {monthlyReferrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Handshake size={30} className="text-[#CDD0E0] dark:text-[#313655]" />
              <p className="text-sm text-[#9ea3ba]">No referral data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyReferrals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F7" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#5c607a', fontFamily: 'Inter, sans-serif' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ea3ba', fontFamily: 'Inter, sans-serif' }}
                  axisLine={false} tickLine={false} allowDecimals={false}
                />
                <Tooltip
                  formatter={v => [v, 'Referrals']}
                  contentStyle={tooltipStyle}
                />
                <Line
                  type="monotone" dataKey="count"
                  stroke="#E31E24" strokeWidth={2.5}
                  dot={{ r: 4.5, fill: '#E31E24', strokeWidth: 2.5, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#E31E24', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Member Health — PALMS Traffic Light */}
        <div className={`${card} p-6`}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2
                className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Member Health
              </h2>
              <p className="text-xs text-[#9ea3ba] mt-0.5">PALMS-based performance signal</p>
            </div>
            {/* Summary traffic dots */}
            <div className="flex items-center gap-1.5">
              {['green', 'yellow', 'red'].map(k => (
                <span
                  key={k}
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: trafficConfig[k].dotColor }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {members.map(m => {
              const palms = palmsMap[m.uid] || {}
              const tl    = trafficLight(palms)
              const cfg   = trafficConfig[tl]
              const Icon  = cfg.icon
              const initials =
                m.avatarInitials ||
                m.name?.split(' ').map(n => n[0]).join('').slice(0, 2)

              return (
                <div
                  key={m.uid}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#F9FAFC] dark:bg-[#1c2035] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition-colors duration-150"
                >
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#1B2E6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 tracking-wide">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight truncate">
                        {m.name}
                      </div>
                      <div className="text-xs text-[#9ea3ba] truncate">{m.business}</div>
                    </div>
                  </div>

                  {/* Stats + Status badge */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-[#9ea3ba] tabular-nums">
                        {palms.referrals || 0} refs · {palms.attendance || 0} attended
                      </div>
                      <div className="text-xs text-[#9ea3ba] tabular-nums">
                        {currency(palms.tyfcb || 0)} TYFCB
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                      <Icon size={11} strokeWidth={2.5} />
                      <span className="hidden xs:inline">{cfg.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}