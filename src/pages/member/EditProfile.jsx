import { useState, useEffect, useRef } from 'react'
import { db, storage, auth } from '../../data/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { useAuth } from '../../context/AuthContext'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Globe,
  Link2,
  Mail,
  Phone,
  X,
  Plus,
  Tag,
  MapPin,
  Briefcase,
  Target,
  Trophy,
  Star,
  Award,
  Heart,
  Users,
  Camera,
  Lock,
} from 'lucide-react'
import { chapters } from '../../data/chapters'

const inputCls = 'w-full mt-1.5 px-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-[#F9FAFC] dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 transition-all placeholder:text-[#9ea3ba]'
const labelCls = 'block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0]'
const card = 'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'

const SectionTitle = ({ icon: Icon, label, color = '#1B2E6B' }) => (
  <div className="flex items-center gap-2 pt-2 pb-1 border-b border-[#EEF0F7] dark:border-[#313655] mb-1">
    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
      <Icon size={14} style={{ color }} />
    </div>
    <p className="text-sm font-bold text-[#1a1d2e] dark:text-[#e4e6f0]">{label}</p>
  </div>
)

const EMPTY = {
  name: '',
  industry: '',
  business: '',
  chapterSlug: '',
  tagline: '',
  location: '',
  city: '',
  email: '',
  phone: '',
  website: '',
  linkedin: '',
  facebook: '',
  showEmail: true,
  showPhone: true,
  bio: '',
  businessDescription: '',
  tags: [],
  memberSince: '',
  yearsInBusiness: '',
  referralsGiven: '',
  oneToOnes: '',
  gains_goals: '',
  gains_achievements: '',
  gains_interests: '',
  gains_networks: '',
  gains_skills: '',
  tops_teaching: '',
  tops_openings: '',
  tops_products: '',
  tops_sought: '',
  idealReferral: '',
  commercial: '',
  hobbies: '',
  personalNote: '',
  preferredContact: '',
  availableFrom: '',
  gallery: [],
  photoURL: '',
}

const FacebookIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V11c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4H15.2c-1.2 0-1.6.8-1.6 1.6v2h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
  </svg>
)

// ─── Password strength checker ─────────────────────────────────────────────
const getPasswordStrength = (password) => {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Weak', color: '#E31E24', width: '25%' }
  if (score === 2) return { label: 'Fair', color: '#e65100', width: '50%' }
  if (score === 3) return { label: 'Good', color: '#1B2E6B', width: '75%' }
  return { label: 'Strong', color: '#2e7d32', width: '100%' }
}

export default function EditProfile() {
  const { user } = useAuth()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [galleryInput, setGalleryInput] = useState('')
  const [activeTab, setActiveTab] = useState('basic')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  // ─── Password change state ────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const strength = getPasswordStrength(pwForm.next)

  const chapterObj = chapters.find(c => c.slug === (form?.chapterSlug || user?.chapterSlug))
  const chapterName = chapterObj?.name

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          setForm({ ...EMPTY, ...snap.data() })
        } else {
          setForm({
            ...EMPTY,
            name: user.displayName || user.name || '',
            email: user.email || '',
            chapterSlug: user.chapterSlug || '',
          })
        }
      } catch (err) {
        setError('Failed to load profile. Please refresh.')
        console.error(err)
      }
    }
    load()
  }, [user])

  const handle = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setSaved(false)
    setError('')
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (!t || form.tags.includes(t) || form.tags.length >= 12) return
    setForm(f => ({ ...f, tags: [...f.tags, t] }))
    setTagInput('')
    setSaved(false)
  }

  const removeTag = tag => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
    setSaved(false)
  }

  const addGallery = () => {
    const g = galleryInput.trim()
    if (!g || form.gallery.includes(g) || form.gallery.length >= 6) return
    setForm(f => ({ ...f, gallery: [...f.gallery, g] }))
    setGalleryInput('')
    setSaved(false)
  }

  const removeGallery = url => {
    setForm(f => ({ ...f, gallery: f.gallery.filter(g => g !== url) }))
    setSaved(false)
  }

  const handleImage = async e => {
    const file = e.target.files?.[0]
    if (!file || !user?.uid) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); e.target.value = ''; return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); e.target.value = ''; return }
    try {
      setUploading(true)
      setError('')
      const storageRef = ref(storage, `profiles/${user.uid}/avatar`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setForm(f => ({ ...f, photoURL: url }))
      await setDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true })
      setSaved(true)
    } catch (err) {
      console.error(err)
      setError('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const save = async e => {
    e.preventDefault()
    if (!user?.uid) return
    setSaving(true)
    setError('')
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { ...form, uid: user.uid, role: 'member', updatedAt: serverTimestamp() },
        { merge: true }
      )
      setSaved(true)
    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Password change handler ──────────────────────────────────────────────
  const handlePasswordChange = async e => {
    e.preventDefault()
    setPwError('')
    setPwSaved(false)

    if (!pwForm.current) return setPwError('Please enter your current password.')
    if (pwForm.next.length < 8) return setPwError('New password must be at least 8 characters.')
    if (pwForm.next !== pwForm.confirm) return setPwError('New passwords do not match.')

    setPwSaving(true)
    try {
      const currentUser = auth.currentUser
      const credential = EmailAuthProvider.credential(currentUser.email, pwForm.current)

      // Re-authenticate first (required by Firebase before sensitive operations)
      await reauthenticateWithCredential(currentUser, credential)

      // Update password
      await updatePassword(currentUser, pwForm.next)

      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 4000)
    } catch (err) {
      console.error(err)
      const code = err?.code || ''
      setPwError(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : code === 'auth/too-many-requests'
            ? 'Too many attempts. Please wait and try again.'
            : code === 'auth/requires-recent-login'
              ? 'Session expired. Please log out and log back in, then try again.'
              : err.message || 'Failed to update password. Please try again.'
      )
    } finally {
      setPwSaving(false)
    }
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
          <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading your profile…</p>
        </div>
      </div>
    )
  }

  const previewInitials = form.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'about', label: 'About' },
    { id: 'gains', label: 'GAINS' },
    { id: 'tops', label: 'TOPS' },
    { id: 'referral', label: 'Referral' },
    { id: 'personal', label: 'Personal' },
    { id: 'media', label: 'Media & Links' },
    { id: 'password', label: ' Password' }, // ✅ new tab
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="eyebrow">Member Portal</p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
        >
          Edit Your Public Profile
        </h1>
        <p className="mt-1.5 text-sm text-[#5c607a] dark:text-[#8890b0]">
          This is how you'll appear on the public YAAM website. Keep your profile updated so visitors know exactly how to refer you.
        </p>
      </div>

      <div className="flex gap-1 flex-wrap mb-6 bg-[#F9FAFC] dark:bg-[#161929] p-1 rounded-xl border border-[#CDD0E0] dark:border-[#313655]">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-[#1B2E6B] text-white shadow'
                : 'text-[#5c607a] dark:text-[#8890b0] hover:text-[#1B2E6B] dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-7 items-start">

        {/* ─── Password Tab (separate form, not inside profile save form) ─── */}
        {activeTab === 'password' ? (
          <form onSubmit={handlePasswordChange} className={`${card} p-6 sm:p-8 flex flex-col gap-5`}>
            <SectionTitle icon={Lock} label="Change Password" color="#1B2E6B" />

            <p className="text-sm text-[#5c607a] dark:text-[#8890b0] -mt-2">
              To update your password, enter your current password first for verification.
            </p>

            {/* Current Password */}
            <div>
              <label className={labelCls}>Current Password</label>
              <div className="relative">
                <input
                  type={pwShow.current ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className={`${inputCls} pr-11`}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setPwShow(s => ({ ...s, current: !s.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.75 text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] transition-colors"
                >
                  {pwShow.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <input
                  type={pwShow.next ? 'text' : 'password'}
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  className={`${inputCls} pr-11`}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setPwShow(s => ({ ...s, next: !s.next }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.75 text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] transition-colors"
                >
                  {pwShow.next ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password strength bar */}
              {pwForm.next && strength && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-[#EEF0F7] dark:bg-[#313655] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: strength.width, backgroundColor: strength.color }}
                    />
                  </div>
                  <p className="text-xs mt-1 font-medium" style={{ color: strength.color }}>
                    {strength.label} password
                  </p>
                </div>
              )}

              {/* Requirements hint */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {[
                  { label: '8+ characters', ok: pwForm.next.length >= 8 },
                  { label: 'Uppercase letter', ok: /[A-Z]/.test(pwForm.next) },
                  { label: 'Number', ok: /[0-9]/.test(pwForm.next) },
                  { label: 'Special character', ok: /[^A-Za-z0-9]/.test(pwForm.next) },
                ].map(({ label, ok }) => (
                  <span
                    key={label}
                    className={`text-xs flex items-center gap-1 ${ok ? 'text-[#2e7d32]' : 'text-[#9ea3ba]'}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${ok ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#EEF0F7] dark:bg-[#313655] text-[#9ea3ba]'}`}>
                      {ok ? '✓' : '·'}
                    </span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <div className="relative">
                <input
                  type={pwShow.confirm ? 'text' : 'password'}
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  className={`${inputCls} pr-11 ${
                    pwForm.confirm && pwForm.next !== pwForm.confirm
                      ? 'border-[#E31E24] focus:border-[#E31E24] focus:ring-[#E31E24]/15'
                      : pwForm.confirm && pwForm.next === pwForm.confirm
                        ? 'border-[#2e7d32] focus:border-[#2e7d32] focus:ring-[#2e7d32]/15'
                        : ''
                  }`}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setPwShow(s => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.75 text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] transition-colors"
                >
                  {pwShow.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-[#E31E24] mt-1 font-medium">Passwords do not match</p>
              )}
              {pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.next && (
                <p className="text-xs text-[#2e7d32] mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 size={11} /> Passwords match
                </p>
              )}
            </div>

            {/* Error */}
            {pwError && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 border border-[#f5c6c7] dark:border-red-900 text-[#E31E24] dark:text-red-400 text-sm font-medium">
                <X size={14} className="mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                {pwError}
              </div>
            )}

            {/* Success */}
            {pwSaved && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#e8f5e9] dark:bg-green-900/20 border border-[#c8e6c9] dark:border-green-900 text-[#2e7d32] dark:text-green-400 text-sm font-semibold">
                <CheckCircle2 size={15} /> Password updated successfully!
              </div>
            )}

            <div className="pt-2 border-t border-[#EEF0F7] dark:border-[#313655]">
              <button
                type="submit"
                disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
                className="w-full py-3 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white font-semibold text-sm transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:-translate-y-0.5 duration-150 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                {pwSaving
                  ? <><Loader2 size={14} className="animate-spin" /> Updating Password…</>
                  : <><Lock size={14} /> Update Password</>
                }
              </button>
            </div>
          </form>
        ) : (

        <form onSubmit={save} className={`${card} p-6 sm:p-8 flex flex-col gap-5`}>
          {activeTab === 'basic' && (
            <>
              <SectionTitle icon={Briefcase} label="Basic Information" />
              <div className="flex items-center gap-4 mb-2">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#1B2E6B] text-white flex items-center justify-center font-bold text-2xl">
                    {form.photoURL ? (
                      <img src={form.photoURL} alt={form.name} className="w-full h-full object-cover" />
                    ) : (
                      previewInitials
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </div>
                <div className="text-sm text-[#5c607a]">Click the photo to change the member image.</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  Full Name *
                  <input name="name" value={form.name} onChange={handle} required className={inputCls} placeholder="Your full name" />
                </label>
                <label className={labelCls}>
                  Industry
                  <input name="industry" value={form.industry} onChange={handle} className={inputCls} placeholder="e.g. Aluminium partition and false ceiling" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  Company / Business Name
                  <input name="business" value={form.business} onChange={handle} className={inputCls} placeholder="Althaf Aluminium" />
                </label>
                <label className={labelCls}>
                  Chapter
                  <input value={chapterName} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                </label>
              </div>

              <label className={labelCls}>
                Tagline
                <input name="tagline" value={form.tagline} onChange={handle} className={inputCls} placeholder="Efficient space solutions for commercial and industrial projects." />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5"><MapPin size={12} className="text-[#9ea3ba]" /> Full Address</span>
                  <input name="location" value={form.location} onChange={handle} className={inputCls} placeholder="Street, City, PIN" />
                </label>
                <label className={labelCls}>
                  City
                  <input name="city" value={form.city} onChange={handle} className={inputCls} placeholder="Chennai" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  Member Since (Year)
                  <input name="memberSince" value={form.memberSince} onChange={handle} className={inputCls} placeholder="2026" />
                </label>
                <label className={labelCls}>
                  Years in Business
                  <input name="yearsInBusiness" value={form.yearsInBusiness} onChange={handle} className={inputCls} placeholder="16" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  Clients Served
                  <input name="referralsGiven" value={form.referralsGiven} onChange={handle} className={inputCls} placeholder="550+" />
                </label>
                <label className={labelCls}>
                  Projects Completed
                  <input name="oneToOnes" value={form.oneToOnes} onChange={handle} className={inputCls} placeholder="2000+" />
                </label>
              </div>

              <SectionTitle icon={Phone} label="Contact Details" />
              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5"><Mail size={12} className="text-[#9ea3ba]" /> Email</span>
                  <input name="email" value={form.email} onChange={handle} className={inputCls} placeholder="you@example.com" />
                </label>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5"><Phone size={12} className="text-[#9ea3ba]" /> Phone</span>
                  <input name="phone" value={form.phone} onChange={handle} className={inputCls} placeholder="9876543210" />
                </label>
              </div>

              <div className="bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl p-4 flex flex-col gap-3 border border-[#EEF0F7] dark:border-[#313655]">
                <p className="text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0]">Contact visibility on public profile</p>
                {[
                  { name: 'showEmail', label: `Show email publicly (${form.email || 'not set'})` },
                  { name: 'showPhone', label: `Show phone publicly (${form.phone || 'not set'})` },
                ].map(({ name, label }) => (
                  <label key={name} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name={name} checked={form[name]} onChange={handle} className="w-4 h-4 rounded accent-[#1B2E6B]" />
                    <span className="text-sm text-[#5c607a] dark:text-[#8890b0]">{label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {activeTab === 'about' && (
            <>
              <SectionTitle icon={Briefcase} label="About Your Business" />
              <label className={labelCls}>
                Bio / Headline
                <span className="text-[#9ea3ba] font-normal text-xs ml-1">(shown on member card)</span>
                <textarea name="bio" value={form.bio} onChange={handle} rows={4} placeholder="Short intro — what you do, who you help, why choose you…" className={inputCls} />
              </label>
              <label className={labelCls}>
                Full Business Description
                <span className="text-[#9ea3ba] font-normal text-xs ml-1">(shown on profile page)</span>
                <textarea name="businessDescription" value={form.businessDescription} onChange={handle} rows={6} placeholder="Detailed description of your business, services, and value proposition…" className={inputCls} />
              </label>
              <div>
                <p className={labelCls}>
                  <span className="flex items-center gap-1.5">
                    <Tag size={12} className="text-[#9ea3ba]" /> SEO Tags / Keywords
                    <span className="text-[#9ea3ba] font-normal text-xs">(max 12)</span>
                  </span>
                </p>
                <div className="flex gap-2 mt-1.5">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    className={`${inputCls} mt-0 flex-1`}
                    placeholder="e.g. Aluminium partition chennai"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!tagInput.trim() || form.tags.length >= 12}
                    className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-[#1B2E6B] text-white text-sm font-semibold hover:bg-[#111d47] disabled:opacity-40 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {form.tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEF0F7] dark:bg-[#1c2035] text-[#5c607a] dark:text-[#8890b0] text-xs font-medium">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="text-[#9ea3ba] hover:text-[#E31E24] transition-colors"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'gains' && (
            <>
              <SectionTitle icon={Target} label="GAINS Profile" color="#1A2B6B" />
              <p className="text-xs text-[#9ea3ba]">GAINS stands for Goals, Achievements, Interests, Networks, Skills</p>
              {[
                { name: 'gains_goals', label: 'Goals', placeholder: 'What are your business goals? Expand to Tamil Nadu and beyond…' },
                { name: 'gains_achievements', label: 'Achievements', placeholder: '550+ clients, 2000+ projects, empanelled vendor for Tafe…' },
                { name: 'gains_interests', label: 'Interests', placeholder: 'Commercial interiors, industrial space planning…' },
                { name: 'gains_networks', label: 'Networks', placeholder: 'Tafe vendors, Lucas Indian Service, YEF members…' },
                { name: 'gains_skills', label: 'Skills', placeholder: 'Aluminium partitions, false ceilings, glass partitions…' },
              ].map(({ name, label, placeholder }) => (
                <label key={name} className={labelCls}>
                  {label}
                  <textarea name={name} value={form[name]} onChange={handle} rows={3} placeholder={placeholder} className={inputCls} />
                </label>
              ))}
            </>
          )}

          {activeTab === 'tops' && (
            <>
              <SectionTitle icon={Trophy} label="TOPS Profile" color="#b45309" />
              <p className="text-xs text-[#9ea3ba]">TOPS stands for Teaching, Openings, Products/Services, Referrals Sought</p>
              {[
                { name: 'tops_teaching', label: 'Teaching', placeholder: 'What knowledge or expertise can you teach others?' },
                { name: 'tops_openings', label: 'Openings', placeholder: 'What opportunities are you looking for?' },
                { name: 'tops_products', label: 'Products / Services', placeholder: 'Aluminium partition, glass partition, false ceiling…' },
                { name: 'tops_sought', label: 'Referrals Sought', placeholder: 'Commercial architects, interior contractors, factory owners…' },
              ].map(({ name, label, placeholder }) => (
                <label key={name} className={labelCls}>
                  {label}
                  <textarea name={name} value={form[name]} onChange={handle} rows={3} placeholder={placeholder} className={inputCls} />
                </label>
              ))}
            </>
          )}

          {activeTab === 'referral' && (
            <>
              <SectionTitle icon={Star} label="Ideal Referral" color="#7c3aed" />
              <label className={labelCls}>
                Ideal Referral Partner
                <textarea name="idealReferral" value={form.idealReferral} onChange={handle} rows={4} placeholder="Commercial architects, PEB structure contractors, companies with factories that need aluminium partition…" className={inputCls} />
              </label>
              <SectionTitle icon={Award} label="60-Second Commercial" color="#0369a1" />
              <label className={labelCls}>
                Commercial Script
                <textarea name="commercial" value={form.commercial} onChange={handle} rows={4} placeholder="You should speak to him if you need aluminium partition and false ceiling works…" className={inputCls} />
              </label>
              <SectionTitle icon={Users} label="Target Market" color="#1A2B6B" />
              <label className={labelCls}>
                Who Needs Your Service?
                <textarea name="gains_interests" value={form.gains_interests} onChange={handle} rows={3} placeholder="Companies with factories and warehouses, offices that need partitions…" className={inputCls} />
              </label>
            </>
          )}

          {activeTab === 'personal' && (
            <>
              <SectionTitle icon={Heart} label="Personal Details" color="#be185d" />
              <label className={labelCls}>
                Hobbies / Interests
                <input name="hobbies" value={form.hobbies} onChange={handle} className={inputCls} placeholder="Community networking, project consultation…" />
              </label>
              <label className={labelCls}>
                Fun Fact / Personal Note
                <input name="personalNote" value={form.personalNote} onChange={handle} className={inputCls} placeholder="Available for calls from 8 AM to 9 PM" />
              </label>
            </>
          )}

          {activeTab === 'media' && (
            <>
              <SectionTitle icon={Globe} label="Social & Website Links" />
              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5"><Globe size={12} className="text-[#9ea3ba]" /> Website</span>
                  <input name="website" value={form.website} onChange={handle} placeholder="https://" className={inputCls} />
                </label>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5"><Link2 size={12} className="text-[#9ea3ba]" /> LinkedIn</span>
                  <input name="linkedin" value={form.linkedin} onChange={handle} placeholder="linkedin.com/in/…" className={inputCls} />
                </label>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5 text-[#e1306c]">Instagram</span>
                  <input name="instagram" value={form.instagram || ''} onChange={handle} placeholder="@handle or full URL" className={inputCls} />
                </label>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5 text-[#1877f2]"><FacebookIcon /> Facebook</span>
                  <input name="facebook" value={form.facebook || ''} onChange={handle} placeholder="facebook.com/..." className={inputCls} />
                </label>
              </div>

              <SectionTitle icon={Tag} label="Gallery / Portfolio Links" />
              <p className="text-xs text-[#9ea3ba] -mt-3">Paste Google Drive share links or image URLs (max 6)</p>
              <div className="flex gap-2 mt-1.5">
                <input
                  value={galleryInput}
                  onChange={e => setGalleryInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGallery() } }}
                  className={`${inputCls} mt-0 flex-1`}
                  placeholder="https://drive.google.com/open?id=…"
                />
                <button
                  type="button"
                  onClick={addGallery}
                  disabled={!galleryInput.trim() || form.gallery.length >= 6}
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-[#1B2E6B] text-white text-sm font-semibold hover:bg-[#111d47] disabled:opacity-40 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
              {form.gallery.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {form.gallery.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl px-3 py-2 border border-[#EEF0F7] dark:border-[#313655]">
                      <span className="text-xs text-[#5c607a] dark:text-[#8890b0] truncate flex-1">{g}</span>
                      <button type="button" onClick={() => removeGallery(g)} className="text-[#9ea3ba] hover:text-[#E31E24] transition-colors flex-shrink-0"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-[#EEF0F7] dark:border-[#313655]">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white font-semibold text-sm transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:-translate-y-0.5 duration-150 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save & Publish Profile'}
            </button>
            <button
              type="button"
              onClick={() => setPreview(p => !p)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#CDD0E0] dark:border-[#313655] text-sm font-semibold text-[#5c607a] dark:text-[#8890b0] hover:border-[#1B2E6B] hover:text-[#1B2E6B] transition-all bg-white dark:bg-[#161929]"
            >
              {preview ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Preview</>}
            </button>
          </div>

          {saved && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#e8f5e9] dark:bg-green-900/20 text-[#2e7d32] dark:text-green-400 text-sm font-semibold border border-[#c8e6c9] dark:border-green-900">
              <CheckCircle2 size={15} />
              Profile saved! Changes are now live on the public website.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 text-[#E31E24] dark:text-red-400 text-sm font-semibold border border-[#f5c6c7] dark:border-red-900">
              <X size={14} strokeWidth={2.5} className="flex-shrink-0" />
              {error}
            </div>
          )}
        </form>
        )}

        {/* ─── Preview Panel ─── */}
        {preview && activeTab !== 'password' && (
          <div className="sticky top-24">
            <p className="text-xs font-semibold text-[#9ea3ba] uppercase tracking-widest mb-3">Live Preview</p>
            <article className="bg-white dark:bg-[#13192e] border border-[#E8ECF8] dark:border-[#2a3460] rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(26,43,107,0.08)]">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-full overflow-hidden bg-[#F5F6FA] dark:bg-[#1c2340] border-4 border-white dark:border-[#13192e] shadow-[0_4px_12px_rgba(26,43,107,0.08)]">
                    {form.photoURL ? (
                      <img src={form.photoURL} alt={form.name || 'Member'} className="w-full h-full object-cover object-center" />
                    ) : (
                      <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[#D0021B] to-[#8B0112] text-white font-black text-lg">{previewInitials}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-[#13245a] dark:text-[#F3F6FF] leading-tight truncate" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>
                      {form.name || 'Your Name'}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#D0021B] dark:text-[#FF8E9A] truncate">{form.industry || '—'}</p>
                    {form.business && <p className="mt-0.5 text-xs text-[#667085] dark:text-[#B6C2E2] truncate">{form.business}</p>}
                  </div>
                </div>
                <div className="mt-4 h-px bg-[#E8ECF8] dark:bg-[#22304D]" />
                <p className="mt-4 text-sm leading-6 text-[#374151] dark:text-[#DCE5F8] line-clamp-3">
                  {form.bio || form.business || 'A Tamil professional building community, opportunity, and impact.'}
                </p>
                {form.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {form.tags.slice(0, 3).map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] text-[#667085] dark:text-[#B6C2E2]">{t}</span>
                    ))}
                    {form.tags.length > 3 && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] text-[#667085] dark:text-[#B6C2E2]">+{form.tags.length - 3}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-5">
                  {form.website && (
                    <div className="w-9 h-9 rounded-full grid place-items-center bg-[#F5F6FA] dark:bg-[#1c2340] text-[#9AA3BF]">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </div>
                  )}
                  {form.linkedin && (
                    <div className="w-9 h-9 rounded-full grid place-items-center bg-[#F5F6FA] dark:bg-[#1c2340] text-[#9AA3BF]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                    </div>
                  )}
                  <div className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDE8EB] text-[#D0021B] text-sm font-bold">
                    View
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </div>
            </article>
            <p className="mt-3 text-xs text-[#9ea3ba] text-center">This is how your card looks on the members directory.</p>
          </div>
        )}
      </div>
    </div>
  )
}