import { useState, useEffect } from 'react'
import { db, auth } from '../../data/firebase'
import {
  collection, getDocs, doc,
  setDoc, updateDoc, addDoc, serverTimestamp
} from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import {
  Settings, UserPlus, Bell, Shield,
  Save, X, Check, Loader2, CheckCircle2
} from 'lucide-react'

/* ─── Shared tokens ──────────────────────────────────────────────────────── */
const card     = 'bg-white dark:bg-[#161929] rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_1px_3px_rgba(27,46,107,0.07)]'
const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-[#F9FAFC] dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm focus:outline-none focus:border-[#1B2E6B] focus:ring-2 focus:ring-[#1B2E6B]/15 transition-all placeholder:text-[#9ea3ba]'
const labelCls = 'block text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] mb-1.5'

/* ─── Section header helper ──────────────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, title, sub, accentBg = 'bg-[#dce1f5] dark:bg-[#1e254a]', accentText = 'text-[#1B2E6B] dark:text-[#7b95e4]' }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accentBg}`}>
      <Icon size={17} className={accentText} strokeWidth={2} />
    </div>
    <div>
      <h2
        className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {title}
      </h2>
      {sub && <p className="text-xs text-[#9ea3ba] mt-0.5">{sub}</p>}
    </div>
  </div>
)

const emptyInvite = { name: '', email: '', business: '', industry: '', password: '' }

const CHAPTER_FIELDS = [
  { label: 'Chapter name',                       key: 'chapterName',    type: 'text'   },
  { label: 'Weekly meeting day',                 key: 'meetingDay',     type: 'text'   },
  { label: 'Meeting time',                       key: 'meetingTime',    type: 'text'   },
  { label: 'Meeting venue',                      key: 'meetingVenue',   type: 'text'   },
  { label: 'Monthly referral goal (per member)', key: 'referralGoal',   type: 'number' },
  { label: 'Attendance target (%)',              key: 'attendanceGoal', type: 'number' },
]

export default function AdminSettings() {
  const [members,        setMembers]        = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [chapterSettings, setChapterSettings] = useState({
    chapterName:    'Chennai Sunrise Chapter',
    meetingDay:     'Thursday',
    meetingTime:    '07:30 AM',
    meetingVenue:   'Hilton Chennai, Hall B',
    referralGoal:   3,
    attendanceGoal: 90,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved,  setSettingsSaved]  = useState(false)

  const [showInvite,  setShowInvite]  = useState(false)
  const [invite,      setInvite]      = useState(emptyInvite)
  const [inviteError, setInviteError] = useState('')
  const [inviting,    setInviting]    = useState(false)
  const [inviteSent,  setInviteSent]  = useState(false)

  const [notifications, setNotifications] = useState([
    { id: 'new_referral',   label: 'New referral logged',            sub: 'Notify admin when a member logs a referral slip',   enabled: true  },
    { id: 'proj_complete',  label: 'Project completed',              sub: 'Alert when a member marks a project as complete',   enabled: true  },
    { id: 'low_attendance', label: 'Member attendance below target', sub: 'Weekly digest for members under 80% attendance',   enabled: false },
    { id: 'monthly_report', label: 'Monthly chapter summary',        sub: 'Auto-send PALMS report to all members on the 1st', enabled: false },
  ])

  useEffect(() => {
    const load = async () => {
      try {
        const settingsSnap = await getDocs(collection(db, 'settings'))
        if (!settingsSnap.empty) {
          const data = settingsSnap.docs[0].data()
          setChapterSettings(s => ({ ...s, ...data }))
        }
        const snap = await getDocs(collection(db, 'users'))
        setMembers(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.role === 'member')
        )
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoadingMembers(false)
      }
    }
    load()
  }, [])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await setDoc(doc(db, 'settings', 'chapter'), {
        ...chapterSettings,
        updatedAt: serverTimestamp(),
      })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err) 
    } finally {
      setSavingSettings(false)
    }
  }

  const handleInvite = async () => {
    if (!invite.name.trim())         return setInviteError('Name is required')
    if (!invite.email.includes('@')) return setInviteError('Valid email required')
    if (!invite.business.trim())     return setInviteError('Business name is required')
    if (!invite.password || invite.password.length < 6)
                                     return setInviteError('Password must be at least 6 characters')
    setInviting(true)
    setInviteError('')
    try {
      const credential = await createUserWithEmailAndPassword(auth, invite.email, invite.password)
      const uid = credential.user.uid

      await setDoc(doc(db, 'users', uid), {
        uid,
        email:          invite.email,
        name:           invite.name.trim(),
        business:       invite.business.trim(),
        industry:       invite.industry.trim(),
        role:           'member',
        status:         'active',
        memberSince:    new Date().getFullYear().toString(),
        avatarInitials: invite.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        attendanceRate: 0,
        ceuPoints:      0,
        createdAt:      serverTimestamp(),
      })

      await setDoc(doc(db, 'palms', uid), {
        uid, referrals: 0, attendance: 0, oneToOne: 0, tyfcb: 0, ceu: 0,
      })

      setMembers(prev => [...prev, {
        uid, email: invite.email, name: invite.name,
        business: invite.business, status: 'active',
        avatarInitials: invite.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      }])

      setInviteSent(true)
      setTimeout(() => {
        setInviteSent(false)
        setShowInvite(false)
        setInvite(emptyInvite)
      }, 2500)
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'This email is already registered.'
        : err.code === 'auth/invalid-email'       ? 'Invalid email address.'
        : 'Failed to create account. Please try again.'
      setInviteError(msg)
      console.error(err)
    } finally {
      setInviting(false)
    }
  }

  const toggleMemberStatus = async (uid, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus })
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, status: newStatus } : m))
    } catch (err) {
      console.error('Failed to update member status:', err)
    }
  }

  const toggleNotification = (id) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n))

  return (
    <div className="flex flex-col gap-6 max-w-4xl">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.10em] text-[#E31E24] mb-1">
          Admin Panel
        </p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Settings
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          Manage chapter configuration and member access
        </p>
      </div>

      {/* ── Chapter Configuration ────────────────────────────────────────── */}
      <div className={`${card} p-6`}>
        <SectionHeader
          icon={Settings}
          title="Chapter Configuration"
          sub="Saved to Firestore — applies across the app"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CHAPTER_FIELDS.map(({ label, key, type }) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input
                className={inputCls}
                type={type}
                value={chapterSettings[key]}
                onChange={e => setChapterSettings(s => ({
                  ...s,
                  [key]: type === 'number' ? Number(e.target.value) : e.target.value,
                }))}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:shadow-[0_4px_12px_rgba(27,46,107,0.35)] hover:-translate-y-0.5 duration-150 disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
          >
            {savingSettings
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><Save size={14} strokeWidth={2.5} /> Save Settings</>
            }
          </button>

          {settingsSaved && (
            <span className="flex items-center gap-1.5 text-[#2e7d32] dark:text-green-400 text-sm font-semibold animate-fade-in">
              <CheckCircle2 size={15} /> Saved to Firestore ✓
            </span>
          )}
        </div>
      </div>

      {/* ── Invite New Member ────────────────────────────────────────────── */}
      <div className={`${card} p-6`}>
        <div className="flex items-start justify-between mb-5">
          <SectionHeader
            icon={UserPlus}
            title="Invite New Member"
            sub="Creates Member profile"
          />
          <button
            onClick={() => { setShowInvite(v => !v); setInviteError(''); setInvite(emptyInvite) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all duration-150 flex-shrink-0 mt-0.5 ${
              showInvite
                ? 'border-[#fce8e8] dark:border-red-800 text-[#E31E24] hover:bg-[#fce8e8] dark:hover:bg-red-900/20'
                : 'border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30]'
            }`}
          >
            {showInvite
              ? <><X size={13} strokeWidth={2.5} /> Cancel</>
              : <><UserPlus size={13} strokeWidth={2.5} /> New Member</>
            }
          </button>
        </div>

        {showInvite && (
          <div className="flex flex-col gap-4">

           
            {inviteError && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 border border-[#f5c6c7] dark:border-red-900 text-[#E31E24] dark:text-red-400 text-sm font-medium">
                <X size={14} className="mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                {inviteError}
              </div>
            )}

          
            {inviteSent && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#e8f5e9] dark:bg-green-900/20 border border-[#c8e6c9] dark:border-green-900 text-[#2e7d32] dark:text-green-400 text-sm font-semibold">
                <CheckCircle2 size={15} /> Member account created successfully!
              </div>
            )}

         
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name <span className="text-[#E31E24]">*</span></label>
                <input
                  className={inputCls}
                  placeholder="e.g. Ravi Shankar"
                  value={invite.name}
                  onChange={e => setInvite(i => ({ ...i, name: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Email Address <span className="text-[#E31E24]">*</span></label>
                <input
                  className={inputCls}
                  type="email"
                  placeholder="ravi@business.com"
                  value={invite.email}
                  onChange={e => setInvite(i => ({ ...i, email: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Business Name <span className="text-[#E31E24]">*</span></label>
                <input
                  className={inputCls}
                  placeholder="e.g. Shankar IT Services"
                  value={invite.business}
                  onChange={e => setInvite(i => ({ ...i, business: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Technology"
                  value={invite.industry}
                  onChange={e => setInvite(i => ({ ...i, industry: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Password <span className="text-[#E31E24]">*</span>
                  <span className="ml-2 text-xs text-[#9ea3ba] font-normal">
                   
                  </span>
                </label>
                <input
                  className={inputCls} 
                  type="password"
                  placeholder="Min. 6 characters"
                  value={invite.password}
                  onChange={e => setInvite(i => ({ ...i, password: e.target.value }))}
                />
              </div>
            </div>

            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#111d47] text-white text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(27,46,107,0.25)] hover:-translate-y-0.5 duration-150 w-fit disabled:opacity-60 disabled:translate-y-0"
            >
              {inviting
                ? <><Loader2 size={14} className="animate-spin" /> Creating account…</>
                : <><UserPlus size={14} strokeWidth={2.5} /> Create Member Account</>
              }
            </button>
          </div>
        )}
      </div>

      {/* ── Member Access Control ────────────────────────────────────────── */}
      <div className={`${card} p-6`}>
        <SectionHeader
          icon={Shield}
          title="Member Access Control"
          sub=""
        />

        {loadingMembers ? (
          <div className="flex items-center gap-3 py-6 justify-center text-[#9ea3ba]">
            <Loader2 size={19} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
            <span className="text-sm font-medium">Loading members…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {members.map(m => {
              const isActive = m.status === 'active'
              const initials =
                m.avatarInitials ||
                m.name?.split(' ').map(n => n[0]).join('').slice(0, 2)

              return (
                <div
                  key={m.uid}
                  className="flex items-center justify-between gap-4 bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl p-3.5 hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition-colors duration-150"
                >
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1B2E6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight">
                        {m.name}
                      </div>
                      <div className="text-xs text-[#9ea3ba] mt-0.5 truncate max-w-[240px]">
                        {m.email} · {m.business}
                      </div>
                    </div>
                  </div>

                  {/* Status + toggle */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                      isActive
                        ? 'bg-[#e8f5e9] text-[#2e7d32] dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-[#fce8e8] text-[#E31E24] dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {m.status}
                    </span>
                    <button
                      onClick={() => toggleMemberStatus(m.uid, m.status)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150 ${
                        isActive
                          ? 'border-[#fce8e8] dark:border-red-800 text-[#E31E24] hover:bg-[#fce8e8] dark:hover:bg-red-900/20'
                          : 'border-[#c8e6c9] dark:border-green-800 text-[#2e7d32] hover:bg-[#e8f5e9] dark:hover:bg-green-900/20'
                      }`}
                    >
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Notification Preferences ─────────────────────────────────────── */}
      {/* <div className={`${card} p-6`}>
        <SectionHeader
          icon={Bell}
          title="Notification Preferences"
          sub="Control which events trigger admin notifications"
        />

        <div className="flex flex-col gap-2.5">
          {notifications.map(({ id, label, sub, enabled }) => (
            <div
              key={id}
              className="flex items-center justify-between gap-4 bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl px-4 py-3.5 hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition-colors duration-150"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight">
                  {label}
                </div>
                <div className="text-xs text-[#9ea3ba] mt-0.5">{sub}</div>
              </div>

             
              <button
                onClick={() => toggleNotification(id)}
                aria-label={`Toggle ${label}`}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1B2E6B]/30 ${
                  enabled
                    ? 'bg-[#1B2E6B]'
                    : 'bg-[#CDD0E0] dark:bg-[#313655]'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div> */}

    </div>
  )
}