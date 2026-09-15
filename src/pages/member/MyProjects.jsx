import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../data/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { currency } from '../../data/firebaseData'
import { Plus, FolderKanban, IndianRupee, CheckCircle2, Clock, AlertCircle, X, Loader2 } from 'lucide-react'

/* ─── Status config — design tokens ─────────────────────────────────────── */
const statusConfig = {
  completed: {
    badge: 'bg-[#e8f5e9] text-[#2e7d32] dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
    bar: 'bg-[#1B2E6B]',
  },
  ongoing: {
    badge: 'bg-[#dce1f5] text-[#1B2E6B] dark:bg-[#1e254a] dark:text-[#7b95e4]',
    icon: Clock,
    bar: 'bg-[#1B2E6B]',
  },
  pending: {
    badge: 'bg-[#fff3e0] text-[#e65100] dark:bg-orange-900/30 dark:text-orange-400',
    icon: AlertCircle,
    bar: 'bg-[#e65100]',
  },
}

const progressColor = (p) => {
  if (p >= 75) return 'bg-[#2e7d32]'
  if (p >= 40) return 'bg-[#1B2E6B]'
  return 'bg-[#e65100]'
}

const emptyForm = { title: '', status: 'ongoing', value: '', progress: 0 }

export default function MyProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [filter,   setFilter]   = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(emptyForm)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      try {
        const q    = query(collection(db, 'projects'), where('memberId', '==', user.uid))
        const snap = await getDocs(q)
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Failed to load projects:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  const filtered   = useMemo(() =>
    filter === 'all' ? projects : projects.filter(p => p.status === filter),
    [projects, filter]
  )
  const totalValue = useMemo(() =>
    projects.reduce((a, b) => a + (b.value || 0), 0),
    [projects]
  )

  const handleAdd = async () => {
    if (!form.title.trim())                       return setError('Project title is required')
    if (!form.value || isNaN(Number(form.value))) return setError('Enter a valid value')
    setSaving(true)
    setError('')
    try {
      const newProject = {
        memberId:    user.uid,
        title:       form.title.trim(),
        status:      form.status,
        value:       Number(form.value),
        progress:    Number(form.progress),
        completedAt: form.status === 'completed' ? new Date().toISOString().slice(0, 10) : null,
        createdAt:   serverTimestamp(),
      }
      const ref = await addDoc(collection(db, 'projects'), newProject)
      setProjects(prev => [{ id: ref.id, ...newProject }, ...prev])
      setForm(emptyForm)
      setShowForm(false)
    } catch (err) {
      setError('Failed to save project. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const closeForm = () => { setShowForm(false); setError(''); setForm(emptyForm) }

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading your projects…</p>
      </div>
    </div>
  )

  /* ── Stat cards data ── */
  const stats = [
    { label: 'Total',     value: projects.length,                                    bar: 'bg-[#1B2E6B]', text: 'text-[#1B2E6B] dark:text-[#7b95e4]' },
    { label: 'Ongoing',   value: projects.filter(p => p.status === 'ongoing').length, bar: 'bg-[#1B2E6B]', text: 'text-[#1B2E6B] dark:text-[#7b95e4]' },
    { label: 'Completed', value: projects.filter(p => p.status === 'completed').length, bar: 'bg-[#2e7d32]', text: 'text-[#2e7d32]' },
    { label: 'Portfolio', value: currency(totalValue),                                bar: 'bg-[#E31E24]', text: 'text-[#E31E24]' },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Member Portal</p>
          <h1
            className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
          >
            My Projects
          </h1>
          <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
            Track your active and completed business projects
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm w-fit flex-shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} /> Add Project
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ label, value, bar, text }) => (
          <div
            key={label}
            className="card relative overflow-hidden p-4 text-center hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${bar}`} />
            <div
              className={`text-[1.75rem] font-bold leading-none tabular-nums mt-1 ${text}`}
              style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", fontVariantNumeric: 'tabular-nums lining-nums' }}
            >
              {value}
            </div>
            <div className="text-xs text-[#9ea3ba] mt-1.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'ongoing', 'completed', 'pending'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
              filter === f
                ? 'bg-[#1B2E6B] text-white border-transparent shadow-[0_2px_8px_rgba(27,46,107,0.25)]'
                : 'border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] bg-white dark:bg-[#161929]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Add Project Form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2
                className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0]"
                style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
              >
                New Project
              </h2>
              <p className="text-xs text-[#9ea3ba] mt-0.5">Fill in the project details below</p>
            </div>
            <button
              onClick={closeForm}
              className="p-1.5 rounded-lg hover:bg-[#EEF0F7] dark:hover:bg-[#1c2035] text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 text-[#E31E24] dark:text-red-400 text-sm font-medium border border-[#f5c6c7] dark:border-red-900">
              <X size={13} strokeWidth={2.5} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] mb-1.5">
                Project Title <span className="text-[#E31E24]">*</span>
              </label>
              <input
                className="input"
                placeholder="e.g. Villa Interior Contract"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] mb-1.5">
                Value (₹) <span className="text-[#E31E24]">*</span>
              </label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 250000"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] mb-1.5">
                Status
              </label>
              <select
                className="input"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="ongoing">Ongoing</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] mb-1.5">
                Progress:{' '}
                <span
                  className="text-[#1B2E6B] dark:text-[#7b95e4] font-bold tabular-nums"
                  style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}
                >
                  {form.progress}%
                </span>
              </label>
              <input
                className="w-full accent-[#1B2E6B] h-2 rounded-full cursor-pointer"
                type="range" min="0" max="100"
                value={form.progress}
                onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))}
              />
              <div className="flex justify-between text-xs text-[#9ea3ba] mt-1.5">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-60 disabled:translate-y-0"
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                : 'Add Project'
              }
            </button>
            <button onClick={closeForm} className="btn-ghost px-5 py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Projects Grid ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderKanban size={40} className="mx-auto text-[#CDD0E0] dark:text-[#313655] mb-4" />
          <p className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
            No {filter !== 'all' ? filter : ''} projects yet
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm"
          >
            <Plus size={14} /> Add your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const cfg        = statusConfig[p.status] || statusConfig.pending
            const StatusIcon = cfg.icon
            return (
              <article
                key={p.id}
                className="card p-5 flex flex-col gap-4 hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Title + Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className="font-bold text-[15px] text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight truncate"
                      style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
                    >
                      {p.title}
                    </div>
                    <div className="text-xs text-[#9ea3ba] mt-1 flex items-center gap-1 tabular-nums"
                      style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}
                    >
                      <IndianRupee size={11} />
                      {currency(p.value).replace('₹', '')}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.badge}`}>
                    <StatusIcon size={11} strokeWidth={2.5} />
                    {p.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#9ea3ba]">Progress</span>
                    <span
                      className="font-bold text-[#1a1d2e] dark:text-[#e4e6f0] tabular-nums"
                      style={{ fontVariantNumeric: 'tabular-nums lining-nums' }}
                    >
                      {p.progress || 0}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill transition-all duration-500 ${progressColor(p.progress)}`}
                      style={{ width: `${p.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Completed date */}
                {p.completedAt && (
                  <div className="text-xs text-[#9ea3ba] flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-[#2e7d32]" strokeWidth={2.5} />
                    Completed {p.completedAt}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}