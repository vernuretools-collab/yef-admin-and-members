import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Sun,
  Moon,
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Users,
  TrendingUp,
  Handshake,
  Star,
} from 'lucide-react'

const FEATURES = [
  { icon: ShieldCheck, title: 'Role-based access', desc: 'Admin and member portals with separate dashboards' },
  { icon: TrendingUp, title: 'PALMS tracking', desc: 'Monitor referrals, attendance, CEU and TYFCB' },
  { icon: Handshake, title: 'Referral management', desc: 'Log slips, track conversion and business value' },
  { icon: Users, title: 'Member directory', desc: 'Connect and refer within your chapter network' },
]

export default function Login({ toggleDark, dark }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard', {
        replace: true,
      })
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password. Please try again.'
          : err.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait a moment and try again.'
          : err.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary/5 dark:from-gray-950 dark:via-gray-900 dark:to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl p-8 flex flex-col gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 dark:bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="flex items-center gap-4 relative">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
              <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
                <rect x="8" y="8" width="48" height="48" rx="16" stroke="white" strokeWidth="4" />
                <path
                  d="M18 38C22 30 28 25 36 22C40 20 45 19 50 19"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="20" cy="42" r="4" fill="white" />
                <circle cx="36" cy="25" r="4" fill="white" />
                <circle cx="50" cy="19" r="4" fill="white" />
              </svg>
            </div>
            <div>
              <div className="font-display font-black text-2xl leading-none">YEF</div>
              <div className="text-xs text-gray-400 mt-0.5 font-medium">
                 Chapter Management Platform
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
              <Star size={11} className="fill-primary" /> Trusted by chapters across India
            </div>
            <h1 className="font-display font-black text-3xl lg:text-4xl leading-tight text-gray-900 dark:text-white">
              One platform for your entire chapter.
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-3 leading-relaxed text-sm">
              Admins track performance, members manage projects and referrals. Everyone stays connected and accountable.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 relative">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                    {title}
                  </div>
                  <div className="text-xs text-gray-500 font-bold mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-auto pt-5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-700 font-bold leading-relaxed">
              Access is by invitation only. Contact your chapter admin if you haven't received your login credentials.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl p-8 flex flex-col justify-center gap-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-black text-3xl leading-tight">Welcome back</h2>
              <p className="text-gray-700 font-bold text-sm mt-1">Sign in to your YEF account</p>
            </div>
            <button
              onClick={toggleDark}
              className="p-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-500 flex-shrink-0"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-gray-400"
                type="email"
                placeholder="you@chapter.com"
                value={form.email}
                onChange={e => {
                  setForm(f => ({ ...f, email: e.target.value }))
                  setError('')
                }}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-gray-400"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => {
                    setForm(f => ({ ...f, password: e.target.value }))
                    setError('')
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} /> Sign in to YEF
                </>
              )}
            </button>
          </form>

          <div className="text-center space-y-1">
            <p className="text-center text-sm text-gray-600 font-bold leading-relaxed">
              Need access? Contact your chapter admin for an account.
            </p>
            <p className="text-xs text-gray-500 font-bold leading-relaxed">
              Forgot your password? Contact your chapter admin.
            </p>
            <p className="text-xs text-gray-500 font-bold leading-relaxed dark:text-gray-600">
              YEF Chapter Management
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}