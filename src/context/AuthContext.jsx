import { createContext, useContext, useState, useEffect } from 'react'
import { auth, db } from '../data/firebase'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [role, setRole]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Firebase Auth listener — persists across page refresh automatically
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch extra fields (role, name, business, etc.) from Firestore
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        const firestoreData = snap.exists() ? snap.data() : {}

        const fullUser = {
          uid:         firebaseUser.uid,
          email:       firebaseUser.email,
          displayName: firebaseUser.displayName,
          ...firestoreData,  // role, name, business, avatarInitials, memberSince, etc.
        }
        setUser(fullUser)
        setRole(firestoreData.role || null)
      } else {
        setUser(null)
        setRole(null)
      }
      setLoading(false)
    })

    return unsub // cleanup on unmount
  }, [])

  const login = async (email, password) => {
    // Firebase Auth handles email/password — no manual password check needed
    const credential = await signInWithEmailAndPassword(auth, email, password)
    // onAuthStateChanged above will fire automatically and set user+role
    return credential.user
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