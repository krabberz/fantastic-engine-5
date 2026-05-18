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
      const res = await fetch(
        `${import.meta.env.VITE_IPICK_URL}/functions/v1/get-balance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_IPICK_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_IPICK_KEY}`,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      )
      const data2 = await res.json()
      if (data2.ok) setAccount(data2.account)
    }

    setLoading(false)
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email, password, { fullName, displayName, jcbCardNumber, jcbAccountNumber }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) return { error }

    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      display_name: displayName || fullName,
      jcb_card_number: jcbCardNumber || null,
      jcb_account_number: jcbAccountNumber || null,
    })

    return { error: null }
  }

  async function resetPassword(email, redirectTo) {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, account, loading, signIn, signUp, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
