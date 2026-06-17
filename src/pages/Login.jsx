import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setMsg(null)
    if (!email || !password) {
      setMsg({ type: 'err', text: t('auth.needBoth') })
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/')
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setMsg({ type: 'warn', text: t('auth.accountCreated') })
        setMode('login')
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message || t('auth.loginFailed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="mark"><span /></div>
        <h1>{mode === 'login' ? t('auth.login') : t('auth.createAccount')}</h1>
        <p className="sub">{t('app.title')}</p>

        {!isSupabaseConfigured ? <div className="banner warn">{t('auth.notConfigured')}</div> : null}
        {msg ? <div className={'banner ' + msg.type}>{msg.text}</div> : null}

        <div className="field">
          <label>{t('auth.email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" autoComplete="email" />
        </div>
        <div className="field">
          <label>{t('auth.password')}</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? t('auth.processing') : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
        </button>

        <div className="switch">
          {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(null) }}>
            {mode === 'login' ? t('auth.register') : t('auth.login')}
          </button>
        </div>
      </div>
    </div>
  )
}
