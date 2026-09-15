import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

import {db} from '../data/firebase'
import { incrementSlip, addSlipHistory } from '../data/firebaseData'
import {chapters} from '../data/chapters'
import SectionHeader from '../components/SectionHeader'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  category: '',
  chapter: '',
  message: '',
}

export default function VisitMeeting() {
  const [searchParams] = useSearchParams()
  const refMemberId = searchParams.get('ref')

  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await addDoc(collection(db, 'visitRequests'), {
        ...form,
        refMemberId: refMemberId || null,
        createdAt: serverTimestamp(),
        status: 'pending',
      })

      if (refMemberId) {
        try {
          await incrementSlip(refMemberId, 'visitors', 1)
        } catch (incErr) {
          console.error('Visitor count increment failed:', incErr)
        }
        try {
          let fromName = ''
          try {
            const memberSnap = await getDoc(doc(db, 'users', refMemberId))
            if (memberSnap.exists()) {
              const d = memberSnap.data()
              fromName = d.name || d.displayName || d.fullName || ''
            }
          } catch (_) { /* name is optional */ }

          await addSlipHistory({
            type: 'visitors',
            fromUid: refMemberId,
            fromName,
            toUid: null,
            toName: '',
            amount: 0,
            details: {
              visitorName: form.name,
              company: form.company,
              telephone: form.phone,
              email: form.email,
              source: 'Member Invite',
              comments: form.message,
              chapter: form.chapter,
              category: form.category,
            },
          })
        } catch (histErr) {
          console.error('Visitor history save failed:', histErr)
        }
      }

      setSubmitted(true)
      setForm(emptyForm)
    } catch (err) {
      console.error('Failed to submit visit request:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 animate-ping opacity-30" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 grid place-items-center">
            <CheckCircle2 size={36} />
          </div>
        </div>

        <h2
          className="text-3xl font-bold text-[#1A2B6B] dark:text-[#DDE3F5] mb-3"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          Request Received!
        </h2>

        <p className="text-[#6B7280] dark:text-[#8899d4] leading-relaxed">
          Thank you,{' '}
          <strong className="text-[#1A2B6B] dark:text-[#DDE3F5]">
            {form.name || 'there'}
          </strong>
          . The chapter leadership will reach out to confirm your visit details within 24 hours.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E8ECF8] dark:bg-[#1c2340]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D0021B]" />
          <span className="text-xs font-bold text-[#1A2B6B] dark:text-[#8899d4] uppercase tracking-widest">
            Yaam Economic Forum
          </span>
        </div>
      </div>
    )
  }

  const inputCls =
    'w-full mt-1.5 px-4 py-2.5 rounded-xl border border-[#C5CCE8] dark:border-[#2a3460] bg-[#F5F6FA] dark:bg-[#1c2340] text-sm text-[#111E4F] dark:text-[#DDE3F5] placeholder:text-[#9AA3BF] focus:outline-none focus:border-[#1A2B6B] dark:focus:border-[#4a5a9a] focus:ring-2 focus:ring-[#1A2B6B]/15 transition-all'

  const labelCls =
    'block text-sm font-semibold text-[#1A2B6B] dark:text-[#8899d4]'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div>
          <SectionHeader
            eyebrow="Visit a Meeting"
            title="See YEF in action before you decide."
            subtitle="Visiting a chapter is free. You'll meet local business owners, watch referrals happen in real time, and decide if YEF is right for you."
          />

          <ul className="space-y-4 mt-8">
            {[
              {
                title: 'No commitment',
                body: 'Attending is completely free and obligation-free. Just come and observe.',
              },
              {
                title: 'See your category',
                body: 'Find out if your business category is open in the chapter you want to join.',
              },
              {
                title: 'Meet your referral partners',
                body: 'Build real relationships with business owners who can refer you consistently.',
              },
              {
                title: 'Understand the process',
                body: 'Learn exactly how referrals, testimonials, and one-to-ones work in practice.',
              },
            ].map((item, i) => (
              <li key={item.title} className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-xl grid place-items-center shrink-0 mt-0.5 font-bold text-sm text-white shadow-sm ${
                    i % 2 === 0
                      ? 'bg-[#D0021B] shadow-[0_2px_8px_rgba(208,2,27,0.25)]'
                      : 'bg-[#1A2B6B] shadow-[0_2px_8px_rgba(26,43,107,0.25)]'
                  }`}
                >
                  {i + 1}
                </div>

                <div>
                  <p className="font-bold text-sm text-[#1A2B6B] dark:text-[#DDE3F5]">
                    {item.title}
                  </p>
                  <p className="text-sm text-[#6B7280] dark:text-[#8899d4] mt-0.5 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-[#1A2B6B] to-[#111E4F] relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-[#D0021B]/10 pointer-events-none" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#8899d4] mb-1 relative">
              Yaam Economic Forum
            </p>
            <p className="text-sm text-white font-semibold relative">
              Connecting Global Economy
            </p>
            <p className="text-xs text-[#8899d4] mt-1 relative">
              Chennai, Tamil Nadu • Weekly meetings
            </p>
          </div>
        </div>

        <div>
          <form
            onSubmit={submit}
            className="bg-white dark:bg-[#13192e] rounded-3xl border border-[#C5CCE8] dark:border-[#2a3460] p-6 sm:p-8 shadow-[0_4px_24px_rgba(26,43,107,0.10)] space-y-5"
          >
            <div className="pb-4 border-b border-[#E8ECF8] dark:border-[#2a3460]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-5 rounded-full bg-[#D0021B]" />
                <h3
                  className="text-2xl font-bold text-[#1A2B6B] dark:text-[#DDE3F5]"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Request an invitation
                </h3>
              </div>

              <p className="text-xs text-[#9AA3BF] ml-3">
                Fields marked <span className="text-[#D0021B] font-bold">*</span> are required
              </p>

              {refMemberId && (
                <div className="mt-3 ml-3 inline-flex items-center px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                  Invited by a YEF member
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className={labelCls}>
                Full Name <span className="text-[#D0021B]">*</span>
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={handle}
                  placeholder="Your name"
                  className={inputCls}
                />
              </label>

              <label className={labelCls}>
                Phone <span className="text-[#D0021B]">*</span>
                <input
                  required
                  name="phone"
                  value={form.phone}
                  onChange={handle}
                  placeholder="+91 9940960100"
                  className={inputCls}
                />
              </label>
            </div>

            <label className={labelCls}>
              Email <span className="text-[#D0021B]">*</span>
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handle}
                placeholder="you@email.com"
                className={inputCls}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className={labelCls}>
                Company
                <input
                  name="company"
                  value={form.company}
                  onChange={handle}
                  placeholder="Your company"
                  className={inputCls}
                />
              </label>

              <label className={labelCls}>
                Your Category <span className="text-[#D0021B]">*</span>
                <input
                  required
                  name="category"
                  value={form.category}
                  onChange={handle}
                  placeholder="e.g. Architect"
                  className={inputCls}
                />
              </label>
            </div>

            <label className={labelCls}>
              Preferred Chapter <span className="text-[#D0021B]">*</span>
              <select
                required
                name="chapter"
                value={form.chapter}
                onChange={handle}
                className={inputCls}
              >
                <option value="">Select a chapter</option>
                {chapters.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} — {c.day} {c.time}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelCls}>
              Tell us about your business
              <textarea
                name="message"
                value={form.message}
                onChange={handle}
                rows={4}
                placeholder="Brief overview of what you do and who your ideal customer is"
                className={inputCls}
              />
            </label>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#FDE8EB] dark:bg-[#3d000840] border border-[#F5C6CC] dark:border-[#5d0012]">
                <AlertCircle size={15} className="text-[#D0021B] flex-shrink-0" />
                <p className="text-sm text-[#D0021B] font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-full bg-[#D0021B] hover:bg-[#B00218] disabled:opacity-60 text-white font-bold text-sm transition-all shadow-[0_2px_12px_rgba(208,2,27,0.30)] hover:shadow-[0_4px_16px_rgba(208,2,27,0.40)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </button>

            <p className="text-xs text-center text-[#9AA3BF]">
              We’ll respond within 24 hours to confirm your visit.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}