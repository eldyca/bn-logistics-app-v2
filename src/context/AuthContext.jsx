import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getMembership, clearCompanyCache } from '../lib/supabase'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [membership, setMembership] = useState(null)
  const [memberLoading, setMemberLoading] = useState(true)

  const loadMembership = useCallback(async (s) => {
    if (!s) {
      setMembership(null)
      setMemberLoading(false)
      return
    }
    setMemberLoading(true)
    clearCompanyCache()
    const m = await getMembership()
    setMembership(m)
    setMemberLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      loadMembership(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      loadMembership(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadMembership])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password) => supabase.auth.signUp({ email, password })
  const signOut = async () => {
    clearCompanyCache()
    setMembership(null)
    await supabase.auth.signOut()
  }
  const refreshMembership = () => loadMembership(session)

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        loading,
        membership,
        company: membership?.company || null,
        role: membership?.role || null,
        isSuperAdmin: membership?.isSuperAdmin || false,
        memberLoading,
        signIn,
        signUp,
        signOut,
        refreshMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
