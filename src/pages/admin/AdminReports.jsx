import { useState, useEffect, useMemo } from 'react'
import { db } from '../../data/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { currency } from '../../data/firebaseData'
import { Download, BarChart3, Loader2 } from 'lucide-react'

/* ─── PALMS traffic light ────────────────────────────────────────────────── */
const trafficLight = (palms) => {
  if (!palms) return 'gray'
  const score =
    ((palms.referrals  || 0) >= 3      ? 1 : 0) +
    ((palms.attendance || 0) >= 22     ? 1 : 0) +
    ((palms.oneToOne   || 0) >= 8      ? 1 : 0) +
    ((palms.tyfcb      || 0) >= 100000 ? 1 : 0)
  return score >= 3 ? 'green' : score >= 2 ? 'yellow' : 'red'
}

/* ─── Rank badge styles ──────────────────────────────────────────────────── */
const rankStyle = (idx) => {
  if (idx === 0) return 'bg-[#f59e0b] text-white shadow-[0_2px_8px_rgba(245,158,11,0.40)]'
  if (idx === 1) return 'bg-[#9ea3ba] text-white'
  if (idx === 2) return 'bg-[#b45309] text-white'
  return 'bg-[#EEF0F7] dark:bg-[#1c2035] text-[#5c607a] dark:text-[#8890b0]'
}

/* ─── Health badge/label —  tokens ───────────────────────────────────── */
const healthBadge = {
  green:  'bg-[#e8f5e9] text-[#2e7d32] dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-[#fff3e0] text-[#e65100] dark:bg-orange-900/30 dark:text-orange-400',
  red:    'bg-[#fce8e8] text-[#E31E24] dark:bg-red-900/30 dark:text-red-400',
  gray:   'bg-[#EEF0F7] text-[#9ea3ba] dark:bg-[#1c2035] dark:text-[#50567a]',
}
const healthLabel = {
  green: 'On track', yellow: 'Needs attention', red: 'At risk', gray: 'No data',
}

/* ─── Shared tokens ──────────────────────────────────────────────────────── */
const card = 'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'

export default function AdminReports() {
  const [members,  setMembers]  = useState([])
  const [palmsMap, setPalmsMap] = useState({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [usersSnap, palmsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
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
      } catch (err) {
        console.error('Failed to load reports:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const leaderboard = useMemo(() =>
    members.map(m => {
      const palms = palmsMap[m.uid] || {}
      const score = Math.round(
        (palms.referrals || 0) * 3 +
        (palms.oneToOne  || 0) * 1 +
        (palms.ceu       || 0) * 0.5 +
        (palms.tyfcb     || 0) / 50000
      )
      return { ...m, score, palms, tl: trafficLight(palms) }
    }).sort((a, b) => b.score - a.score),
    [members, palmsMap]
  )

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Business', 'Industry', 'Referrals', '1-to-1', 'CEU', 'TYFCB', 'Attendance', 'Score', 'Health'],
      ...leaderboard.map(m => [
        m.name, m.business, m.industry,
        m.palms.referrals  || 0,
        m.palms.oneToOne   || 0,
        m.palms.ceu        || 0,
        m.palms.tyfcb      || 0,
        m.attendanceRate   || 0,
        m.score,
        healthLabel[m.tl],
      ])
    ]
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `chapter-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading reports…</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

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
            Reports
          </h1>
          <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
            Chapter performance analytics and member comparison
          </p>
        </div>

        {/* Export button */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:shadow-[0_4px_12px_rgba(27,46,107,0.35)] hover:-translate-y-0.5 duration-150"
        >
          <Download size={14} strokeWidth={2.5} />
          Export CSV
        </button>
      </div>

      {/* ── Leaderboard ─────────────────────────────────────────────────── */}
      <div className={`${card} p-6`}>

        {/* Section header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#dce1f5] dark:bg-[#1e254a] flex items-center justify-center flex-shrink-0">
            <BarChart3 size={17} className="text-[#1B2E6B] dark:text-[#7b95e4]" />
          </div>
          <div>
            <h2
              className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Member Leaderboard
            </h2>
            <p className="text-xs text-[#9ea3ba]">Ranked by composite performance score</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {leaderboard.map((m, idx) => {
            const initials =
              m.avatarInitials ||
              m.name?.split(' ').map(n => n[0]).join('').slice(0, 2)

            return (
              <div
                key={m.uid}
                className={`flex items-center justify-between gap-4 flex-wrap px-4 py-3.5 rounded-xl transition-colors duration-150 ${
                  idx === 0
                    ? 'bg-[#fffbeb] dark:bg-[#2a2210] border border-[#f59e0b]/30 dark:border-[#f59e0b]/20'
                    : 'bg-[#F9FAFC] dark:bg-[#1c2035] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30]'
                }`}
              >

                {/* Left — rank + avatar + name */}
                <div className="flex items-center gap-3">

                  {/* Rank badge */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${rankStyle(idx)}`}>
                    {idx + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#1B2E6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {initials}
                  </div>

                  {/* Name + business */}
                  <div>
                    <div
                      className="font-semibold text-sm text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {m.name}
                    </div>
                    <div className="text-xs text-[#9ea3ba]">{m.business}</div>
                  </div>
                </div>

                {/* Right — stats + health + score */}
                <div className="flex items-center gap-4 flex-wrap">

                  {/* PALMS metrics */}
                  <div className="hidden sm:grid grid-cols-4 gap-5 text-center">
                    {[
                      { label: 'Ref',    val: m.palms.referrals  || 0 },
                      { label: '1:1',    val: m.palms.oneToOne   || 0 },
                      { label: 'CEU',    val: m.palms.ceu        || 0 },
                      { label: 'Attend', val: `${m.attendanceRate || 0}%` },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div
                          className="font-bold text-sm tabular-nums text-[#1a1d2e] dark:text-[#e4e6f0]"
                          style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}
                        >
                          {val}
                        </div>
                        <div className="text-[10px] text-[#9ea3ba] uppercase tracking-wide">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* TYFCB */}
                  <div className="text-center hidden md:block">
                    <div
                      className="font-bold text-sm tabular-nums text-[#1a1d2e] dark:text-[#e4e6f0]"
                      style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}
                    >
                      {currency(m.palms.tyfcb || 0)}
                    </div>
                    <div className="text-[10px] text-[#9ea3ba] uppercase tracking-wide">TYFCB</div>
                  </div>

                  {/* Health badge */}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${healthBadge[m.tl]}`}>
                    {healthLabel[m.tl]}
                  </span>

                  {/* Score */}
                  <div className="bg-white dark:bg-[#161929] border border-[#CDD0E0] dark:border-[#313655] rounded-xl px-3.5 py-2 text-center min-w-[56px] shadow-[0_1px_3px_rgba(27,46,107,0.07)]">
                    <div
                      className="font-bold text-xl text-[#1B2E6B] dark:text-[#7b95e4] tabular-nums leading-none"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
                    >
                      {m.score}
                    </div>
                    <div className="text-[10px] text-[#9ea3ba] uppercase tracking-wide mt-0.5">Score</div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}