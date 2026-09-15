import { useEffect, useMemo, useState } from 'react'
import { db } from '../../data/firebase'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore'
import {
  Search,
  FileText,
  Clock3,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const card =
  'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07),0_1px_2px_rgba(27,46,107,0.04)]'

const statusConfig = {
  pending: {
    label: 'Pending',
    bg: 'bg-[#fff3e0] dark:bg-orange-900/20',
    text: 'text-[#e65100]',
    dot: '#e65100',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-[#e8f5e9] dark:bg-green-900/25',
    text: 'text-[#2e7d32]',
    dot: '#2e7d32',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-[#fce8e8] dark:bg-red-900/25',
    text: 'text-[#E31E24]',
    dot: '#E31E24',
  },
  check: {
    label: 'Check',
    bg: 'bg-[#dce1f5] dark:bg-[#1e254a]',
    text: 'text-[#1B2E6B] dark:text-[#7b95e4]',
    dot: '#1B2E6B',
  },
}

const categoryConfig = {
  guest: {
    bg: 'bg-[#dce1f5] dark:bg-[#1e254a]',
    text: 'text-[#1B2E6B] dark:text-[#7b95e4]',
  },
  referral: {
    bg: 'bg-[#fce8e8] dark:bg-[#2d1a1a]',
    text: 'text-[#E31E24]',
  },
  check: {
    bg: 'bg-[#dce1f5] dark:bg-[#1e254a]',
    text: 'text-[#1B2E6B] dark:text-[#7b95e4]',
  },
}

const avatarPalette = [
  '#1B2E6B',
  '#2a3f8f',
  '#E31E24',
  '#2e7d32',
  '#e65100',
  '#7b1fa2',
  '#00838f',
]

const getAvatarColor = (name = '') => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return avatarPalette[hash % avatarPalette.length]
}

const initialsFromName = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'NA'

const formatDate = (value) => {
  if (!value) return '—'

  let dateObj = value?.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(dateObj?.getTime?.())) return '—'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dateObj)
}

const formatDateTime = (value) => {
  if (!value) return '—'

  let dateObj = value?.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(dateObj?.getTime?.())) return '—'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

const downloadCSV = (rows) => {
  const headers = [
    'name',
    'company',
    'email',
    'phone',
    'chapter',
    'category',
    'status',
    'message',
    'createdAt',
    'refMemberId',
  ]

  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(key => {
          let val = row[key]

          if (key === 'createdAt') {
            val = row.createdAt?.toDate
              ? row.createdAt.toDate().toISOString()
              : row.createdAt || ''
          }

          return JSON.stringify(val ?? '')
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'visit-requests.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function AdminVisitRequests() {
  const [visitRequests, setVisitRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [chapterFilter, setChapterFilter] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [page, setPage] = useState(1)
  const [darkMode, setDarkMode] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const PAGE_SIZE = 8

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    const fetchVisitRequests = async () => {
      try {
        const snap = await getDocs(collection(db, 'visitRequests'))
        const data = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }))

        data.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
          return bTime - aTime
        })

        setVisitRequests(data)
      } catch (err) {
        console.error('Failed to fetch visit requests:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchVisitRequests()
  }, [])

  const chapters = useMemo(
    () =>
      [...new Set(visitRequests.map(r => r.chapter).filter(Boolean))].sort(),
    [visitRequests]
  )

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()

    return visitRequests.filter(r => {
      const matchesSearch =
        !q ||
        [r.name, r.company, r.email, r.phone, r.message]
          .filter(Boolean)
          .some(field => String(field).toLowerCase().includes(q))

      const matchesStatus = !statusFilter || r.status === statusFilter
      const matchesChapter = !chapterFilter || r.chapter === chapterFilter

      return matchesSearch && matchesStatus && matchesChapter
    })
  }, [visitRequests, search, statusFilter, chapterFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRequests.slice(start, start + PAGE_SIZE)
  }, [filteredRequests, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, chapterFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pendingCount = useMemo(
    () => visitRequests.filter(r => r.status === 'pending').length,
    [visitRequests]
  )

  const approvedCount = useMemo(
    () => visitRequests.filter(r => r.status === 'approved').length,
    [visitRequests]
  )

  const rejectedCount = useMemo(
    () => visitRequests.filter(r => r.status === 'rejected').length,
    [visitRequests]
  )

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      setActionLoadingId(id)
      await updateDoc(doc(db, 'visitRequests', id), { status: newStatus })

      setVisitRequests(prev =>
        prev.map(item =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      )

      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.error('Failed to update visit request status:', err)
      alert('Failed to update status')
    } finally {
      setActionLoadingId(null)
    }
  }

  const statCards = [
    {
      label: 'Total Requests',
      value: visitRequests.length,
      note: 'All submissions received',
      icon: FileText,
      accentBg: 'bg-[#dce1f5] dark:bg-[#1e254a]',
      accentText: 'text-[#1B2E6B] dark:text-[#7b95e4]',
      blob: 'bg-[#1B2E6B]',
    },
    {
      label: 'Pending Review',
      value: pendingCount,
      note: 'Waiting for admin action',
      icon: Clock3,
      accentBg: 'bg-[#fff3e0] dark:bg-orange-900/25',
      accentText: 'text-[#e65100]',
      blob: 'bg-[#e65100]',
    },
    {
      label: 'Approved',
      value: approvedCount,
      note: 'Ready for next step',
      icon: CheckCircle2,
      accentBg: 'bg-[#e8f5e9] dark:bg-green-900/25',
      accentText: 'text-[#2e7d32]',
      blob: 'bg-[#2e7d32]',
    },
    {
      label: 'Rejected',
      value: rejectedCount,
      note: 'Declined requests',
      icon: XCircle,
      accentBg: 'bg-[#fce8e8] dark:bg-[#2d1a1a]',
      accentText: 'text-[#E31E24]',
      blob: 'bg-[#E31E24]',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
          <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">
            Loading visit requests…
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-8 p-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.10em] text-[#E31E24] mb-1">
              Admin Panel
            </p>
            <h1
              className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Visit Requests
            </h1>
            <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
              Manage incoming guest and referral visit requests
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 self-start mt-1 px-3 py-1.5 rounded-full bg-[#e8f5e9] dark:bg-green-900/30 border border-[#c8e6c9] dark:border-green-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2e7d32] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2e7d32]" />
              </span>
              <span className="text-[11px] font-semibold text-[#2e7d32] uppercase tracking-wide">
                Live
              </span>
            </div>

            <button
              onClick={() => setDarkMode(v => !v)}
              className="w-10 h-10 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-white dark:bg-[#161929] text-[#5c607a] dark:text-[#8890b0] flex items-center justify-center hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035] transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, note, icon: Icon, accentBg, accentText, blob }) => (
            <div
              key={label}
              className={`${card} relative overflow-hidden flex flex-col gap-4 p-5 hover:shadow-[0_6px_20px_rgba(27,46,107,0.11)] transition-all duration-200 hover:-translate-y-1`}
            >
              <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.08] ${blob}`} />

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentBg} flex-shrink-0 z-10`}>
                <Icon size={19} className={accentText} strokeWidth={2} />
              </div>

              <div className="z-10">
                <div
                  className="text-[1.75rem] font-bold leading-none text-[#1a1d2e] dark:text-[#e4e6f0]"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontVariantNumeric: 'tabular-nums lining-nums',
                  }}
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

        {/* Filters */}
        <div className={`${card} p-4`}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ea3ba]"
              />
              <input
                type="text"
                placeholder="Search by name, company, email, phone or message"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-white dark:bg-[#161929] text-sm text-[#1a1d2e] dark:text-[#e4e6f0] placeholder:text-[#9ea3ba] focus:outline-none focus:ring-2 focus:ring-[#1B2E6B]/15"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-white dark:bg-[#161929] text-sm text-[#1a1d2e] dark:text-[#e4e6f0] focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="check">Check</option>
            </select>

            <select
              value={chapterFilter}
              onChange={e => setChapterFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-white dark:bg-[#161929] text-sm text-[#1a1d2e] dark:text-[#e4e6f0] focus:outline-none"
            >
              <option value="">All Chapters</option>
              {chapters.map(chapter => (
                <option key={chapter} value={chapter}>
                  {chapter}
                </option>
              ))}
            </select>

            <button
              onClick={() => downloadCSV(filteredRequests)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#2a3f8f] text-white text-sm font-semibold transition-colors"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>

          <div className="mt-3 text-xs text-[#9ea3ba]">
            Showing {filteredRequests.length} of {visitRequests.length} requests
          </div>
        </div>

        {/* Table */}
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-[#F9FAFC] dark:bg-[#1c2035] border-b border-[#EEF0F7] dark:border-[#313655]">
                <tr>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] text-[#9ea3ba] font-semibold px-5 py-3">
                    Visitor
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] text-[#9ea3ba] font-semibold px-5 py-3">
                    Company
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] text-[#9ea3ba] font-semibold px-5 py-3">
                    Chapter
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] text-[#9ea3ba] font-semibold px-5 py-3">
                    Category
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] text-[#9ea3ba] font-semibold px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] text-[#9ea3ba] font-semibold px-5 py-3">
                    Date
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] text-[#9ea3ba] font-semibold px-5 py-3">
                    Message
                  </th>
                  <th className="text-right text-[11px] uppercase tracking-[0.08em] text-[#9ea3ba] font-semibold px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle size={28} className="text-[#CDD0E0] dark:text-[#313655]" />
                        <p className="text-sm text-[#9ea3ba]">No visit requests found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map(req => {
                    const sCfg = statusConfig[req.status] || statusConfig.pending
                    const cCfg = categoryConfig[req.category] || categoryConfig.guest
                    const isUpdating = actionLoadingId === req.id

                    return (
                      <tr
                        key={req.id}
                        className="border-b border-[#EEF0F7] dark:border-[#313655] hover:bg-[#F9FAFC] dark:hover:bg-[#1c2035] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-xs tracking-wide flex-shrink-0"
                              style={{ backgroundColor: getAvatarColor(req.name) }}
                            >
                              {initialsFromName(req.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] truncate">
                                {req.name || '—'}
                              </div>
                              <div className="text-xs text-[#9ea3ba] truncate">
                                {req.phone || req.email || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#1a1d2e] dark:text-[#e4e6f0]">
                          {req.company || '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-[#5c607a] dark:text-[#8890b0]">
                          {req.chapter || '—'}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cCfg.bg} ${cCfg.text}`}>
                            {req.category || '—'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${sCfg.bg} ${sCfg.text}`}>
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: sCfg.dot }}
                            />
                            {sCfg.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#5c607a] dark:text-[#8890b0] whitespace-nowrap">
                          {formatDate(req.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-[220px] truncate text-sm text-[#5c607a] dark:text-[#8890b0]">
                            {req.message || '—'}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedRequest(req)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5c607a] dark:text-[#8890b0] hover:bg-[#dce1f5] dark:hover:bg-[#1e254a] hover:text-[#1B2E6B] dark:hover:text-[#7b95e4] transition-colors"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(req.id, 'approved')}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#2e7d32] hover:bg-[#e8f5e9] dark:hover:bg-green-900/25 transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            </button>

                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(req.id, 'rejected')}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#E31E24] hover:bg-[#fce8e8] dark:hover:bg-red-900/25 transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[#EEF0F7] dark:border-[#313655] flex-wrap">
            <div className="text-xs text-[#9ea3ba]">
              {filteredRequests.length === 0
                ? 'No results'
                : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(
                    page * PAGE_SIZE,
                    filteredRequests.length
                  )} of ${filteredRequests.length}`}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg border border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] flex items-center justify-center disabled:opacity-40 hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035]"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="px-3 py-1.5 rounded-lg bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4] text-sm font-semibold">
                {page}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg border border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] flex items-center justify-center disabled:opacity-40 hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEF0F7] dark:border-[#313655]">
              <div>
                <h2
                  className="text-lg font-bold text-[#1a1d2e] dark:text-[#e4e6f0]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Visit Request Details
                </h2>
                <p className="text-xs text-[#9ea3ba] mt-0.5">
                  Full request information
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035]"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full text-white flex items-center justify-center font-bold text-sm tracking-wide"
                  style={{ backgroundColor: getAvatarColor(selectedRequest.name) }}
                >
                  {initialsFromName(selectedRequest.name)}
                </div>

                <div>
                  <div className="text-lg font-semibold text-[#1a1d2e] dark:text-[#e4e6f0]">
                    {selectedRequest.name || '—'}
                  </div>
                  <div className="text-sm text-[#5c607a] dark:text-[#8890b0]">
                    {selectedRequest.company || '—'}
                  </div>
                </div>

                <div className="ml-auto">
                  {(() => {
                    const sCfg = statusConfig[selectedRequest.status] || statusConfig.pending
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold ${sCfg.bg} ${sCfg.text}`}>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: sCfg.dot }}
                        />
                        {sCfg.label}
                      </span>
                    )
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailItem label="Email" value={selectedRequest.email} />
                <DetailItem label="Phone" value={selectedRequest.phone} />
                <DetailItem label="Chapter" value={selectedRequest.chapter} />
                <DetailItem label="Category" value={selectedRequest.category} />
                <DetailItem label="Status" value={selectedRequest.status} />
                <DetailItem label="Created At" value={formatDateTime(selectedRequest.createdAt)} />
                <DetailItem label="Ref Member ID" value={selectedRequest.refMemberId} full />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ea3ba] mb-2">
                  Message
                </p>
                <div className="rounded-xl bg-[#F9FAFC] dark:bg-[#1c2035] border border-[#EEF0F7] dark:border-[#313655] px-4 py-3 text-sm text-[#5c607a] dark:text-[#8890b0] leading-6">
                  {selectedRequest.message || '—'}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] text-sm font-semibold text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035]"
                >
                  Close
                </button>

                <button
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'rejected')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#fce8e8] dark:bg-red-900/25 text-[#E31E24] text-sm font-semibold hover:opacity-90"
                >
                  <XCircle size={16} />
                  Reject
                </button>

                <button
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'approved')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e8f5e9] dark:bg-green-900/25 text-[#2e7d32] text-sm font-semibold hover:opacity-90"
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DetailItem({ label, value, full = false }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ea3ba] mb-1.5">
        {label}
      </p>
      <div className="text-sm text-[#1a1d2e] dark:text-[#e4e6f0] break-all">
        {value || '—'}
      </div>
    </div>
  )
}