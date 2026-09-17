import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Search } from 'lucide-react'

export const inputCls = `w-full px-3.5 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655]
  bg-white dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0]
  placeholder:text-[#9ea3ba] text-sm focus:outline-none
  focus:ring-2 focus:ring-[#1B2E6B]/30 dark:focus:ring-[#7b95e4]/30
  focus:border-[#1B2E6B] dark:focus:border-[#7b95e4] transition`

export const labelCls =
  'block text-xs font-semibold text-[#5c607a] dark:text-[#8890b0] mb-1.5 uppercase tracking-wide'

export function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-[#CDD0E0] dark:border-[#313655]">
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all
            ${i !== 0 ? 'border-l border-[#CDD0E0] dark:border-[#313655]' : ''}
            ${
              value === opt
                ? 'bg-[#1B2E6B] text-white dark:bg-[#7b95e4] dark:text-[#161929]'
                : 'bg-white dark:bg-[#1c2035] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#252a45]'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

const STRENGTH_LEVELS = [
  { label: 'Very Low', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
  { label: 'Low', color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  { label: 'Very High', color: '#E31E24', bg: 'rgba(227,30,36,0.10)' },
]

export function HeatBar({ value, onChange }) {
  const active = STRENGTH_LEVELS[value] || STRENGTH_LEVELS[0]
  return (
    <div
      className="rounded-2xl p-4 transition-all duration-500"
      style={{ backgroundColor: active.bg, border: `1.5px solid ${active.color}30` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[#5c607a] dark:text-[#8890b0]">
          How strong is this referral?
        </span>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all duration-300"
          style={{ color: active.color, backgroundColor: active.bg, border: `1px solid ${active.color}40` }}
        >
          {active.label}
        </span>
      </div>
      <div className="flex gap-1.5">
        {STRENGTH_LEVELS.map((level, i) => {
          const isSelected = value === i
          const isFilled = i <= value
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className="flex-1 h-2 rounded-full transition-all duration-300 focus:outline-none"
              style={{
                backgroundColor: isFilled ? level.color : 'rgba(200,204,220,0.25)',
                boxShadow: isSelected ? `0 0 8px 2px ${level.color}66` : 'none',
                transform: isSelected ? 'scaleY(1.5)' : 'scaleY(1)',
              }}
            />
          )
        })}
      </div>
      <div className="flex mt-3">
        {STRENGTH_LEVELS.map((level, i) => {
          const isSelected = value === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className="flex-1 flex flex-col items-center gap-1.5 focus:outline-none"
            >
              <div
                style={{
                  width: isSelected ? 10 : 7,
                  height: isSelected ? 10 : 7,
                  borderRadius: '50%',
                  backgroundColor: isSelected ? level.color : 'rgba(200,204,220,0.4)',
                  boxShadow: isSelected ? `0 0 6px ${level.color}66` : 'none',
                }}
              />
              <span
                className="text-[10px] font-semibold leading-tight text-center whitespace-nowrap"
                style={{
                  color: isSelected ? level.color : '#9ea3ba',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {level.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SearchField({
  placeholder,
  value,
  onChange,
  options = [],
  onSelectOption,
  noResultsText = 'No members found',
}) {
  const [open, setOpen] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const wrapRef = useRef(null)
  const searchInputRef = useRef(null)

  const mainList = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options.slice(0, 60)
    return options.filter(o => (o.label || o).toLowerCase().includes(q)).slice(0, 60)
  }, [options, value])

  const searchList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return options.slice(0, 60)
    return options.filter(o => (o.label || o).toLowerCase().includes(q)).slice(0, 60)
  }, [options, searchQuery])

  const listToShow = searchMode ? searchList : mainList

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setSearchMode(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    setHighlight(listToShow.length ? 0 : -1)
  }, [searchQuery, value, listToShow.length])

  useEffect(() => {
    if (searchMode && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 20)
    }
  }, [searchMode])

  const pick = (opt) => {
    const label = typeof opt === 'string' ? opt : (opt.label || '')
    onChange(label)
    onSelectOption?.(opt)
    setOpen(false)
    setSearchMode(false)
    setSearchQuery('')
  }

  const handleSearchBtnClick = (e) => {
    e.stopPropagation()
    setSearchMode(true)
    setSearchQuery('')
    setOpen(true)
  }

  const highlightMatch = (label, query) => {
    if (!query) return <span>{label}</span>
    const idx = label.toLowerCase().indexOf(query.toLowerCase())
    if (idx < 0) return <span>{label}</span>
    return (
      <span>
        {label.slice(0, idx)}
        <mark className="bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4] rounded px-0.5 not-italic font-semibold">
          {label.slice(idx, idx + query.length)}
        </mark>
        {label.slice(idx + query.length)}
      </span>
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); setSearchMode(false); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) setOpen(true)
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, listToShow.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
            if (e.key === 'Enter' && listToShow[highlight]) { e.preventDefault(); pick(listToShow[highlight]) }
            if (e.key === 'Escape') { setOpen(false); setSearchMode(false) }
          }}
          className={inputCls + ' pr-10'}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={handleSearchBtnClick}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg text-[#9ea3ba] hover:text-[#1B2E6B] dark:hover:text-[#7b95e4] hover:bg-[#EEF0F7] dark:hover:bg-[#252a45] transition"
          title="Search members"
        >
          <Search size={14} strokeWidth={2.2} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[999] rounded-xl border border-[#CDD0E0] dark:border-[#313655] bg-white dark:bg-[#161929] shadow-[0_16px_40px_rgba(0,0,0,0.13)] overflow-hidden">
          {searchMode && (
            <div className="px-3 pt-3 pb-2 border-b border-[#EEF0F7] dark:border-[#313655]">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ea3ba] pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search members…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setHighlight(0) }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, listToShow.length - 1)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
                    if (e.key === 'Enter' && listToShow[highlight]) { e.preventDefault(); pick(listToShow[highlight]) }
                    if (e.key === 'Escape') { setSearchMode(false); setSearchQuery('') }
                  }}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#CDD0E0] dark:border-[#313655] bg-[#F9FAFC] dark:bg-[#1c2035] text-[#1a1d2e] dark:text-[#e4e6f0] text-sm placeholder:text-[#9ea3ba] focus:outline-none focus:ring-2 focus:ring-[#1B2E6B]/20 dark:focus:ring-[#7b95e4]/20 focus:border-[#1B2E6B] dark:focus:border-[#7b95e4] transition"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9ea3ba]">
              {searchMode && searchQuery
                ? `${listToShow.length} result${listToShow.length !== 1 ? 's' : ''}`
                : `All Members (${options.length})`}
            </span>
            {!searchMode && (
              <button
                type="button"
                onMouseDown={handleSearchBtnClick}
                className="text-[10px] font-semibold text-[#1B2E6B] dark:text-[#7b95e4] hover:underline"
              >
                Search
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-auto py-1">
            {listToShow.length > 0 ? (
              listToShow.map((opt, idx) => {
                const label = typeof opt === 'string' ? opt : (opt.label || '')
                const activeQuery = searchMode ? searchQuery : value
                return (
                  <button
                    key={`${label}-${idx}`}
                    type="button"
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(opt)}
                    className={`w-full text-left px-3.5 py-2 text-sm transition flex items-center gap-2.5 ${
                      highlight === idx
                        ? 'bg-[#EEF0F7] dark:bg-[#252a45] text-[#1a1d2e] dark:text-[#e4e6f0]'
                        : 'text-[#5c607a] dark:text-[#8890b0] hover:bg-[#F9FAFC] dark:hover:bg-[#1c2035]'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4] text-[10px] font-bold flex items-center justify-center flex-shrink-0 uppercase select-none">
                      {label.charAt(0)}
                    </span>
                    {highlightMatch(label, activeQuery)}
                  </button>
                )
              })
            ) : (
              <div className="px-3.5 py-4 text-sm text-[#9ea3ba] text-center">{noResultsText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function FormActions({ onConfirm, onCancel, disabled, confirmLabel = 'Confirm' }) {
  return (
    <div className="flex gap-3 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] text-sm font-semibold text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#252a45] transition"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="flex-1 py-2.5 rounded-xl bg-[#1B2E6B] hover:bg-[#152458] dark:bg-[#7b95e4] dark:hover:bg-[#6a82d0] text-sm font-semibold text-white dark:text-[#161929] transition disabled:opacity-40"
      >
        {confirmLabel}
      </button>
    </div>
  )
}

export function TYFCBForm({ onConfirm, onCancel, members = [], initial = null, confirmLabel = 'Confirm' }) {
  const [form, setForm] = useState(() => ({
    thankYouTo: initial?.thankYouTo || '',
    amount: initial?.amount ?? '',
    businessType: initial?.businessType || 'New',
    referralType: initial?.referralType || 'Inside',
    comments: initial?.comments || '',
  }))
  const [selectedMember, setSelectedMember] = useState(() => initial?._selectedMember || null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Thank you to</label>
        <SearchField
          placeholder="Click to select a member…"
          value={form.thankYouTo}
          onChange={v => { set('thankYouTo', v); setSelectedMember(null) }}
          options={members}
          onSelectOption={(opt) => { set('thankYouTo', opt.label || opt); setSelectedMember(opt) }}
        />
      </div>
      <div>
        <label className={labelCls}>Amount (₹)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ba] font-semibold text-sm">₹</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            className={inputCls + ' pl-8'}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Business Type</label>
        <ToggleGroup options={['New', 'Repeat']} value={form.businessType} onChange={v => set('businessType', v)} />
      </div>
      <div>
        <label className={labelCls}>Referral Type</label>
        <ToggleGroup options={['Inside', 'Outside', 'Tier3+']} value={form.referralType} onChange={v => set('referralType', v)} />
      </div>
      <div>
        <label className={labelCls}>Comments</label>
        <textarea
          rows={3}
          placeholder="Add a note…"
          value={form.comments}
          onChange={e => set('comments', e.target.value)}
          className={inputCls + ' resize-none'}
        />
      </div>
      <FormActions
        onConfirm={() => onConfirm({ ...form, _selectedMember: selectedMember })}
        onCancel={onCancel}
        disabled={!form.thankYouTo || !form.amount}
        confirmLabel={confirmLabel}
      />
    </div>
  )
}

export function ReferralForm({ onConfirm, onCancel, members = [], initial = null, confirmLabel = 'Confirm' }) {
  const [form, setForm] = useState(() => ({
    to: initial?.to || '',
    referralType: initial?.referralType || 'Inside',
    toldThem: Boolean(initial?.toldThem),
    givenCard: Boolean(initial?.givenCard),
    referral: initial?.referral || '',
    telephone: initial?.telephone || '',
    email: initial?.email || '',
    address: initial?.address || '',
    comments: initial?.comments || '',
    heat: Number.isFinite(Number(initial?.heat)) ? Number(initial.heat) : 0,
  }))
  const [selectedMember, setSelectedMember] = useState(() => initial?._selectedMember || null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>To</label>
        <SearchField
          placeholder="Click to select a member…"
          value={form.to}
          onChange={v => { set('to', v); setSelectedMember(null) }}
          options={members}
          onSelectOption={(opt) => { set('to', opt.label || opt); setSelectedMember(opt) }}
        />
      </div>
      <div>
        <label className={labelCls}>Referral Type</label>
        <ToggleGroup options={['Inside', 'Outside']} value={form.referralType} onChange={v => set('referralType', v)} />
      </div>
      <div>
        <label className={labelCls}>Referral Status</label>
        <div className="flex flex-col gap-2">
          {[
            { key: 'toldThem', label: 'Told Them You Would Call' },
            { key: 'givenCard', label: 'Given Your Card' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set(key, !form[key])}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                  form[key]
                    ? 'bg-[#1B2E6B] border-[#1B2E6B]'
                    : 'bg-white dark:bg-[#1c2035] border-[#CDD0E0] dark:border-[#313655]'
                }`}
              >
                {form[key] && <CheckCircle2 size={11} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-sm text-[#1a1d2e] dark:text-[#e4e6f0]">{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Referral Name</label>
        <input
          type="text"
          placeholder="Name of referral"
          value={form.referral}
          onChange={e => set('referral', e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Telephone</label>
          <input type="tel" placeholder="+91 00000 00000" value={form.telephone} onChange={e => set('telephone', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Address</label>
        <textarea rows={2} placeholder="Address…" value={form.address} onChange={e => set('address', e.target.value)} className={inputCls + ' resize-none'} />
      </div>
      <div>
        <label className={labelCls}>Comments</label>
        <textarea rows={2} placeholder="Add a note…" value={form.comments} onChange={e => set('comments', e.target.value)} className={inputCls + ' resize-none'} />
      </div>
      <HeatBar value={form.heat} onChange={v => set('heat', v)} />
      <FormActions
        onConfirm={() => onConfirm({ ...form, _selectedMember: selectedMember })}
        onCancel={onCancel}
        disabled={!form.referral}
        confirmLabel={confirmLabel}
      />
    </div>
  )
}

export function OneToOneForm({ onConfirm, onCancel, members = [], initial = null, confirmLabel = 'Confirm' }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(() => ({
    with: initial?.with || '',
    initiatedBy: initial?.initiatedBy || 'Me',
    where: initial?.where || '',
    date: initial?.date || today,
    topics: initial?.topics || '',
  }))
  const [selectedMember, setSelectedMember] = useState(() => initial?._selectedMember || null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>With</label>
        <SearchField
          placeholder="Click to select a member…"
          value={form.with}
          onChange={v => { set('with', v); setSelectedMember(null) }}
          options={members}
          onSelectOption={(opt) => { set('with', opt.label || opt); setSelectedMember(opt) }}
        />
      </div>
      <div>
        <label className={labelCls}>Initiated By</label>
        <ToggleGroup options={['Me', 'Them', 'Mutual']} value={form.initiatedBy} onChange={v => set('initiatedBy', v)} />
      </div>
      <div>
        <label className={labelCls}>Where did you meet?</label>
        <input type="text" placeholder="Café, Office, Online…" value={form.where} onChange={e => set('where', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Date</label>
        <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Topics of Conversation</label>
        <textarea rows={3} placeholder="What did you discuss?" value={form.topics} onChange={e => set('topics', e.target.value)} className={inputCls + ' resize-none'} />
      </div>
      <FormActions
        onConfirm={() => onConfirm({ ...form, _selectedMember: selectedMember })}
        onCancel={onCancel}
        disabled={!form.with}
        confirmLabel={confirmLabel}
      />
    </div>
  )
}
