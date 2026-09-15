import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Users, X, ArrowRight, BookOpen,
  BriefcaseBusiness, GraduationCap, BadgeInfo,
  UserRoundSearch, MessageSquareQuote, UserPlus2, Loader2,
} from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../data/firebase'
import MemberCard from '../components/MemberCard'
import SectionHeader from '../components/SectionHeader'

const benefits = [
  { title: 'Full member directory access', body: 'Build the professional network your career deserves.', icon: UserRoundSearch },
  { title: 'Priority event access', body: 'Early registration and discounted tickets for all YAAM events.', icon: BadgeInfo },
  { title: 'Mentorship programme', body: 'Matched mentorship with Tamil professionals in your field.', icon: GraduationCap },
  { title: 'Publish on the YAAM blog', body: 'Share your professional insights and industry knowledge as a guest contributor.', icon: BookOpen },
]

const journeySteps = [
  { step: '1', title: 'Basic details', body: 'Name, location, and contact email. Your email is never shared publicly.' },
  { step: '2', title: 'Professional background', body: 'Industry, current role, and years of experience. Helps others find relevant peers.' },
  { step: '3', title: 'Tamil identity & language', body: 'Your Tamil background, regional connection, and preferred language for the platform.' },
  { step: '4', title: 'Community preferences', body: 'Which industry communities to join, interest in mentoring, and event preferences.' },
  { step: '5', title: 'Your profile is live', body: 'Review, publish, and receive your welcome email. Start connecting immediately.' },
]

const memberPaths = [
  {
    title: 'I have experience to share',
    body: 'Mentor a Tamil professional in your field. One session a month. A career changed forever.',
    cta: 'Become a mentor',
    to: '/visit-meeting',
    icon: MessageSquareQuote,
  },
  {
    title: 'I am building my path',
    body: 'Find a Tamil professional who has walked the road you are on. Learn from someone who truly understands.',
    cta: 'Find a mentor',
    to: '/visit-meeting',
    icon: BriefcaseBusiness,
  },
]

const stats = [
  { label: 'Members', value: '4,800+' },
  { label: 'Countries', value: '38' },
  { label: 'Industry communities', value: 'Multi-sector' },
]

export default function Members() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedRole, setSelectedRole] = useState('mentee')
  const [form, setForm] = useState({
    name: '',
    email: '',
    location: '',
    industry: '',
    mentorPreference: '',
    language: 'Tamil + English',
  })

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      snap => {
        const data = snap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.role === 'member' && u.status === 'active')
        setMembers(data)
        setLoading(false)
        setError('')
      },
      err => {
        console.error(err)
        setError('Failed to load members.')
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const categories = useMemo(() => {
    const cats = members.map(m => m.industry).filter(Boolean)
    return ['All', ...new Set(cats)]
  }, [members])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return members.filter(m => {
      const matchCat = activeCategory === 'All' || m.industry === activeCategory
      const matchQ =
        !q ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.industry || '').toLowerCase().includes(q) ||
        (m.business || '').toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [members, activeCategory, searchQuery])

  const handleSubmit = e => {
    e.preventDefault()
    alert('Membership form UI ready. Connect this to your Firestore / email flow.')
  }

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-8 sm:pb-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDE8EB] dark:bg-[#3d0008]/50 text-[#D0021B] text-xs font-bold uppercase tracking-[0.12em] mb-5 sm:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D0021B] animate-pulse" />
              Members
            </div>
            <h1
              className="text-3xl sm:text-5xl xl:text-6xl font-bold leading-[1.1] text-[#1A2B6B] dark:text-[#DDE3F5]"
              style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
            >
              Find your Tamil professional peer.
            </h1>
            <p className="mt-4 sm:mt-6 text-gray-900 dark:text-[#8899d4] text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl">
              Connect, collaborate and grow together.
            </p>
            <div className="flex flex-col xs:flex-row flex-wrap gap-3 mt-6 sm:mt-8">
              <Link
                to="/visit-meeting"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full bg-[#D0021B] hover:bg-[#B00218] text-white font-bold text-sm transition-all"
              >
                Join the YAAM Economic Forum <ArrowRight size={15} />
              </Link>
              <a
                href="#directory"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full border-2 border-[#1A2B6B] text-[#1A2B6B] dark:text-[#8899d4] font-bold text-sm hover:bg-[#1A2B6B] hover:text-white transition-all"
              >
                Browse directory
              </a>
            </div>
          </div>

          {/* Stats card */}
          <div className="rounded-3xl  border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] p-5 sm:p-6 shadow-[0_8px_32px_rgba(26,43,107,0.12)]">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <span className="w-1 h-4 rounded-full bg-[#D0021B]" />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D0021B]">Member benefits</p>
            </div>
            <p className="text-sm text-gray-700 dark:text-[#C9D2F2] italic leading-relaxed">
              YAAM membership is not a subscription to a platform. It is an invitation into a community of people who will genuinely invest in your success.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-6">
              {stats.map(item => (
                <div key={item.label} className="rounded-2xl bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] p-3 sm:p-4 text-center">
                  <p className="text-base sm:text-lg font-bold text-[#1A2B6B] dark:text-[#DDE3F5] leading-tight">{item.value}</p>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#6B7280] dark:text-[#8899d4] mt-1 leading-tight">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Member Benefits ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDE8EB] dark:bg-[#3d0008]/50 text-[#D0021B] text-xs font-bold uppercase tracking-[0.12em] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D0021B]" />
            What you get
          </div>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1A2B6B] dark:text-[#DDE3F5]"
            style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
          >
            Everything included with membership
          </h2>
          <p className="mt-3 text-gray-700 dark:text-[#8899d4] text-sm sm:text-base max-w-2xl">
            Access the full network, mentorship programmes, exclusive events, and a platform to share your voice — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {benefits.map(({ title, body, icon: Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#E8ECF8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] p-5 sm:p-6 flex flex-col gap-3 shadow-[0_2px_8px_rgba(26,43,107,0.06)] hover:shadow-[0_4px_16px_rgba(26,43,107,0.12)] transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-[#1A2B6B]/10 dark:bg-white/5 text-[#1A2B6B] dark:text-[#8899d4] grid place-items-center shrink-0">
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-sm text-[#1A2B6B] dark:text-[#DDE3F5] leading-snug">{title}</h3>
              <p className="text-xs text-gray-600 dark:text-[#8899d2] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Directory ─── */}
      <section className="bg-[#E8ECF8] dark:bg-[#0f1628] py-12 sm:py-20" id="directory">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeader
            eyebrow="Member Directory"
            title="Meet Our Members"
            subtitle="Experienced professionals. Proven track record. Dedicated to your success."
            center
          />

          <div className="relative mt-6 sm:mt-8 mb-4 sm:mb-5">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA3BF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, industry, company, or location…"
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] text-sm text-[#111E4F] dark:text-[#DDE3F5] placeholder:text-[#9AA3BF] focus:outline-none focus:border-[#1A2B6B] focus:ring-2 focus:ring-[#1A2B6B]/15 transition-all shadow-[0_1px_3px_rgba(26,43,107,0.07)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#E8ECF8] dark:bg-[#1c2340] flex items-center justify-center text-[#6B7280] hover:text-[#D0021B] transition-colors"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-150 ${
                    activeCategory === cat
                      ? 'bg-[#1A2B6B] text-white border-[#1A2B6B] shadow-[0_2px_8px_rgba(26,43,107,0.25)]'
                      : 'bg-white dark:bg-[#13192e] border-[#C5CCE8] dark:border-[#2a3460] text-[#6B7280] dark:text-[#8899d4] hover:border-[#1A2B6B] hover:text-[#1A2B6B] dark:hover:text-[#DDE3F5] hover:bg-[#E8ECF8] dark:hover:bg-[#1c2340]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-4 sm:mb-5 gap-3 flex-wrap">
            <p className="text-sm text-[#9AA3BF] font-medium">
              <span className="text-[#1A2B6B] dark:text-[#DDE3F5] font-bold">{filtered.length}</span> member{filtered.length !== 1 ? 's' : ''} found
            </p>
            {(searchQuery || activeCategory !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All') }}
                className="text-xs font-semibold text-[#D0021B] hover:underline transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="animate-spin text-[#1A2B6B]" />
            </div>
          ) : error ? (
            <div className="py-20 text-center text-[#6B7280]">{error}</div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filtered.map(m => (
                <MemberCard key={m.uid} member={m} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 sm:py-20 bg-white dark:bg-[#13192e] rounded-2xl border border-[#C5CCE8] dark:border-[#2a3460] px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#E8ECF8] dark:bg-[#1c2340] flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-[#1A2B6B] dark:text-[#8899d4] opacity-40" />
              </div>
              <p className="font-semibold text-[#6B7280] dark:text-[#8899d4]">No members found.</p>
              <p className="text-xs text-[#9AA3BF] mt-1">Try a different search or category.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All') }}
                className="mt-4 text-sm font-semibold text-[#D0021B] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Join / Membership Form ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D0021B] mb-3">
            Become a member
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1A2B6B] dark:text-[#DDE3F5]">
            Join the YAAM Economic Forum
          </h2>
          <p className="mt-3 text-gray-700 dark:text-[#8899d4] text-sm sm:text-base">
            Your profile helps other Tamil professionals find and connect with you.
          </p>
        </div>

        {/* Journey steps — scrollable on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mt-8">
          {journeySteps.map(({ step, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] p-5"
            >
              <div className="w-10 h-10 rounded-full bg-[#1A2B6B] text-white grid place-items-center font-bold shrink-0">
                {step}
              </div>
              <h3 className="mt-4 font-bold text-sm sm:text-base text-[#1A2B6B] dark:text-[#DDE3F5]">{title}</h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-700 dark:text-[#8899d2] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Form + Mentor/Mentee — stack on mobile, side-by-side on xl */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Form */}
          <div className="xl:col-span-3 rounded-3xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] p-5 sm:p-8 shadow-[0_8px_32px_rgba(26,43,107,0.10)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D0021B] mb-2">
                  Membership form
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#1A2B6B] dark:text-[#DDE3F5]">
                  Join the community
                </h3>
              </div>

              <div className="inline-flex items-center rounded-full bg-[#F5F6FA] dark:bg-[#1c2340] p-1 border border-[#E8ECF8] dark:border-[#2a3460] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedRole('mentor')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedRole === 'mentor'
                      ? 'bg-[#1A2B6B] text-white'
                      : 'text-[#6B7280] dark:text-[#8899d4]'
                  }`}
                >
                  Mentor
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('mentee')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedRole === 'mentee'
                      ? 'bg-[#1A2B6B] text-white'
                      : 'text-[#6B7280] dark:text-[#8899d4]'
                  }`}
                >
                  Mentee
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A2B6B] dark:text-[#DDE3F5] mb-2">Full name</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] text-sm text-[#111E4F] dark:text-[#DDE3F5] focus:outline-none focus:ring-2 focus:ring-[#1A2B6B]/15 focus:border-[#1A2B6B]"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A2B6B] dark:text-[#DDE3F5] mb-2">Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] text-sm text-[#111E4F] dark:text-[#DDE3F5] focus:outline-none focus:ring-2 focus:ring-[#1A2B6B]/15 focus:border-[#1A2B6B]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A2B6B] dark:text-[#DDE3F5] mb-2">Location</label>
                <input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] text-sm text-[#111E4F] dark:text-[#DDE3F5] focus:outline-none focus:ring-2 focus:ring-[#1A2B6B]/15 focus:border-[#1A2B6B]"
                  placeholder="Chennai, London, Toronto…"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A2B6B] dark:text-[#DDE3F5] mb-2">Industry</label>
                <input
                  value={form.industry}
                  onChange={e => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] text-sm text-[#111E4F] dark:text-[#DDE3F5] focus:outline-none focus:ring-2 focus:ring-[#1A2B6B]/15 focus:border-[#1A2B6B]"
                  placeholder="Finance, Tech, Law…"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-semibold text-[#1A2B6B] dark:text-[#DDE3F5] mb-2">Mentor preference</label>
                <select
                  value={form.mentorPreference}
                  onChange={e => setForm({ ...form, mentorPreference: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] text-sm text-[#111E4F] dark:text-[#DDE3F5] focus:outline-none focus:ring-2 focus:ring-[#1A2B6B]/15 focus:border-[#1A2B6B]"
                >
                  <option value="">Select preference</option>
                  <option value="finance">Finance</option>
                  <option value="business">Business</option>
                  <option value="technology">Technology</option>
                  <option value="law">Law</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="policy">Public policy</option>
                  <option value="open">Open to any relevant mentor</option>
                </select>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-semibold text-[#1A2B6B] dark:text-[#DDE3F5] mb-2">Preferred language</label>
                <select
                  value={form.language}
                  onChange={e => setForm({ ...form, language: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] text-sm text-[#111E4F] dark:text-[#DDE3F5] focus:outline-none focus:ring-2 focus:ring-[#1A2B6B]/15 focus:border-[#1A2B6B]"
                >
                  <option>Tamil + English</option>
                  <option>Tamil</option>
                  <option>English</option>
                </select>
              </div>

              <div className="col-span-1 sm:col-span-2 pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#D0021B] hover:bg-[#B00218] text-white font-bold text-sm transition-all"
                >
                  <UserPlus2 size={16} /> Submit membership form
                </button>
              </div>
            </form>
          </div>

          {/* Mentor / Mentee paths */}
          <div className="xl:col-span-2 rounded-3xl border border-[#C5CCE8] dark:border-[#2a3460] bg-white dark:bg-[#13192e] p-5 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded-full bg-[#D0021B]" />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D0021B]">Mentor / mentee</p>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-1 gap-4">
              {memberPaths.map(({ title, body, cta, to, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-[#E8ECF8] dark:border-[#2a3460] bg-[#F5F6FA] dark:bg-[#1c2340] p-5"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#1A2B6B]/10 dark:bg-white/5 text-[#1A2B6B] dark:text-[#8899d4] grid place-items-center mb-3">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-[#1A2B6B] dark:text-[#DDE3F5]">{title}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-gray-700 dark:text-[#C9D2F2] leading-relaxed">{body}</p>
                  <Link to={to} className="inline-flex mt-4 items-center gap-2 text-sm font-bold text-[#D0021B] hover:underline">
                    {cta} <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-5 sm:mt-6 rounded-2xl bg-[#FDE8EB] dark:bg-[#3d0008]/40 border border-[#F7C7D0] dark:border-[#4d1020] p-4 sm:p-5">
              <p className="text-sm font-semibold text-[#1A2B6B] dark:text-[#DDE3F5]">
                Your email is never shared publicly.
              </p>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-[#C9D2F2] mt-2">
                We use your details only to help Tamil professionals find the right peers, mentors, and communities.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}