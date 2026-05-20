import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfile(null)
        setAccount(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, role, jcb_card_number, jcb_account_number')
      .eq('id', userId)
      .single()

    setProfile(data)

    if (data?.jcb_account_number) {
      try {
        const { data: balData } = await supabase.functions.invoke('get-balance', {
          body: { user_id: userId },
        })
        if (balData?.ok) setAccount(balData.account)
      } catch {}
    }

    setLoading(false)
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email, password, { fullName, displayName }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) return { error }

    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      display_name: displayName || fullName,
    })

    return { error: null }
  }

  async function resetPassword(email, redirectTo) {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, account, loading, signIn, signUp, resetPassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
