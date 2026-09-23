import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMembers, getAllMeetings, scheduleMeeting, cancelMeeting } from '../../data/firebaseData'
import { SearchField } from '../../components/slips/SlipForms'
import { CalendarDays, MapPin, Clock, Plus, X, Loader2 } from 'lucide-react'

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

const card = 'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'
const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-[#F9FAFC] dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 transition-all placeholder:text-[#9ea3ba]'
const labelCls = 'block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] mb-1.5'

const emptyForm = { memberLabel: '', date: '', time: '', venue: '' }

const memberLabel = (m) =>
  m.displayName || m.name || m.fullName || m.business || m.email || 'Member'

const formatTimeLabel = (time = '') => {
  const match = String(time).match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return time
  let hours = Number(match[1])
  const minutes = match[2]
  const suffix = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${suffix}`
}

const meetingDate = (m) => {
  if (m?.meetingAt?.toDate) return m.meetingAt.toDate()
  if (m?.meetingAt?.seconds) return new Date(m.meetingAt.seconds * 1000)
  if (m?.date && /^\d{2}:\d{2}$/.test(m.time || '')) return new Date(`${m.date}T${m.time}:00+05:30`)
  if (m?.date) return new Date(m.date)
  return new Date(0)
}

const isMine = (m, uid) =>
  m.createdBy === uid || m.withUid === uid || m.memberId === uid

export default function Meetings() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [selectedMember, setSelectedMember] = useState(null)
  const [error, setError] = useState('')

  const loadMeetings = async () => {
    const list = await getAllMeetings()
    setMeetings(list)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [list, memberList] = await Promise.all([getAllMeetings(), getMembers()])
        setMeetings(list)
        setMembers(
          memberList
            .filter(m => (m.id || m.uid) !== user?.uid)
            .map(m => ({ ...m, id: m.id || m.uid, label: memberLabel(m) }))
            .filter(m => m.label)
        )
      } catch (err) {
        console.error('Failed to load meetings:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  useEffect(() => {
    if (!showForm) return undefined
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [showForm])

  const mine = useMemo(
    () => meetings.filter(m => isMine(m, user?.uid)),
    [meetings, user?.uid]
  )

  const upcoming = useMemo(
    () => mine
      .filter(m => m.status !== 'cancelled' && meetingDate(m) >= new Date())
      .sort((a, b) => meetingDate(a) - meetingDate(b)),
    [mine]
  )

  const past = useMemo(
    () => mine
      .filter(m => m.status === 'cancelled' || meetingDate(m) < new Date())
      .sort((a, b) => meetingDate(b) - meetingDate(a)),
    [mine]
  )

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setError('')
    setForm(emptyForm)
    setSelectedMember(null)
  }

  const handleField = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleAdd = async () => {
    if (!selectedMember?.id) return setError('Please select a member')
    if (!form.date) return setError('Date is required')
    if (!form.time) return setError('Time is required')
    setSaving(true)
    try {
      await scheduleMeeting({
        withUid: selectedMember.id,
        date: form.date,
        time: form.time.slice(0, 5),
        venue: form.venue.trim(),
      })
      await loadMeetings()
      setForm(emptyForm)
      setSelectedMember(null)
      setShowForm(false)
      setError('')
    } catch (err) {
      setError(err?.message?.replace(/^Firebase:\s*/i, '') || 'Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelMeeting = async (m) => {
    const other = m.createdBy === user?.uid ? (m.withName || 'the other member') : (m.createdByName || 'the other member')
    if (!window.confirm(`Cancel this meeting? ${other} will be emailed that you are not available.`)) return
    setCancellingId(m.id)
    try {
      await cancelMeeting(m.id)
      await loadMeetings()
    } catch (err) {
      console.error(err)
      window.alert(err?.message?.replace(/^Firebase:\s*/i, '') || 'Could not cancel this meeting.')
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading meetings…</p>
      </div>
    </div>
  )

  const MeetingCard = ({ m }) => {
    const cfg = typeConfig[m.type] || typeConfig['one-to-one']
    const dateObj = meetingDate(m)
    const cancelled = m.status === 'cancelled'
    const isPast = cancelled || dateObj < new Date()
    const otherName = m.createdBy === user?.uid ? m.withName : m.createdByName
    const title = otherName ? `Meeting with ${otherName}` : (m.title || 'Meeting')

    return (
      <div className={`${card} flex flex-col sm:flex-row gap-5 p-5 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 ${isPast ? 'opacity-50' : ''}`}>
        <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${cfg.dateBg}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${cfg.dateText}`}>
            {dateObj.toLocaleString('en', { month: 'short' })}
          </div>
          <div
            className={`text-2xl font-bold leading-none ${cfg.dateText}`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {dateObj.getDate()}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div
                className="font-bold text-[15px] text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {title}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-[#5c607a] dark:text-[#8890b0]">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[#9ea3ba]" />
                  {formatTimeLabel(m.time) || m.time}
                </span>
                {m.venue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#9ea3ba]" />
                    {m.venue}
                  </span>
                )}
              </div>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0 ${cancelled ? 'bg-[#fce8e8] text-[#E31E24] dark:bg-red-900/20 dark:text-red-400' : cfg.badge}`}>
              {cancelled ? 'Cancelled' : cfg.label}
            </span>
          </div>

          {!isPast && (
            <button
              type="button"
              disabled={cancellingId === m.id}
              onClick={() => handleCancelMeeting(m)}
              className="mt-3 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-[#f5c6c7] dark:border-red-900 text-[#E31E24] hover:bg-[#fce8e8] dark:hover:bg-red-900/20 transition-all duration-150 disabled:opacity-60"
            >
              {cancellingId === m.id
                ? <><Loader2 size={14} className="animate-spin" /> Cancelling…</>
                : 'Cancel meeting'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
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
            Schedule 1-to-1s with chapter members
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:shadow-[0_4px_12px_rgba(27,46,107,0.35)] hover:-translate-y-0.5 duration-150 w-fit flex-shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} /> Schedule Meeting
        </button>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(10,12,25,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !saving && closeForm()}
        >
          <div className="bg-white dark:bg-[#161929] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEF0F7] dark:border-[#313655] flex-shrink-0">
              <div>
                <h2
                  className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  New Meeting
                </h2>
                <p className="text-xs text-[#9ea3ba] mt-0.5">The member you choose will get an invitation email</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                className="p-1.5 rounded-lg hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035] text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 text-[#E31E24] dark:text-red-400 text-sm font-medium border border-[#f5c6c7] dark:border-red-900">
                  <X size={13} strokeWidth={2.5} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className={labelCls}>Member <span className="text-[#E31E24]">*</span></label>
                <SearchField
                  placeholder="Click to select a member…"
                  value={form.memberLabel}
                  onChange={v => { setForm(f => ({ ...f, memberLabel: v })); setSelectedMember(null); setError('') }}
                  options={members}
                  onSelectOption={(opt) => {
                    setForm(f => ({ ...f, memberLabel: opt.label || '' }))
                    setSelectedMember(opt)
                    setError('')
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date <span className="text-[#E31E24]">*</span></label>
                  <input name="date" className={inputCls} type="date" value={form.date} onChange={handleField} />
                </div>
                <div>
                  <label className={labelCls}>Time <span className="text-[#E31E24]">*</span></label>
                  <input name="time" className={inputCls} type="time" value={form.time} onChange={handleField} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Venue</label>
                  <input name="venue" className={inputCls} placeholder="e.g. Café Coffee Day" value={form.venue} onChange={handleField} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:-translate-y-0.5 duration-150 disabled:opacity-60 disabled:translate-y-0"
                >
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Sending invite…</>
                    : 'Add Meeting'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  className="px-5 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] text-sm font-semibold text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              Click &quot;Schedule Meeting&quot; to add one
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map(m => <MeetingCard key={m.id} m={m} />)}
          </div>
        )}
      </div>

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
