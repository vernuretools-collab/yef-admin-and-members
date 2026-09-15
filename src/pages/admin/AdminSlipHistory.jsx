import { useEffect, useMemo, useState } from 'react'
import { getAllSlipHistory, getMembers } from '../../data/firebaseData'
import {
  SLIP_TYPES,
  typeConfig,
  formatSlipDate,
  slipSummary,
} from '../../utils/slipHistory'
import { History, Loader2, ArrowRight, Search } from 'lucide-react'

export default function AdminSlipHistory() {
  const [items, setItems] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [memberId, setMemberId] = useState('all')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [list, memberList] = await Promise.all([
          getAllSlipHistory(),
          getMembers(),
        ])
        setItems(list)
        setMembers(memberList)
      } catch (err) {
        console.error('Failed to load slip history:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromMs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null
    const toMs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null

    return items.filter(item => {
      if (filter !== 'all' && item.type !== filter) return false
      if (memberId !== 'all' && !(item.fromUid === memberId || item.toUid === memberId)) return false

      if (fromMs || toMs) {
        if (item.prior) return false
        const raw = item.createdAt?.toDate?.() || item.createdAt || item.date || item.details?.date
        const ts = raw ? new Date(raw) : null
        const t = ts && !Number.isNaN(ts.getTime()) ? ts.getTime() : 0
        if (!t) return false
        if (fromMs && t < fromMs) return false
        if (toMs && t > toMs) return false
      }

      if (!q) return true
      const hay = [
        item.fromName,
        item.toName,
        slipSummary(item),
        item.details?.comments,
        item.details?.topics,
        item.details?.visitorName,
        item.details?.referral,
      ].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [items, filter, memberId, search, fromDate, toDate])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading chapter history…</p>
      </div>
    </div>
  )

  const inputCls = 'bg-white dark:bg-[#161929] border border-[#CDD0E0] dark:border-[#313655] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm rounded-xl transition-all focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 placeholder:text-[#9ea3ba] px-3.5 py-2.5'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Admin Panel</p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
        >
          Slip History
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          All TYFCB, referral, one-to-one, and visitor slips across the chapter
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {SLIP_TYPES.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
              filter === f.key
                ? 'bg-[#1B2E6B] text-white border-transparent shadow-[0_2px_8px_rgba(27,46,107,0.25)]'
                : 'border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] bg-white dark:bg-[#161929]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ba]" />
          <input
            className={`${inputCls} pl-9 w-full`}
            placeholder="Search member, amount, visitor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={inputCls}
          value={memberId}
          onChange={e => setMemberId(e.target.value)}
        >
          <option value="all">All members</option>
          {members.map(m => (
            <option key={m.uid} value={m.uid}>{m.name}</option>
          ))}
        </select>
        <input
          type="date"
          className={inputCls}
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
        />
        <input
          type="date"
          className={inputCls}
          value={toDate}
          onChange={e => setToDate(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <History size={40} className="mx-auto text-[#CDD0E0] dark:text-[#313655] mb-4" />
          <p className="font-semibold text-[#5c607a] dark:text-[#8890b0]">No matching slips</p>
          <p className="text-xs text-[#9ea3ba] mt-1">
            History starts when members log slips from the dashboard
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const cfg = typeConfig[item.type] || typeConfig.referrals
            const comments = item.details?.comments || item.details?.topics || item.details?.notes

            return (
              <div
                key={item.id}
                className="card p-5 hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]">
                      <ArrowRight size={17} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div
                        className="font-bold text-[15px] text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                        style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
                      >
                        {slipSummary(item)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm mt-1 flex-wrap">
                        <span className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
                          {item.fromName || 'Unknown'}
                        </span>
                        {item.toName ? (
                          <>
                            <ArrowRight size={11} className="text-[#CDD0E0]" />
                            <span className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
                              {item.toName}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {comments && (
                        <div className="text-xs text-[#9ea3ba] mt-1.5 italic">"{comments}"</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.badge}`}>
                      {item.prior ? 'Before tracking' : cfg.label}
                    </span>
                    <div className="text-xs text-[#9ea3ba]">{formatSlipDate(item)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
