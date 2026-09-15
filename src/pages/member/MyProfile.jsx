import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../data/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getMemberPalms, currency } from '../../data/firebaseData'
import {
  User, Phone, Building2, Briefcase, CalendarDays,
  Edit3, Save, X, Globe, Link2, Loader2, CheckCircle2
} from 'lucide-react'

export default function MyProfile() {
  const { user } = useAuth()
  const [palms,   setPalms]   = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({
    name: '', business: '', industry: '',
    phone: '', bio: '', website: '', linkedin: '',
  })

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      try {
        const [snap, palmsData] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          getMemberPalms(user.uid),
        ])
        const data = snap.exists() ? snap.data() : {}
        setForm({
          name:     data.name     || user.displayName || '',
          business: data.business || '',
          industry: data.industry || '',
          phone:    data.phone    || '',
          bio:      data.bio      || '',
          website:  data.website  || '',
          linkedin: data.linkedin || '',
        })
        setPalms(palmsData || {})
      } catch (err) {
        setError('Failed to load profile.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...form,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => { setEditing(false); setError('') }

  const initials =
    user?.avatarInitials ||
    form.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ||
    '?'

  const fields = [
    { icon: User,      label: 'Full Name', key: 'name'     },
    { icon: Building2, label: 'Business',  key: 'business' },
    { icon: Briefcase, label: 'Industry',  key: 'industry' },
    { icon: Phone,     label: 'Phone',     key: 'phone'    },
    { icon: Globe,     label: 'Website',   key: 'website'  },
    { icon: Link2,     label: 'LinkedIn',  key: 'linkedin' },
  ]

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading your profile…</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-4xl">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow">Member Portal</p>
          <h1
            className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
          >
            My Profile
          </h1>
          <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
            Your business identity in the chapter
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8f5e9] dark:bg-green-900/20 text-[#2e7d32] dark:text-green-400 text-sm font-semibold border border-[#c8e6c9] dark:border-green-900">
              <CheckCircle2 size={13} strokeWidth={2.5} /> Saved ✓
            </span>
          )}

          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60 disabled:translate-y-0"
              >
                {saving
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Save size={13} strokeWidth={2.5} />
                }
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="btn-ghost flex items-center gap-2 px-4 py-2 text-sm"
              >
                <X size={13} strokeWidth={2.5} /> Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="btn-ghost flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Edit3 size={13} strokeWidth={2} /> Edit profile
            </button>
          )}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 text-[#E31E24] dark:text-red-400 text-sm font-medium border border-[#f5c6c7] dark:border-red-900">
          <X size={13} strokeWidth={2.5} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Profile Card ────────────────────────────────────────────────── */}
      <div className="card p-6 flex flex-col sm:flex-row items-start gap-6">

        {/* Avatar */}
        <div className="w-20 h-20 rounded-2xl bg-[#1B2E6B] text-white flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-[0_4px_12px_rgba(27,46,107,0.25)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {initials}
        </div>

        {/* Fields Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {fields.map(({ icon: Icon, label, key }) => (
            <div
              key={key}
              className="soft-card p-4"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9ea3ba] mb-1.5">
                <Icon size={11} className="flex-shrink-0" /> {label}
              </div>
              {editing ? (
                <input
                  className="input mt-1 text-sm py-2"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={`Enter ${label.toLowerCase()}`}
                />
              ) : (
                <div className="font-semibold text-sm text-[#1a1d2e] dark:text-[#e4e6f0]">
                  {form[key] || (
                    <span className="text-[#9ea3ba] font-normal italic text-xs">Not set</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bio Card ────────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9ea3ba] mb-3">
          <Edit3 size={12} /> Professional Bio
        </div>
        {editing ? (
          <textarea
            className="input min-h-[100px] resize-none text-sm"
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="Tell your chapter about what you do, who you help, and how to refer you…"
          />
        ) : (
          <p className="text-[#5c607a] dark:text-[#8890b0] leading-relaxed text-sm">
            {form.bio || (
              <span className="italic text-[#9ea3ba]">
                No bio added yet. Click "Edit profile" to add one.
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── PALMS Stats ─────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <CalendarDays size={16} className="text-[#1B2E6B] dark:text-[#7b95e4]" />
          <h2
            className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0]"
            style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
          >
            My PALMS Statistics
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Referrals Given', value: palms.referrals  || 0 },
            { label: '1-to-1 Meetings', value: palms.oneToOne   || 0 },
            { label: 'TYFCB Value',     value: currency(palms.tyfcb || 0) },
            { label: 'CEU Points',      value: palms.ceu        || 0 },
            { label: 'Attendance',      value: `${user?.attendanceRate || palms.attendance || 0}%` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="soft-card p-4 text-center hover:-translate-y-0.5 transition-transform duration-150"
            >
              <div
                className="text-[1.6rem] font-bold leading-none text-[#1B2E6B] dark:text-[#7b95e4] tabular-nums"
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                  fontVariantNumeric: 'tabular-nums lining-nums',
                }}
              >
                {value}
              </div>
              <div className="text-[10px] text-[#9ea3ba] uppercase tracking-wide mt-2 font-medium">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}