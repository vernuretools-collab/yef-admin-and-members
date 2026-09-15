import { db } from './firebase'
import {
  collection, getDocs, query, where, addDoc, updateDoc,
  doc, setDoc, getDoc, increment, Timestamp, serverTimestamp
} from 'firebase/firestore'


export const currency = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)


export const getMembers = async () => {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.role === 'member' && u.status === 'active')
}


export const isHistoryRecord = (row) =>
  Boolean(row?.historyType) && row.historyType !== 'referrals'

export const getAllReferrals = async () => {
  const snap = await getDocs(collection(db, 'referrals'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => !isHistoryRecord(r))
}


export const getAllMeetings = async () => {
  const snap = await getDocs(collection(db, 'meetings'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}


// ✅ Returns { uid: palmsData } map — used by Directory.jsx
export const getAllPalms = async () => {
  const snap = await getDocs(collection(db, 'palms'))
  const map = {}
  snap.docs.forEach(d => {
    const data = d.data()
    map[data.uid] = data
  })
  return map
}


export const getMemberMeetings = async (uid) => {
  const snap = await getDocs(
    query(collection(db, 'meetings'), where('memberId', '==', uid))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}


export const getMemberProjects = async (uid) => {
  const snap = await getDocs(
    query(collection(db, 'projects'), where('memberId', '==', uid))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}


export const getMemberReferrals = async (uid) => {
  const [fromSnap, toSnap] = await Promise.all([
    getDocs(query(collection(db, 'referrals'), where('from', '==', uid))),
    getDocs(query(collection(db, 'referrals'), where('to',   '==', uid))),
  ])
  const map = {}
  ;[...fromSnap.docs, ...toSnap.docs].forEach(d => {
    const row = { id: d.id, ...d.data() }
    if (!isHistoryRecord(row)) map[d.id] = row
  })
  return Object.values(map)
}


export const getMemberPalms = async (uid) => {
  const snap = await getDocs(
    query(collection(db, 'palms'), where('uid', '==', uid))
  )
  return snap.empty ? {} : snap.docs[0].data()
}


/* ─── Overall Activity Slips ─────────────────────────────────────────────── */

/**
 * Increments (or decrements) a slip field in the member's overall totals doc.
 * Path: memberSlips/{uid}
 *
 * Used for both:
 *   - + button  → amount = +step  (e.g. +1 or +1000)
 *   - edit input → amount = newVal - oldVal  (can be negative for corrections)
 *
 * @param {string} uid    - Member's Firebase UID
 * @param {string} type   - 'tyfcb' | 'referrals' | 'ceu' | 'oneToOne'
 * @param {number} amount - Delta to apply (positive or negative)
 */
export const incrementSlip = async (uid, type, amount) => {
  const ref = doc(db, 'memberSlips', uid)
  await setDoc(
    ref,
    {
      [type]: increment(amount),
      uid,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )

  const palmsRef = doc(db, 'palms', uid)
  const palmsKey = type === 'oneToOne' ? 'oneToOne' : type
  await setDoc(
    palmsRef,
    {
      [palmsKey]: increment(amount),
      uid,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}


/**
 * Fetches the overall slip totals for a member.
 * Returns an object like: { tyfcb: 305000, referrals: 12, ceu: 8, oneToOne: 24 }
 * Returns {} if no slips have been logged yet.
 *
 * @param {string} uid - Member's Firebase UID
 */
export const getMemberSlips = async (uid) => {
  const ref  = doc(db, 'memberSlips', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : {}
}


/* ─── Weekly Slips (kept for backward compatibility) ─────────────────────── */

/**
 * Returns the ISO week key for the current week, e.g. "2026-W21"
 */
const getWeekKey = () => {
  const now  = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now - jan1) / 86_400_000 + jan1.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}


/**
 * Increments a slip field for the current week.
 * Path: weeklySlips/{uid}/weeks/{weekKey}
 *
 * @param {string} uid    - Member's Firebase UID
 * @param {string} type   - Field key: 'tyfcb' | 'referrals' | 'ceu' | 'oneToOne'
 * @param {number} amount - Positive number to add
 */
export const saveWeeklySlip = async (uid, type, amount) => {
  const weekKey = getWeekKey()
  const ref = doc(db, 'weeklySlips', uid, 'weeks', weekKey)
  await setDoc(
    ref,
    {
      [type]:    increment(amount),
      uid,
      weekKey,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  )
}


/**
 * Fetches the current week's slip totals for a member.
 * Returns {} if no slips have been logged yet this week.
 *
 * @param {string} uid - Member's Firebase UID
 */
export const getWeeklySlips = async (uid) => {
  const weekKey = getWeekKey()
  const ref  = doc(db, 'weeklySlips', uid, 'weeks', weekKey)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : {}
}


/* ─── Slip History ───────────────────────────────────────────────────────── */

const sanitizeValue = (value) => {
  if (value === undefined || typeof value === 'function') return undefined
  if (value === null) return null
  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter(v => v !== undefined)
  }
  if (typeof value === 'object') {
    const out = {}
    Object.entries(value).forEach(([k, v]) => {
      if (k === '_selectedMember') return
      const cleaned = sanitizeValue(v)
      if (cleaned !== undefined) out[k] = cleaned
    })
    return out
  }
  return value
}

const historyMillis = (item) => {
  const ts = item?.createdAt
  if (ts?.toMillis) return ts.toMillis()
  if (typeof ts === 'number') return ts
  if (typeof ts === 'string') {
    const n = Date.parse(ts)
    if (!Number.isNaN(n)) return n
  }
  if (item?.date) {
    const n = Date.parse(item.date)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

const toHistoryItem = (row, usersMap = {}) => {
  if (row.historyType) {
    return {
      ...row,
      type: row.historyType,
      fromUid: row.fromUid || row.from,
      toUid: row.toUid || row.to,
      fromName: row.fromName || userName(usersMap, row.fromUid || row.from),
      toName: row.toName || userName(usersMap, row.toUid || row.to),
    }
  }
  return {
    id: row.id,
    type: 'referrals',
    fromUid: row.from,
    toUid: row.to,
    fromName: userName(usersMap, row.from),
    toName: userName(usersMap, row.to),
    amount: Number(row.value) || 0,
    details: {
      referral: row.client || '',
      client: row.client || '',
      comments: row.notes || '',
    },
    createdAt: row.createdAt || null,
    date: row.date || '',
    legacy: true,
  }
}

const userName = (usersMap, uid) => {
  if (!uid) return ''
  const u = usersMap[uid]
  return u?.name || u?.displayName || u?.fullName || ''
}

const loadUsersMap = async () => {
  const snap = await getDocs(collection(db, 'users'))
  const map = {}
  snap.docs.forEach(d => {
    const data = { id: d.id, ...d.data() }
    map[d.id] = data
    if (data.uid) map[data.uid] = data
  })
  return map
}

const safeGet = async (fn, fallback) => {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

const embeddedHistory = (data, usersMap) => {
  if (!Array.isArray(data?.history)) return []
  return data.history.map((row, i) => ({
    ...toHistoryItem({ ...row, historyType: row.historyType || row.type, id: row.id || `embedded-${i}` }, usersMap),
    id: row.id || `embedded-${data.uid || 'x'}-${i}`,
  }))
}

const priorRowsForMember = (uid, name, totals, items) => {
  const tyfcbLogged = items
    .filter(i => i.type === 'tyfcb' && (i.fromUid === uid || i.toUid === uid) && !i.prior)
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const oneLogged = items.filter(i => i.type === 'oneToOne' && !i.prior && (i.fromUid === uid || i.toUid === uid)).length
  const visLogged = items.filter(i => i.type === 'visitors' && !i.prior && (i.fromUid === uid || i.toUid === uid)).length

  const tyfcbPrior = Math.max(0, Number(totals.tyfcb || 0) - tyfcbLogged)
  const onePrior = Math.max(0, Number(totals.oneToOne || 0) - oneLogged)
  const visPrior = Math.max(0, Number(totals.visitors || 0) - visLogged)

  const note = 'Recorded before detailed history. Who it was with was not saved.'
  const rows = []
  if (tyfcbPrior > 0) {
    rows.push({
      id: `prior-tyfcb-${uid}`,
      type: 'tyfcb',
      fromUid: uid,
      fromName: name,
      toUid: null,
      toName: '',
      amount: tyfcbPrior,
      details: { comments: note },
      createdAt: null,
      prior: true,
    })
  }
  if (onePrior > 0) {
    rows.push({
      id: `prior-onetoone-${uid}`,
      type: 'oneToOne',
      fromUid: uid,
      fromName: name,
      toUid: null,
      toName: '',
      amount: 0,
      details: { comments: `${onePrior} one-to-one${onePrior === 1 ? '' : 's'}. ${note}` },
      createdAt: null,
      prior: true,
      priorCount: onePrior,
    })
  }
  if (visPrior > 0) {
    rows.push({
      id: `prior-visitors-${uid}`,
      type: 'visitors',
      fromUid: uid,
      fromName: name,
      toUid: null,
      toName: '',
      amount: 0,
      details: { comments: `${visPrior} visitor${visPrior === 1 ? '' : 's'}. ${note}`, visitorName: `${visPrior} visitors` },
      createdAt: null,
      prior: true,
      priorCount: visPrior,
    })
  }
  return rows
}

const mergeTotals = (palms, slips) => ({
  tyfcb: Math.max(Number(palms?.tyfcb || 0), Number(slips?.tyfcb || 0)),
  oneToOne: Math.max(Number(palms?.oneToOne || 0), Number(slips?.oneToOne || 0)),
  visitors: Math.max(Number(palms?.visitors || 0), Number(slips?.visitors || 0)),
})

/**
 * History is stored in `referrals` with historyType set.
 * Members already have permission to read/write that collection.
 */
export const addSlipHistory = async ({
  fromUid,
  fromName,
  toUid = null,
  toName = null,
  amount = 0,
  details = {},
  type,
}) => {
  const otherUid = toUid || fromUid
  const detailsSafe = sanitizeValue(details) || {}
  const isReferral = type === 'referrals'
  const client = detailsSafe.referral || detailsSafe.client || ''
  const notes = detailsSafe.comments || detailsSafe.notes || ''
  const value = isReferral
    ? Number(detailsSafe.value) || Number(amount) || 0
    : Number(amount) || 0

  const ref = await addDoc(collection(db, 'referrals'), {
    from: fromUid || null,
    to: otherUid || null,
    fromUid: fromUid || null,
    toUid: toUid || null,
    fromName: fromName || '',
    toName: toName || '',
    historyType: type,
    amount: value,
    value,
    client,
    notes,
    details: detailsSafe,
    date: new Date().toISOString().slice(0, 10),
    status: isReferral ? 'pending' : 'given',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const markReferralConverted = async (referralId) => {
  await updateDoc(doc(db, 'referrals', referralId), {
    status: 'converted',
    convertedAt: serverTimestamp(),
  })
}

/**
 * Records a TYFCB thank-you slip (dashboard and referral conversion share this).
 */
export const recordTyfcb = async ({
  fromUid,
  fromName,
  toUid = null,
  toName = null,
  amount,
  details = {},
  referralId = null,
}) => {
  const value = Number(amount) || 0
  if (fromUid) await incrementSlip(fromUid, 'tyfcb', value)
  if (toUid && toUid !== fromUid) await incrementSlip(toUid, 'tyfcb', value)

  const tyfcbId = await addSlipHistory({
    type: 'tyfcb',
    fromUid,
    fromName: fromName || '',
    toUid,
    toName: toName || '',
    amount: value,
    details,
  })

  if (referralId) {
    await updateDoc(doc(db, 'referrals', referralId), {
      status: 'converted',
      value,
      amount: value,
      tyfcbId,
      convertedAt: serverTimestamp(),
    })
  }

  return tyfcbId
}

export const getMemberSlipHistory = async (uid) => {
  const [fromSnap, toSnap, usersMap, palms, slips] = await Promise.all([
    getDocs(query(collection(db, 'referrals'), where('from', '==', uid))),
    getDocs(query(collection(db, 'referrals'), where('to', '==', uid))),
    loadUsersMap(),
    getMemberPalms(uid),
    safeGet(() => getMemberSlips(uid), {}),
  ])

  const map = {}
  ;[...fromSnap.docs, ...toSnap.docs].forEach(d => {
    const row = { id: d.id, ...d.data() }
    map[d.id] = toHistoryItem(row, usersMap)
  })
  embeddedHistory(slips, usersMap).forEach(item => { map[item.id] = item })

  const items = Object.values(map)
  const name = userName(usersMap, uid)
  priorRowsForMember(uid, name, mergeTotals(palms, slips), items).forEach(row => {
    map[row.id] = row
  })

  return Object.values(map).sort((a, b) => {
    if (a.prior && !b.prior) return 1
    if (!a.prior && b.prior) return -1
    return historyMillis(b) - historyMillis(a)
  })
}

export const getAllSlipHistory = async () => {
  const [refsSnap, usersMap, palmsMap, slipsSnap] = await Promise.all([
    getDocs(collection(db, 'referrals')),
    loadUsersMap(),
    getAllPalms(),
    safeGet(() => getDocs(collection(db, 'memberSlips')), { docs: [] }),
  ])

  const map = {}
  refsSnap.docs.forEach(d => {
    const row = { id: d.id, ...d.data() }
    map[d.id] = toHistoryItem(row, usersMap)
  })

  const slipsByUid = {}
  ;(slipsSnap.docs || []).forEach(d => {
    const data = d.data() || {}
    const uid = data.uid || d.id
    slipsByUid[uid] = data
    embeddedHistory(data, usersMap).forEach(item => { map[item.id] = item })
  })

  const memberIds = new Set([
    ...Object.keys(usersMap).filter(id => usersMap[id]?.role === 'member'),
    ...Object.keys(palmsMap),
    ...Object.keys(slipsByUid),
  ])

  memberIds.forEach(uid => {
    const user = usersMap[uid]
    if (user?.role && user.role !== 'member') return
    const items = Object.values(map).filter(i => i.fromUid === uid || i.toUid === uid)
    priorRowsForMember(
      uid,
      userName(usersMap, uid),
      mergeTotals(palmsMap[uid], slipsByUid[uid]),
      items,
    ).forEach(row => { map[row.id] = row })
  })

  return Object.values(map).sort((a, b) => {
    if (a.prior && !b.prior) return 1
    if (!a.prior && b.prior) return -1
    return historyMillis(b) - historyMillis(a)
  })
}