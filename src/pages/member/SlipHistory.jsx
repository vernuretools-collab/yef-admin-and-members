import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMemberSlipHistory } from '../../data/firebaseData'
import {
  SLIP_TYPES,
  typeConfig,
  formatSlipDate,
  slipSummary,
  otherPartyName,
} from '../../utils/slipHistory'
import { History, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'

export default function SlipHistory() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      try {
        const list = await getMemberSlipHistory(user.uid)
        setItems(list)
      } catch (err) {
        console.error('Failed to load slip history:', err)
        setError('Could not load history. Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter(i => i.type === filter)),
    [items, filter]
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading your history…</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Member Portal</p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
        >
          My History
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          Thank-you slips, referrals, one-to-ones, and visitors. Older totals appear as “Before tracking” when names were not saved.
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

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 text-[#E31E24] text-sm font-medium">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <History size={40} className="mx-auto text-[#CDD0E0] dark:text-[#313655] mb-4" />
          <p className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
            No {filter !== 'all' ? SLIP_TYPES.find(t => t.key === filter)?.label.toLowerCase() : ''} history yet
          </p>
          <p className="text-xs text-[#9ea3ba] mt-1">
            Slips you log from the dashboard will appear here. Refresh after logging a new thank-you slip.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const cfg = typeConfig[item.type] || typeConfig.referrals
            const isFromMe = item.fromUid === user?.uid
            const other = otherPartyName(item, user?.uid)
            const comments = item.details?.comments || item.details?.topics || item.details?.notes

            return (
              <div
                key={item.id}
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
                        : <ArrowLeft size={17} strokeWidth={2.5} />
                      }
                    </div>
                    <div>
                      <div
                        className="font-bold text-[15px] text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                        style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
                      >
                        {slipSummary(item)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-[#9ea3ba] mt-1 flex-wrap">
                        <span className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
                          {other}
                        </span>
                        {item.prior ? (
                          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#EEF0F7] dark:bg-[#1c2035] text-[#5c607a] dark:text-[#8890b0] text-[11px] font-semibold">
                            Before tracking
                          </span>
                        ) : (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
                            isFromMe
                              ? 'bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]'
                              : 'bg-[#fff3e0] dark:bg-orange-900/20 text-[#e65100]'
                          }`}>
                            {isFromMe ? 'You sent' : 'You received'}
                          </span>
                        )}
                      </div>
                      {comments && (
                        <div className="text-xs text-[#9ea3ba] mt-1.5 italic">"{comments}"</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.badge}`}>
                      {cfg.label}
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
