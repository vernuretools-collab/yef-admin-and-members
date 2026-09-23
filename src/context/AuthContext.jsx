import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { auth, db } from '../data/firebase'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, getDocFromServer } from 'firebase/firestore'

const AuthContext = createContext(null)

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function loadProfile(firebaseUser) {
  const ref = doc(db, 'users', firebaseUser.uid)
  await firebaseUser.getIdToken(true)

  let lastError
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const snap = attempt === 0 ? await getDoc(ref) : await getDocFromServer(ref)
      if (snap.exists()) {
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          ...snap.data(),
        }
      }
    } catch (err) {
      lastError = err
      await firebaseUser.getIdToken(true)
    }
    await wait(250 * (attempt + 1))
  }

  if (lastError) throw lastError

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [role, setRole]     = useState(null)
  const [loading, setLoading] = useState(true)
  const profileRequest = useRef(0)

  const applyProfile = async firebaseUser => {
    const requestId = ++profileRequest.current
    try {
      const fullUser = await loadProfile(firebaseUser)
      if (requestId !== profileRequest.current) return fullUser
      setUser(fullUser)
      setRole(fullUser.role || null)
      return fullUser
    } finally {
      if (requestId === profileRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    // Firebase Auth listener — persists across page refresh automatically.
    // Keep loading true until the role is known, so the first sign-in is not
    // sent back to the login page to enter the email again.
    let cancelled = false

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return

      if (!firebaseUser) {
        profileRequest.current += 1
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        await applyProfile(firebaseUser)
      } catch (err) {
        console.error('Failed to load user profile:', err)
        if (cancelled) return
        setUser(prev => (
          prev?.uid === firebaseUser.uid && prev.role
            ? prev
            : {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
              }
        ))
        setRole(prev => prev || null)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      return await applyProfile(credential.user)
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  const logout = async () => {
    await signOut(auth)
    // onAuthStateChanged fires and clears user+role automatically
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)