import { useState, useEffect, useMemo } from 'react'
import { db } from '../../data/firebase'
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { CalendarDays, MapPin, Clock, Plus, X, CheckCircle2, Loader2 } from 'lucide-react'

/* ─── Type config — YEF tokens ──────────────────────────────────────── */
const typeConfig = {
  weekly: {
    badge: 'bg-[#dce1f5] text-[#1B2E6B] dark:bg-[#1e254a] dark:text-[#7b95e4]',
    label: 'Weekly Meeting',
    dateBg: 'bg-[#dce1f5] dark:bg-[#1e254a]',
    dateText: 'text-[#1B2E6B] dark:text-[#7b95e4]',
  },
  special: {
    badge: 'bg-[#fff3e0] text-[#e65100] dark:bg-orange-900/30 dark:text-orange-400',
    label: 'Special Session',
    dateBg: 'bg-[#fff3e0] dark:bg-orange-900/20',
    dateText: 'text-[#e65100]',
  },
  'one-to-one': {
    badge: 'bg-[#EEF0F7] text-[#5c607a] dark:bg-[#1c2035] dark:text-[#8890b0]',
    label: '1-to-1',
    dateBg: 'bg-[#EEF0F7] dark:bg-[#1c2035]',
    dateText: 'text-[#5c607a] dark:text-[#8890b0]',
  },
}

/* ─── Shared tokens ──────────────────────────────────────────────────────── */
const card     = 'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'
const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-[#F9FAFC] dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 transition-all placeholder:text-[#9ea3ba]'
const labelCls = 'block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] mb-1.5'

const emptyForm = { title: '', date: '', time: '', venue: '', type: 'weekly' }

export default function Meetings() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [rsvp,     setRsvp]     = useState({})
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(emptyForm)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const q    = query(collection(db, 'meetings'), orderBy('date', 'asc'))
        const snap = await getDocs(q)
        setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Failed to load meetings:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const upcoming = useMemo(() => meetings.filter(m => new Date(m.date) >= new Date()), [meetings])
  const past     = useMemo(() => meetings.filter(m => new Date(m.date) <  new Date()), [meetings])

  const handleField = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleAdd = async () => {
    if (!form.title.trim()) return setError('Title is required')
    if (!form.date)         return setError('Date is required')
    if (!form.time.trim())  return setError('Time is required')
    setSaving(true)
    try {
      const ref = await addDoc(collection(db, 'meetings'), {
        ...form,
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
      })
      setMeetings(prev =>
        [...prev, { id: ref.id, ...form }]
          .sort((a, b) => a.date.localeCompare(b.date))
      )
      setForm(emptyForm)
      setShowForm(false)
    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const toggleRsvp = (id) => setRsvp(prev => ({ ...prev, [id]: !prev[id] }))

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading meetings…</p>
      </div>
    </div>
  )

  /* ── Meeting Card ── */
  const MeetingCard = ({ m }) => {
    const cfg     = typeConfig[m.type] || typeConfig.weekly
    const isPast  = new Date(m.date) < new Date()
    const dateObj = new Date(m.date)

    return (
      <div className={`${card} flex flex-col sm:flex-row gap-5 p-5 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 ${isPast ? 'opacity-50' : ''}`}>

        {/* Date Block */}
        <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${cfg.dateBg}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${cfg.dateText}`}>
            {dateObj.toLocaleString('en', { month: 'short' })}
          </div>
          <div className={`text-2xl font-bold leading-none ${cfg.dateText}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {dateObj.getDate()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div
                className="font-bold text-[15px] text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {m.title}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-[#5c607a] dark:text-[#8890b0]">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[#9ea3ba]" />
                  {m.time}
                </span>
                {m.venue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#9ea3ba]" />
                    {m.venue}
                  </span>
                )}
              </div>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0 ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>

          {!isPast && (
            <button
              onClick={() => toggleRsvp(m.id)}
              className={`mt-3 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-all duration-150 ${
                rsvp[m.id]
                  ? 'bg-[#e8f5e9] dark:bg-green-900/20 border-[#c8e6c9] dark:border-green-700 text-[#2e7d32] dark:text-green-400'
                  : 'border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] bg-white dark:bg-[#161929]'
              }`}
            >
              <CheckCircle2 size={14} strokeWidth={2.5} />
              {rsvp[m.id] ? 'Attending ✓' : 'Confirm attendance'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.10em] text-[#E31E24] mb-1">
            Member Portal
          </p>
          <h1
            className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Meetings
          </h1>
          <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
            Chapter meetings, 1-to-1s, and special sessions
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:shadow-[0_4px_12px_rgba(27,46,107,0.35)] hover:-translate-y-0.5 duration-150 w-fit flex-shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} /> Schedule Meeting
        </button>
      </div>

      {/* ── Add Meeting Form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className={`${card} p-6`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2
                className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                New Meeting
              </h2>
              <p className="text-xs text-[#9ea3ba] mt-0.5">Fill in the details below</p>
            </div>
            <button
              onClick={() => { setShowForm(false); setError(''); setForm(emptyForm) }}
              className="p-1.5 rounded-lg hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035] text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 text-[#E31E24] dark:text-red-400 text-sm font-medium border border-[#f5c6c7] dark:border-red-900">
              <X size={13} strokeWidth={2.5} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Title <span className="text-[#E31E24]">*</span></label>
              <input name="title" className={inputCls} placeholder="e.g. 1-to-1 with Meena" value={form.title} onChange={handleField} />
            </div>
            <div>
              <label className={labelCls}>Date <span className="text-[#E31E24]">*</span></label>
              <input name="date" className={inputCls} type="date" value={form.date} onChange={handleField} />
            </div>
            <div>
              <label className={labelCls}>Time <span className="text-[#E31E24]">*</span></label>
              <input name="time" className={inputCls} placeholder="e.g. 10:00 AM" value={form.time} onChange={handleField} />
            </div>
            <div>
              <label className={labelCls}>Venue</label>
              <input name="venue" className={inputCls} placeholder="e.g. Café Coffee Day" value={form.venue} onChange={handleField} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select name="type" className={inputCls} value={form.type} onChange={handleField}>
                <option value="weekly">Weekly</option>
                <option value="one-to-one">1-to-1</option>
                <option value="special">Special</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:-translate-y-0.5 duration-150 disabled:opacity-60 disabled:translate-y-0"
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : 'Add Meeting'
              }
            </button>
            <button
              onClick={() => { setShowForm(false); setError(''); setForm(emptyForm) }}
              className="px-5 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] text-sm font-semibold text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Upcoming ────────────────────────────────────────────────────── */}
      <div>
        <h2
          className="text-lg font-bold text-[#1a1d2e] dark:text-[#e4e6f0] mb-3"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Upcoming{' '}
          <span className="text-[#9ea3ba] font-normal text-sm">({upcoming.length})</span>
        </h2>

        {upcoming.length === 0 ? (
          <div className="bg-[#F9FAFC] dark:bg-[#1c2035] rounded-2xl border border-dashed border-[#CDD0E0] dark:border-[#313655] p-10 text-center">
            <CalendarDays size={34} className="mx-auto text-[#CDD0E0] dark:text-[#313655] mb-3" />
            <p className="text-sm font-semibold text-[#5c607a] dark:text-[#8890b0]">
              No upcoming meetings scheduled
            </p>
            <p className="text-xs text-[#9ea3ba] mt-1">
              Click "Schedule Meeting" to add one
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map(m => <MeetingCard key={m.id} m={m} />)}
          </div>
        )}
      </div>

      {/* ── Past Meetings ────────────────────────────────────────────────── */}
      {past.length > 0 && (
        <div>
          <h2
            className="text-lg font-bold text-[#9ea3ba] mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Past Meetings{' '}
            <span className="font-normal text-sm">({past.length})</span>
          </h2>
          <div className="flex flex-col gap-3">
            {past.map(m => <MeetingCard key={m.id} m={m} />)}
          </div>
        </div>
      )}

    </div>
  )
}