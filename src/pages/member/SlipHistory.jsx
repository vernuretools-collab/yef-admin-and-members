import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMemberSlipHistory, getMembers, updateSlipHistory, deleteSlipHistory } from '../../data/firebaseData'
import {
  SLIP_TYPES,
  typeConfig,
  formatSlipDate,
  slipSummary,
  otherPartyName,
  slipDetailRows,
} from '../../utils/slipHistory'
import {
  TYFCBForm,
  ReferralForm,
  OneToOneForm,
} from '../../components/slips/SlipForms'
import {
  Activity,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Pencil,
  X,
  BadgeDollarSign,
  Handshake,
  Users,
  UserPlus,
  Eye,
  Trash2,
} from 'lucide-react'

const MANAGEABLE_TYPES = ['tyfcb', 'referrals', 'oneToOne', 'visitors']

const EDIT_TITLES = {
  tyfcb: 'Edit TYFCB',
  referrals: 'Edit Referral',
  oneToOne: 'Edit One-to-One',
}

const VIEW_TITLES = {
  tyfcb: 'TYFCB details',
  referrals: 'Referral details',
  oneToOne: 'One-to-One details',
  visitors: 'Visitor details',
}

const TYPE_ICONS = {
  tyfcb: BadgeDollarSign,
  referrals: Handshake,
  oneToOne: Users,
  visitors: UserPlus,
}

const isRealSlip = (item) => {
  if (!item || item.prior) return false
  const id = String(item.id || '')
  return Boolean(id) && !id.startsWith('embedded-') && !id.startsWith('prior-')
}

const canEditSlip = (item, uid) => {
  if (!isRealSlip(item) || !uid) return false
  if (item.fromUid !== uid) return false
  return item.type === 'tyfcb' || item.type === 'referrals' || item.type === 'oneToOne'
}

const canDeleteSlip = (item, uid) => {
  if (!isRealSlip(item) || !uid) return false
  if (item.fromUid !== uid) return false
  return MANAGEABLE_TYPES.includes(item.type)
}

const canViewSlip = (item) => isRealSlip(item)

const resolveMember = (members, uid, name) => {
  if (uid) {
    const byId = members.find(m => m.id === uid)
    if (byId) return byId
  }
  if (name) {
    const byName = members.find(m => m.label === name)
    if (byName) return byName
    return { id: uid || null, label: name }
  }
  return null
}

const initialFromItem = (item, members) => {
  const d = item.details || {}
  const other = resolveMember(members, item.toUid, item.toName || d.thankYouTo || d.to || d.with)

  if (item.type === 'tyfcb') {
    return {
      ...d,
      thankYouTo: d.thankYouTo || item.toName || '',
      amount: item.amount ?? d.amount ?? '',
      _selectedMember: other,
    }
  }
  if (item.type === 'referrals') {
    return {
      ...d,
      to: d.to || item.toName || '',
      referral: d.referral || d.client || item.client || '',
      comments: d.comments || item.notes || '',
      _selectedMember: other,
    }
  }
  if (item.type === 'oneToOne') {
    return {
      ...d,
      with: d.with || item.toName || '',
      _selectedMember: other,
    }
  }
  return { ...d, _selectedMember: other }
}

export default function SlipHistory() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    if (!user?.uid) return
    const [list, memberList] = await Promise.all([
      getMemberSlipHistory(user.uid),
      getMembers(),
    ])
    const mapped = memberList.map(m => ({
      ...m,
      label: m.displayName || m.name || m.fullName || m.business || m.label || '',
    })).filter(m => m.label)
    setItems(list)
    setMembers(mapped)
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    const run = async () => {
      try {
        await load()
      } catch (err) {
        console.error('Failed to load activity:', err)
        setError('Could not load activity. Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user?.uid, load])

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter(i => i.type === filter)),
    [items, filter]
  )

  const editMembers = useMemo(() => {
    if (!editing?.toUid && !editing?.toName) return members
    const exists = members.some(m => m.id === editing.toUid)
    if (exists) return members
    return [{ id: editing.toUid || null, label: editing.toName || 'Member' }, ...members]
  }, [members, editing])

  const handleSave = async (formData) => {
    if (!editing || !user?.uid) return
    const otherMember = formData._selectedMember
      || editMembers.find(m => m.label === (formData.thankYouTo || formData.to || formData.with))
      || null
    const toName = otherMember?.label || otherMember?.name || formData.thankYouTo || formData.to || formData.with || ''
    const amount = editing.type === 'tyfcb' ? Number(formData.amount) || 0 : 0

    if (saving) return
    setSaving(true)
    setError('')
    try {
      await updateSlipHistory({
        id: editing.id,
        type: editing.type,
        fromUid: user.uid,
        fromName: user?.name || user?.displayName || user?.email || editing.fromName || '',
        toUid: otherMember?.id || null,
        toName,
        amount,
        details: formData,
        previous: editing,
      })
      setEditing(null)
      setToast('Activity updated')
      setTimeout(() => setToast(''), 2500)
      await load()
    } catch (err) {
      console.error('Failed to update activity:', err)
      setError('Could not save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting || saving) return
    setSaving(true)
    setError('')
    try {
      await deleteSlipHistory(deleting)
      setDeleting(null)
      setViewing(null)
      setToast('Activity deleted')
      setTimeout(() => setToast(''), 2500)
      await load()
    } catch (err) {
      console.error('Failed to delete activity:', err)
      setError('Could not delete this slip. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#1B2E6B] dark:text-[#7b95e4]" />
        <p className="text-[#9ea3ba] text-sm font-medium tracking-wide">Loading your activity…</p>
      </div>
    </div>
  )

  const FormComponent = editing
    ? { tyfcb: TYFCBForm, referrals: ReferralForm, oneToOne: OneToOneForm }[editing.type]
    : null
  const EditIcon = editing ? (TYPE_ICONS[editing.type] || Pencil) : Pencil
  const editCfg = editing ? (typeConfig[editing.type] || typeConfig.referrals) : null
  const ViewIcon = viewing ? (TYPE_ICONS[viewing.type] || Eye) : Eye
  const viewCfg = viewing ? (typeConfig[viewing.type] || typeConfig.referrals) : null
  const viewRows = viewing ? slipDetailRows(viewing) : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Member Portal</p>
        <h1
          className="text-2xl font-bold text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
        >
          My Activity
        </h1>
        <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-1">
          Thank-you slips, referrals, one-to-ones, and visitors you have logged. You can view details, edit TYFCB, referrals, and one-to-ones you submitted, and delete slips you logged. Older totals appear as “Before tracking” when names were not saved.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {SLIP_TYPES.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
              filter === f.key
                ? 'bg-[#1B2E6B] text-white border-transparent shadow-[0_2px_8px_rgba(27,46,107,0.25)]'
                : 'border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] bg-white dark:bg-[#161929]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[#fce8e8] dark:bg-red-900/20 text-[#E31E24] text-sm font-medium">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Activity size={40} className="mx-auto text-[#CDD0E0] dark:text-[#313655] mb-4" />
          <p className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
            No {filter !== 'all' ? SLIP_TYPES.find(t => t.key === filter)?.label.toLowerCase() : ''} activity yet
          </p>
          <p className="text-xs text-[#9ea3ba] mt-1">
            Slips you log from the dashboard will appear here. Refresh after logging a new thank-you slip.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const cfg = typeConfig[item.type] || typeConfig.referrals
            const isFromMe = item.fromUid === user?.uid
            const other = otherPartyName(item, user?.uid)
            const comments = item.details?.comments || item.details?.topics || item.details?.notes
            const editable = canEditSlip(item, user?.uid)
            const viewable = canViewSlip(item)
            const deletable = canDeleteSlip(item, user?.uid)

            return (
              <div
                key={item.id}
                className="card p-5 hover:shadow-[0_4px_12px_rgba(27,46,107,0.10)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isFromMe
                        ? 'bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]'
                        : 'bg-[#fff3e0] dark:bg-orange-900/20 text-[#e65100]'
                    }`}>
                      {isFromMe
                        ? <ArrowRight size={17} strokeWidth={2.5} />
                        : <ArrowLeft size={17} strokeWidth={2.5} />
                      }
                    </div>
                    <div>
                      <div
                        className="font-bold text-[15px] text-[#1a1d2e] dark:text-[#e4e6f0] leading-tight"
                        style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}
                      >
                        {slipSummary(item)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-[#9ea3ba] mt-1 flex-wrap">
                        <span className="font-semibold text-[#5c607a] dark:text-[#8890b0]">
                          {other}
                        </span>
                        {item.prior ? (
                          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#EEF0F7] dark:bg-[#1c2035] text-[#5c607a] dark:text-[#8890b0] text-[11px] font-semibold">
                            Before tracking
                          </span>
                        ) : (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
                            isFromMe
                              ? 'bg-[#dce1f5] dark:bg-[#1e254a] text-[#1B2E6B] dark:text-[#7b95e4]'
                              : 'bg-[#fff3e0] dark:bg-orange-900/20 text-[#e65100]'
                          }`}>
                            {isFromMe ? 'You sent' : 'You received'}
                          </span>
                        )}
                      </div>
                      {comments && (
                        <div className="text-xs text-[#9ea3ba] mt-1.5 italic">"{comments}"</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {viewable && (
                        <button
                          type="button"
                          onClick={() => { setError(''); setViewing(item) }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#CDD0E0] dark:border-[#313655] text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition"
                        >
                          <Eye size={12} strokeWidth={2.4} />
                          View
                        </button>
                      )}
                      {editable && (
                        <button
                          type="button"
                          onClick={() => { setError(''); setEditing(item) }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#CDD0E0] dark:border-[#313655] text-[#1B2E6B] dark:text-[#7b95e4] hover:bg-[#EEF0F7] dark:hover:bg-[#1a1e30] transition"
                        >
                          <Pencil size={12} strokeWidth={2.4} />
                          Edit
                        </button>
                      )}
                      {deletable && (
                        <button
                          type="button"
                          onClick={() => { setError(''); setDeleting(item) }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#f5c6c7] dark:border-red-900 text-[#E31E24] hover:bg-[#fce8e8] dark:hover:bg-red-900/20 transition"
                        >
                          <Trash2 size={12} strokeWidth={2.4} />
                          Delete
                        </button>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-[#9ea3ba]">{formatSlipDate(item)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && FormComponent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(10,12,25,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !saving && setEditing(null)}
        >
          <div className="bg-white dark:bg-[#161929] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEF0F7] dark:border-[#313655] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${editCfg?.badge || 'bg-[#EEF0F7]'}`}>
                  <EditIcon size={15} strokeWidth={2} />
                </div>
                <h2
                  className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {EDIT_TITLES[editing.type] || 'Edit slip'}
                </h2>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] hover:bg-[#EEF0F7] dark:hover:bg-[#252a45] transition disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              {saving && (
                <div className="mb-4 flex items-center gap-2 text-sm text-[#5c607a] dark:text-[#8890b0]">
                  <Loader2 size={16} className="animate-spin" />
                  Saving changes…
                </div>
              )}
              <FormComponent
                key={editing.id}
                onConfirm={handleSave}
                onCancel={() => !saving && setEditing(null)}
                members={editMembers}
                initial={initialFromItem(editing, editMembers)}
                confirmLabel="Save changes"
              />
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(10,12,25,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setViewing(null)}
        >
          <div className="bg-white dark:bg-[#161929] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEF0F7] dark:border-[#313655] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${viewCfg?.badge || 'bg-[#EEF0F7]'}`}>
                  <ViewIcon size={15} strokeWidth={2} />
                </div>
                <h2
                  className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {VIEW_TITLES[viewing.type] || 'Slip details'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9ea3ba] hover:text-[#1a1d2e] dark:hover:text-[#e4e6f0] hover:bg-[#EEF0F7] dark:hover:bg-[#252a45] transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex-1 flex flex-col gap-3">
              {viewRows.length === 0 ? (
                <p className="text-sm text-[#9ea3ba]">No extra details were saved for this slip.</p>
              ) : (
                viewRows.map(row => (
                  <div key={row.label}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9ea3ba]">{row.label}</div>
                    <div className="text-sm text-[#1a1d2e] dark:text-[#e4e6f0] mt-0.5 whitespace-pre-wrap">{row.value}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(10,12,25,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !saving && setDeleting(null)}
        >
          <div className="bg-white dark:bg-[#161929] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#CDD0E0] dark:border-[#313655] shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-5">
            <h2
              className="text-base font-bold text-[#1a1d2e] dark:text-[#e4e6f0]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Delete this slip?
            </h2>
            <p className="text-sm text-[#5c607a] dark:text-[#8890b0] mt-2">
              {slipSummary(deleting)} will be removed from your activity. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleting(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#CDD0E0] dark:border-[#313655] text-sm font-semibold text-[#5c607a] dark:text-[#8890b0] hover:bg-[#EEF0F7] dark:hover:bg-[#252a45] transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-[#E31E24] hover:bg-[#c41920] text-sm font-semibold text-white transition disabled:opacity-40"
              >
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#1B2E6B] text-white text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
