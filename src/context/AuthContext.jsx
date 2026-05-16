import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseAuth } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [bankAccount, setBankAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfile(null)
        setBankAccount(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data: profileData } = await supabaseAuth
      .from('profiles')
      .select('id, full_name, display_name, email, role')
      .eq('id', userId)
      .single()

    setProfile(profileData)

    const { data: accountData } = await supabaseAuth
      .from('bank_accounts')
      .select('id, account_number, balance, account_type, is_frozen')
      .eq('user_id', userId)
      .eq('account_type', 'checking')
      .single()

    setBankAccount(accountData)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signUp(email, password, { fullName, displayName }) {
    const { data, error } = await supabaseAuth.auth.signUp({ email, password })
    if (error || !data.user) return { data, error }

    await supabaseAuth.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      display_name: displayName || fullName,
      role: 'citizen',
    })

    return { data, error: null }
  }

  async function resetPassword(email, redirectTo) {
    return supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo })
  }

  async function signOut() {
    await supabaseAuth.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, bankAccount, loading, signIn, signUp, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
