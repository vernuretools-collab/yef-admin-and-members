import { useState } from 'react'
import {
  Mail, Phone, Globe, MapPin,
  X, ExternalLink, ShieldCheck, Building2, Briefcase
} from 'lucide-react'

const LinkedinIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.75a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9z" />
  </svg>
)

const FacebookIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V11c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4H15.2c-1.2 0-1.6.8-1.6 1.6v2h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
  </svg>
)

export default function MemberCard({ member, palms, isMe }) {
  const [showModal, setShowModal] = useState(false)

  if (!member) return null

  const name = member.name || member.displayName || 'Member'
  const business = member.business || member.company || ''
  const industry = (member.industry && member.industry !== '—') ? member.industry : null
  const location = member.location || member.city || ''
  const email = member.email || ''
  const phone = member.phone || ''
  const website = member.website || ''
  const linkedin = member.linkedin || ''
  const facebook = member.facebook || ''
  
  // Extract bio/description and handle keyword dumps cleanly
  const rawBio = member.businessDescription || member.bio || member.description || ''
  
  // Extract tags/keywords if present
  let tags = []
  if (Array.isArray(member.tags)) {
    tags = member.tags
  } else if (typeof member.tags === 'string' && member.tags.trim()) {
    tags = member.tags.split(/[,|\n]/).map(t => t.trim()).filter(Boolean)
  } else if (typeof member.keywords === 'string' && member.keywords.trim()) {
    tags = member.keywords.split(/[,|\n]/).map(t => t.trim()).filter(Boolean)
  }

  // Get initials for fallback avatar
  const initials =
    member.avatarInitials ||
    name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    'M'

  return (
    <>
      <article
        tabIndex={0}
        onClick={() => setShowModal(true)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setShowModal(true)
          }
        }}
        aria-label={`View profile of ${name}`}
        className={`relative flex flex-col justify-between p-5 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-white dark:bg-[#13192e] cursor-pointer ${
          isMe
            ? 'border-[#1A2B6B] dark:border-[#3b4f98] shadow-[0_0_0_2px_rgba(26,43,107,0.15),0_8px_24px_rgba(26,43,107,0.12)]'
            : 'border-[#E8ECF8] dark:border-[#2a3460] shadow-[0_4px_20px_rgba(26,43,107,0.06)]'
        }`}
      >
        {/* Accent Bar at top */}
        <div className="absolute top-0 left-6 right-6 h-[3px] rounded-b-full bg-gradient-to-r from-[#1A2B6B] via-[#D0021B] to-[#1A2B6B] opacity-80" />

        {/* You badge if current user */}
        {isMe && (
          <span className="absolute top-3 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1A2B6B]/10 text-[#1A2B6B] dark:bg-white/10 dark:text-[#8899d4] text-[10px] font-extrabold uppercase tracking-wider">
            ✦ You
          </span>
        )}

        <div>
          {/* Header: Avatar + Title Info */}
          <div className="flex items-start gap-3.5 mb-4">
            {member.photoURL ? (
              <img
                src={member.photoURL}
                alt={name}
                className="w-13 h-13 w-[52px] h-[52px] rounded-2xl object-cover border-2 border-white dark:border-[#1c2340] shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-[#D0021B] to-[#900012] text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-md">
                {initials}
              </div>
            )}

            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="font-bold text-base leading-snug truncate text-[#1A2B6B] dark:text-[#DDE3F5] hover:text-[#D0021B] transition-colors">
                {name}
              </h3>
              
              {industry ? (
                <p className="text-xs font-bold text-[#D0021B] tracking-wide mt-0.5 truncate">
                  {industry}
                </p>
              ) : (
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 italic mt-0.5">
                  Member
                </p>
              )}

              {business && (
                <p className="text-xs font-medium text-gray-500 dark:text-[#8899d2] truncate mt-0.5">
                  {business}
                </p>
              )}
            </div>
          </div>

          {/* Description Body - Cleanly clamped so keyword dumps never break card layout */}
          {rawBio ? (
            <div className="mb-4">
              <p
                className="text-xs text-gray-600 dark:text-[#A4B3E2] leading-relaxed line-clamp-3 text-ellipsis overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {rawBio}
              </p>
            </div>
          ) : (
            <div className="mb-4 text-xs text-gray-400 dark:text-gray-500 italic">
              Verified YAAM Economic Forum Member
            </div>
          )}

          {/* Render tags cleanly if present (max 3) */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F6FA] dark:bg-[#1c2340] text-[#1A2B6B] dark:text-[#8899d4] border border-[#E8ECF8] dark:border-[#2a3460] truncate max-w-[120px]"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-[#1c2340]/60 text-gray-500 dark:text-gray-400">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* PALMS stats if present */}
          {palms && (
            <div className="grid grid-cols-3 gap-2 text-center mb-4 pt-2 border-t border-[#EEF0F7] dark:border-[#1c2340]">
              {[
                { label: 'Referrals', val: palms.referrals || 0 },
                { label: '1-to-1',    val: palms.oneToOne  || 0 },
                { label: 'CEU',       val: palms.ceu       || 0 },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="bg-[#F9FAFC] dark:bg-[#1c2035] rounded-xl py-2 border border-[#EEF0F7] dark:border-[#2a3460]"
                >
                  <div className="font-bold text-base leading-none text-[#1A2B6B] dark:text-[#7b95e4] tabular-nums">
                    {val}
                  </div>
                  <div className="text-[9px] text-gray-400 dark:text-[#8899d4] uppercase font-bold tracking-wider mt-1">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact icons — link clicks stay on the link and do not open the profile */}
        <div className="pt-3 border-t border-[#F0F2FA] dark:border-[#1c2340] flex items-center gap-2 mt-auto">
          <div className="flex items-center gap-1.5">
            {/* Email Icon Button */}
            {email ? (
              <a
                href={`mailto:${email}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Email: ${email}`}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-xl bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] text-[#1A2B6B] dark:text-[#8899d4] hover:bg-[#1A2B6B] hover:text-white dark:hover:bg-[#1A2B6B] dark:hover:text-white grid place-items-center transition-all duration-200 shadow-sm"
              >
                <Mail size={14} />
              </a>
            ) : (
              <div
                title="Email not provided"
                className="w-8 h-8 rounded-xl bg-gray-100/80 dark:bg-[#1c2340]/40 border border-gray-200/60 dark:border-[#2a3460]/40 text-gray-300 dark:text-gray-600 grid place-items-center cursor-not-allowed"
              >
                <Mail size={14} />
              </div>
            )}

            {/* Phone Icon Button */}
            {phone ? (
              <a
                href={`tel:${phone}`}
                title={`Phone: ${phone}`}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-xl bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] text-[#1A2B6B] dark:text-[#8899d4] hover:bg-[#1A2B6B] hover:text-white dark:hover:bg-[#1A2B6B] dark:hover:text-white grid place-items-center transition-all duration-200 shadow-sm"
              >
                <Phone size={14} />
              </a>
            ) : (
              <div
                title="Phone not provided"
                className="w-8 h-8 rounded-xl bg-gray-100/80 dark:bg-[#1c2340]/40 border border-gray-200/60 dark:border-[#2a3460]/40 text-gray-300 dark:text-gray-600 grid place-items-center cursor-not-allowed"
              >
                <Phone size={14} />
              </div>
            )}

            {/* Website Icon Button */}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Website: ${website}`}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-xl bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] text-[#1A2B6B] dark:text-[#8899d4] hover:bg-[#1A2B6B] hover:text-white dark:hover:bg-[#1A2B6B] dark:hover:text-white grid place-items-center transition-all duration-200 shadow-sm"
              >
                <Globe size={14} />
              </a>
            )}

            {/* LinkedIn Icon Button */}
            {linkedin && (
              <a
                href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                title="LinkedIn Profile"
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-xl bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] text-[#0A66C2] dark:text-[#8899d4] hover:bg-[#0A66C2] hover:text-white dark:hover:bg-[#0A66C2] dark:hover:text-white grid place-items-center transition-all duration-200 shadow-sm"
              >
                <LinkedinIcon size={14} />
              </a>
            )}
          </div>
        </div>
      </article>

      {/* Detail modal when the member card is clicked */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#13192e] rounded-3xl border border-[#E8ECF8] dark:border-[#2a3460] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header / Banner */}
            <div className="relative bg-gradient-to-r from-[#1A2B6B] to-[#2a3f8f] p-6 text-white">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-4">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#D0021B] text-white flex items-center justify-center font-bold text-xl shadow-lg">
                    {initials}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{name}</h2>
                  {industry && (
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#D0021B] text-white text-xs font-bold uppercase tracking-wider mt-1">
                      {industry}
                    </span>
                  )}
                  {business && (
                    <p className="text-sm text-gray-200 mt-1 flex items-center gap-1.5">
                      <Building2 size={13} /> {business}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-[#1A2B6B] dark:text-[#DDE3F5]">
              {/* Contact Actions Grid */}
              <div className="grid grid-cols-2 gap-3">
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] hover:border-[#1A2B6B] transition-all text-xs font-semibold text-[#1A2B6B] dark:text-[#DDE3F5]"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#1A2B6B] text-white grid place-items-center shrink-0">
                      <Mail size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">Email</p>
                      <p className="truncate font-bold">{email}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-[#1c2340]/40 border border-gray-200 dark:border-[#2a3460]/40 opacity-60 text-xs">
                    <div className="w-8 h-8 rounded-xl bg-gray-300 dark:bg-gray-700 text-gray-500 grid place-items-center shrink-0">
                      <Mail size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-normal">Email</p>
                      <p className="font-semibold text-gray-400 italic">Not provided</p>
                    </div>
                  </div>
                )}

                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] hover:border-[#1A2B6B] transition-all text-xs font-semibold text-[#1A2B6B] dark:text-[#DDE3F5]"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#1A2B6B] text-white grid place-items-center shrink-0">
                      <Phone size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">Phone</p>
                      <p className="truncate font-bold">{phone}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-[#1c2340]/40 border border-gray-200 dark:border-[#2a3460]/40 opacity-60 text-xs">
                    <div className="w-8 h-8 rounded-xl bg-gray-300 dark:bg-gray-700 text-gray-500 grid place-items-center shrink-0">
                      <Phone size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-normal">Phone</p>
                      <p className="font-semibold text-gray-400 italic">Not provided</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Extra Links: Website, LinkedIn */}
              {(website || linkedin || location) && (
                <div className="flex flex-wrap gap-4 text-xs border-y border-[#F0F2FA] dark:border-[#1c2340] py-3">
                  {location && (
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-[#8899d4]">
                      <MapPin size={14} className="text-[#D0021B]" />
                      <span>{location}</span>
                    </div>
                  )}
                  {website && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#1A2B6B] dark:text-[#8899d4] hover:underline font-semibold"
                    >
                      <Globe size={14} className="text-[#1A2B6B]" />
                      <span>Website</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                  {linkedin && (
                    <a
                      href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#0A66C2] hover:underline font-semibold"
                    >
                      <LinkedinIcon size={14} />
                      <span>LinkedIn</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}

              {/* About / Description */}
              {rawBio && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    About / Services
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-[#C9D2F2] whitespace-pre-line">
                    {rawBio}
                  </p>
                </div>
              )}

              {/* Tags / Keywords as clean pills */}
              {tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Specializations & Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#F5F6FA] dark:bg-[#1c2340] border border-[#E8ECF8] dark:border-[#2a3460] text-[#1A2B6B] dark:text-[#8899d4]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F5F6FA] dark:bg-[#1c2340] border-t border-[#E8ECF8] dark:border-[#2a3460] flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <ShieldCheck size={14} className="text-green-500" /> YAAM Verified Profile
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-full bg-[#1A2B6B] hover:bg-[#111E4F] text-white font-bold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
