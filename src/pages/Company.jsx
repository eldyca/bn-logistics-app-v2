import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import { listMembers, listInvitations, inviteStaff, removeMember } from '../lib/supabase'
import { exportOrders } from '../lib/exportCsv'

export default function Company() {
  const { t } = useTranslation()
  const { role, company } = useAuth()
  const { orders, clearAll } = useOrders()
  const isAdmin = role === 'admin'

  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      setMembers(await listMembers())
      if (isAdmin) setInvites(await listInvitations())
    } catch (e) {
      setMsg(e.message || String(e))
    }
  }, [isAdmin])

  useEffect(() => {
    load()
  }, [load])

  async function doInvite() {
    setMsg(null)
    if (!email.trim()) return
    try {
      await inviteStaff(email.trim(), inviteRole)
      setEmail('')
      setMsg(t('company.invited'))
      load()
    } catch (e) {
      setMsg(e.message || String(e))
    }
  }

  async function doRemove(id) {
    if (!confirm(t('company.remove') + '?')) return
    try {
      await removeMember(id)
      load()
    } catch (e) {
      setMsg(e.message || String(e))
    }
  }

  async function handleClear() {
    if (!confirm(t('company.confirmClear'))) return
    try {
      await clearAll()
      alert(t('company.cleared'))
    } catch (e) {
      alert(e.message || String(e))
    }
  }

  return (
    <>
      <div className="viewtitle">{t('company.title')}</div>
      <div className="viewsub">{t('company.subtitle')}</div>

      {msg ? <div className="banner warn">{msg}</div> : null}

      <div className="panel">
        <div className="phead">{company?.name}</div>
        <div className="pbody">
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {t('company.yourRole')}: <strong style={{ color: 'var(--ink)' }}>{role}</strong>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="panel">
          <div className="phead">{t('company.invite')}</div>
          <div className="pbody">
            <div className="grid">
              <div className="field tight"><label>{t('company.inviteEmail')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@email.com" /></div>
              <div className="field tight"><label>{t('company.role')}</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="staff">{t('company.staff')}</option>
                  <option value="admin">{t('company.admin')}</option>
                </select></div>
            </div>
            <button className="searchbtn" style={{ marginTop: 14 }} onClick={doInvite}>{t('company.sendInvite')}</button>
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="phead">{t('company.members')}</div>
        <div className="pbody">
          {members.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{m.email} <span className="pill">{m.role === 'admin' ? t('company.admin') : t('company.staff')}</span></span>
              {isAdmin ? <button className="mini del" onClick={() => doRemove(m.id)}>{t('company.remove')}</button> : null}
            </div>
          ))}
        </div>
      </div>

      {isAdmin && invites.length > 0 ? (
        <div className="panel">
          <div className="phead">{t('company.pendingInvites')}</div>
          <div className="pbody">
            {invites.map((iv) => (
              <div key={iv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{iv.email} <span className="pill">{iv.role}</span></span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{iv.accepted ? t('company.accepted') : t('company.waiting')}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="phead">{t('company.data')}</div>
        <div className="pbody">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{t('company.dataNote')}</p>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => exportOrders(orders)}>{t('company.exportAll')}</button>
            {isAdmin ? (
              <button className="btn btn-ghost" style={{ color: 'var(--out)' }} onClick={handleClear}>{t('company.clearAll')}</button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
