import { useState, useEffect, useMemo } from 'react'
import { getMembers, getAllPalms } from '../../data/firebaseData'
import { useAuth } from '../../context/AuthContext'
import { Search, Users, Loader2 } from 'lucide-react'
import MemberCard from '../../components/MemberCard'

/* ─── Shared tokens ──────────────────────────────────────────────────────── */
const inputCls = 'bg-white dark:bg-[#161929] border border-[#CDD0E0] dark:border-[#313655] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm rounded-xl transition-all focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 placeholder:text-[#9ea3ba]'

export default function Directory() {
  const { user } = useAuth()
  const [members,        setMembers]        = useState([])
  const [palmsMap,       setPalmsMap]       = useState({})
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [filterIndustry, setFilterIndustry] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const [memberList, palms] = await Promise.all([
          getMembers(),
          getAllPalms(),
        ])
        setMembers(memberList)
        setPalmsMap(palms)
      } catch (err) {
        console.error('Failed to load directory:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const industries = useMemo(() =>
    ['all', ...new Set(members.map(m => m.industry).filter(Boolean))],
    [members]
  )

  const filtered = useMemo(() => members.filter(m => {
    const matchSearch =
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.business?.toLowerCase().includes(search.toLowerCase())
    const matchIndustry = filterIndustry === 'all' || m.industry === filterIndustry
    return matchSearch && matchIndustry
  }), [members, search, filterIndustry])

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading directory…</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.10em] text-[#E31E24] mb-1">
          Member Portal
        </p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Member Directory
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          Connect and refer business within the chapter
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ba]" />
          <input
            className={`w-full pl-9 pr-4 py-2.5 ${inputCls}`}
            placeholder="Search by name or business…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Industry pills */}
        <div className="flex gap-2 flex-wrap">
          {industries.map(ind => (
            <button
              key={ind}
              onClick={() => setFilterIndustry(ind)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                filterIndustry === ind
                  ? 'bg-[#1B2E6B] text-white border-transparent shadow-[0_2px_8px_rgba(27,46,107,0.25)]'
                  : 'border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] bg-white dark:bg-[#161929]'
              }`}
            >
              {ind === 'all' ? 'All Industries' : ind}
            </button>
          ))}
        </div>
      </div>

      {/* ── Result count ────────────────────────────────────────────────── */}
      <p className="text-sm text-[#9ea3ba]">
        <span className="font-semibold text-[#1a1d2e] dark:text-[#e4e6f0]">{filtered.length}</span>{' '}
        member{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] p-16 text-center">
          <Users size={40} className="mx-auto text-[#CDD0E0] dark:text-[#313655] mb-4" />
          <p className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
            No members match your search
          </p>
          <p className="text-xs text-[#9ea3ba] mt-1">
            Try a different name or industry
          </p>
        </div>
      ) : (

        /* ── Member Cards Grid ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(m => (
            <MemberCard
              key={m.uid || m.id}
              member={m}
              palms={palmsMap[m.uid || m.id]}
              isMe={(m.uid || m.id) === user?.uid}
            />
          ))}
        </div>
      )}
    </div>
  )
}