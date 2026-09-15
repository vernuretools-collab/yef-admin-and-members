import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, User, FolderKanban, Handshake,
  BookUser, CalendarDays, LogOut, Menu, X, Sun, Moon,
  Pencil, ChevronRight, History
} from 'lucide-react'
import yeflogo from '../../assets/yef.png'

const navItems = [
  { to: '/member/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/member/edit-profile', icon: Pencil,          label: 'My Profile' },
  { to: '/member/referrals',    icon: Handshake,       label: 'My Referrals' },
  { to: '/member/history',      icon: History,         label: 'History'       },
  { to: '/member/directory',    icon: BookUser,        label: 'Directory'    },
  { to: '/member/meetings',     icon: CalendarDays,    label: 'Meetings'     },
]

export default function MemberLayout({ toggleDark, dark }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials =
    user?.avatarInitials ||
    user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() ||
    user?.email?.[0].toUpperCase() ||
    '?'

  /* ── Sidebar inner content ─────────────────────────────────────────────── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-1 mb-8">
        <div className="flex-shrink-0 ">
          <img src={yeflogo} alt="Brand Logo" className="h-8 w-auto bg-white "/>
        </div>
        <div>
          <div className="text-[11px] text-white mt-0.5 uppercase tracking-wider">
            Member Portal
          </div>
        </div>
      </div>

      {/* ── Section label ── */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 px-4 mb-2">
        Navigation
      </p>

      {/* ── Nav Items ── */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:bg-white/8 hover:text-white/90'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active left bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#E31E24]" />
                )}
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight size={13} className="opacity-50" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User Card ── */}
      <div className="mt-6 rounded-xl bg-white/8 border border-white/10 p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#E31E24] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-[0_2px_6px_rgba(227,30,36,0.4)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="font-semibold text-sm text-white truncate leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {user?.displayName || user?.name || 'Member'}
            </div>
            <div className="text-[11px] text-white/45 truncate mt-0.5">
              {user?.business || user?.email}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#2e7d32]/25 text-white/45 text-[11px] font-semibold uppercase tracking-wide">
            Member
          </span>
          {user?.memberSince && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 text-white/45 text-[11px] font-medium">
              Since {user.memberSince}
            </span>
          )}
        </div>
      </div>

      {/* ── Logout ── */}
      <button
        onClick={handleLogout}
        className="mt-2 flex bg-[#E31E24] text-white items-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white  hover:bg-white hover:text-[#E31E24]  transition-all duration-150"
      >
        <LogOut size={15} />
        Sign out
      </button>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F5F6FA] dark:bg-[#0f1220]">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[248px] min-h-screen bg-[#1B2E6B] dark:bg-[#111830] p-5 sticky top-0 h-screen overflow-y-auto flex-shrink-0 shadow-[4px_0_24px_rgba(27,46,107,0.15)]">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#1B2E6B]/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-[248px] bg-[#1B2E6B] dark:bg-[#111830] p-5 h-full overflow-y-auto shadow-2xl animate-slide-in">
            <button
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <X size={17} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top Header ── */}
        <header className="sticky top-0 z-10 bg-white/90 dark:bg-[#161929]/90 backdrop-blur-md border-b border-[#CDD0E0] dark:border-[#313655] px-5 py-0 flex items-center justify-between gap-4 h-[60px]">

          {/* Left — hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition-colors text-[#5c607a] dark:text-[#8890b0]"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#E31E24] leading-none">
                Business Growth
              </p>
              <h1
                className="text-[17px] font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight mt-0.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Member Workspace
              </h1>
            </div>
          </div>

          {/* Right — theme toggle + user pill */}
          <div className="flex items-center gap-2">

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="w-9 h-9 rounded-xl border border-[#CDD0E0] dark:border-[#313655] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition-all text-[#5c607a] dark:text-[#8890b0] flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* User pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-[#F5F6FA] dark:bg-[#1c2035]">
              <div className="w-6 h-6 rounded-full bg-[#1B2E6B] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                {initials}
              </div>
              <span className="text-sm text-[#1a1d2e] dark:text-[#e4e6f0] font-medium max-w-[160px] truncate">
                {user?.displayName || user?.name || user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}