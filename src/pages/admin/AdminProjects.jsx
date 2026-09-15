import { useState, useEffect, useMemo } from 'react'
import { db } from '../../data/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { currency } from '../../data/firebaseData'
import { FolderKanban, Search, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'

/* ─── Status config — YEF design tokens ─────────────────────────────── */
const statusConfig = {
  completed: {
    badge: 'bg-[#e8f5e9] text-[#2e7d32] dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
    bar: '#2e7d32',
  },
  ongoing: {
    badge: 'bg-[#dce1f5] text-[#1B2E6B] dark:bg-[#1e254a] dark:text-[#7b95e4]',
    icon: Clock,
    bar: '#1B2E6B',
  },
  pending: {
    badge: 'bg-[#fff3e0] text-[#e65100] dark:bg-orange-900/30 dark:text-orange-400',
    icon: AlertCircle,
    bar: '#e65100',
  },
}

const progressColor = (p) => {
  if (p >= 75) return 'bg-[#2e7d32]'
  if (p >= 40) return 'bg-[#1B2E6B]'
  return 'bg-[#e65100]'
}

/* ─── Shared tokens ──────────────────────────────────────────────────────── */
const card     = 'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'
const inputCls = 'bg-white dark:bg-[#161929] border border-[#CDD0E0] dark:border-[#313655] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm rounded-xl transition-all focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 placeholder:text-[#9ea3ba]'

export default function AdminProjects() {
  const [projects,     setProjects]     = useState([])
  const [membersMap,   setMembersMap]   = useState({})
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMember, setFilterMember] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'users')),
        ])
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        const map = {}
        usersSnap.docs.forEach(d => {
          const u = { id: d.id, ...d.data() }
          if (u.role === 'member') map[u.uid] = u
        })
        setMembersMap(map)
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const members = useMemo(() => Object.values(membersMap), [membersMap])

  const filtered = useMemo(() => projects.filter(p => {
    const member = membersMap[p.memberId]
    const matchSearch =
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      member?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const matchMember = filterMember === 'all' || p.memberId === filterMember
    return matchSearch && matchStatus && matchMember
  }), [projects, membersMap, search, filterStatus, filterMember])

  const totalValue  = filtered.reduce((a, b) => a + (b.value    || 0), 0)
  const avgProgress = filtered.length
    ? Math.round(filtered.reduce((a, b) => a + (b.progress || 0), 0) / filtered.length)
    : 0

  const statCards = [
    {
      label: 'Total Projects',
      value: projects.length,
      accentBg:   'bg-[#dce1f5] dark:bg-[#1e254a]',
      accentText: 'text-[#1B2E6B] dark:text-[#7b95e4]',
      bar: 'bg-[#1B2E6B]',
    },
    {
      label: 'Ongoing',
      value: projects.filter(p => p.status === 'ongoing').length,
      accentBg:   'bg-[#dce1f5] dark:bg-[#1e254a]',
      accentText: 'text-[#2a3f8f] dark:text-[#7b95e4]',
      bar: 'bg-[#2a3f8f]',
    },
    {
      label: 'Completed',
      value: projects.filter(p => p.status === 'completed').length,
      accentBg:   'bg-[#e8f5e9] dark:bg-green-900/25',
      accentText: 'text-[#2e7d32]',
      bar: 'bg-[#2e7d32]',
    },
    {
      label: 'Total Portfolio',
      value: currency(projects.reduce((a, b) => a + (b.value || 0), 0)),
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
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading projects…</p>
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
          All Projects
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          Chapter-wide project tracking
        </p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(({ label, value, accentBg, accentText, bar }) => (
          <div
            key={label}
            className={`${card} relative overflow-hidden flex flex-col items-center gap-2 p-4 text-center hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200`}
          >
            {/* Top accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${bar}`} />

            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentBg} mt-1`}>
              <FolderKanban size={14} className={accentText} />
            </div>

            {/* Value */}
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

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ba]" />
          <input
            className={`w-full pl-9 pr-4 py-2.5 ${inputCls}`}
            placeholder="Search projects or member…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          className={`px-3 py-2.5 ${inputCls} min-w-[160px] cursor-pointer`}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>

        {/* Member filter */}
        <select
          className={`px-3 py-2.5 ${inputCls} min-w-[180px] cursor-pointer`}
          value={filterMember}
          onChange={e => setFilterMember(e.target.value)}
        >
          <option value="all">All members</option>
          {members.map(m => (
            <option key={m.uid} value={m.uid}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* ── Filter Summary Bar ───────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-3 px-4 py-3 bg-white dark:bg-[#161929] rounded-xl border border-[#CDD0E0] dark:border-[#313655] text-sm items-center">
          <span className="text-[#9ea3ba]">
            Showing{' '}
            <strong className="text-[#1a1d2e] dark:text-[#e4e6f0] font-semibold">
              {filtered.length}
            </strong>{' '}
            projects
          </span>
          <span className="text-[#CDD0E0] dark:text-[#313655]">|</span>
          <span className="text-[#9ea3ba]">
            Value{' '}
            <strong className="text-[#1a1d2e] dark:text-[#e4e6f0] font-semibold tabular-nums">
              {currency(totalValue)}
            </strong>
          </span>
          <span className="text-[#CDD0E0] dark:text-[#313655]">|</span>
          <span className="text-[#9ea3ba]">
            Avg progress{' '}
            <strong className="text-[#1a1d2e] dark:text-[#e4e6f0] font-semibold tabular-nums">
              {avgProgress}%
            </strong>
          </span>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            {/* Head */}
            <thead>
              <tr className="bg-[#F5F6FA] dark:bg-[#1c2035] border-b border-[#CDD0E0] dark:border-[#313655]">
                {['Project', 'Member', 'Status', 'Progress', 'Value', 'Completed'].map(h => (
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
                  <td colSpan={6} className="text-center py-16">
                    <FolderKanban
                      size={36}
                      className="mx-auto mb-3 text-[#CDD0E0] dark:text-[#313655]"
                    />
                    <p className="text-sm font-semibold text-[#5c607a] dark:text-[#8890b0]">
                      No projects match your filters
                    </p>
                    <p className="text-xs text-[#9ea3ba] mt-1">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const member    = membersMap[p.memberId]
                  const cfg       = statusConfig[p.status] || statusConfig.pending
                  const StatusIcon = cfg.icon
                  const initials  =
                    member?.avatarInitials ||
                    member?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ||
                    '?'

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#F9FAFC] dark:hover:bg-[#1c2035] transition-colors duration-100"
                    >

                      {/* Project */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight">
                          {p.title}
                        </div>
                        {p.description && (
                          <div className="text-xs text-[#9ea3ba] mt-0.5 truncate max-w-[200px]">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Member */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1B2E6B] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight">
                              {member?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-[#9ea3ba]">{member?.business}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize ${cfg.badge}`}>
                          <StatusIcon size={11} strokeWidth={2.5} />
                          {p.status}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <div className="flex-1 h-1.5 bg-[#EEF0F7] dark:bg-[#1c2035] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressColor(p.progress)}`}
                              style={{ width: `${p.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums w-9 text-right text-[#5c607a] dark:text-[#8890b0]">
                            {p.progress || 0}%
                          </span>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="px-5 py-4">
                        <span
                          className="font-bold tabular-nums text-[#1a1d2e] dark:text-[#e4e6f0]"
                          style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}
                        >
                          {currency(p.value)}
                        </span>
                      </td>

                      {/* Completed date */}
                      <td className="px-5 py-4">
                        {p.completedAt
                          ? <span className="text-[#5c607a] dark:text-[#8890b0] text-sm">{p.completedAt}</span>
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