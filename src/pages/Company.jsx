import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import {
  listMembers, listInvitations, adminInviteMember, removeMember,
  setMemberRole, setMemberPermissions, setMemberActive,
} from '../lib/supabase'
import { exportOrders } from '../lib/exportCsv'

const PERM_KEYS = [
  'can_create', 'can_edit', 'can_delete', 'can_change_status',
  'can_view_receipt', 'can_manage_customers', 'can_manage_members', 'can_manage_cargo',
]
const DEFAULT_PERMS = {
  can_create: true, can_edit: true, can_delete: false, can_change_status: true,
  can_view_receipt: true, can_manage_customers: true, can_manage_members: false, can_manage_cargo: true,
}

export default function Company() {
  const { t } = useTranslation()
  const { role, company, user } = useAuth()
  const { orders, clearAll } = useOrders()
  const isAdmin = role === 'admin'
  const myId = user?.id

  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [invitePerms, setInvitePerms] = useState({ ...DEFAULT_PERMS })
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      setMembers(await listMembers())
      if (isAdmin) setInvites(await listInvitations())
    } catch (e) {
      setMsg(e.message || String(e))
    }
  }, [isAdmin])

  useEffect(() => { load() }, [load])

  async function run(fn) {
    setMsg(null)
    try { await fn(); await load() } catch (e) { setMsg(e.message || String(e)) }
  }

  async function doInvite() {
    if (!email.trim()) return
    await run(async () => {
      await adminInviteMember(email.trim(), inviteRole, invitePerms)
      setEmail(''); setInvitePerms({ ...DEFAULT_PERMS })
      setMsg(t('company.invited'))
    })
  }

  async function handleClear() {
    if (!confirm(t('company.confirmClear'))) return
    try { await clearAll(); alert(t('company.cleared')) } catch (e) { alert(e.message || String(e)) }
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
          <div className="phead">{t('company.createMember')}</div>
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
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>{t('company.permissions')}</label>
              <div className="perm-grid">
                {PERM_KEYS.map((k) => (
                  <label key={k} className="perm-chk">
                    <input type="checkbox" checked={!!invitePerms[k]}
                      onChange={(e) => setInvitePerms((p) => ({ ...p, [k]: e.target.checked }))} />
                    {t('perm.' + k)}
                  </label>
                ))}
              </div>
            </div>
            <button className="searchbtn" style={{ marginTop: 14 }} onClick={doInvite}>{t('company.sendInvite')}</button>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{t('auth.contactAdmin')}</p>
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="phead">{t('company.members')}</div>
        <div className="pbody">
          {members.map((m) => {
            const self = m.user_id === myId
            return (
              <div key={m.id} className="member-row">
                <div className="member-head">
                  <span>
                    {m.email}{' '}
                    <span className="pill">{m.role === 'admin' ? t('company.admin') : t('company.staff')}</span>{' '}
                    {!m.active ? <span className="pill" style={{ background: 'var(--out,#c0392b)', color: '#fff' }}>{t('company.locked')}</span> : null}
                  </span>
                  {isAdmin && !self ? (
                    <div className="member-actions">
                      <select value={m.role} onChange={(e) => run(() => setMemberRole(m.user_id, e.target.value))}>
                        <option value="staff">{t('company.staff')}</option>
                        <option value="admin">{t('company.admin')}</option>
                      </select>
                      <button className="mini" onClick={() => run(() => setMemberActive(m.user_id, !m.active))}>
                        {m.active ? t('company.lock') : t('company.unlock')}
                      </button>
                      <button className="mini del" onClick={() => { if (confirm(t('company.remove') + '?')) run(() => removeMember(m.user_id)) }}>
                        {t('company.remove')}
                      </button>
                    </div>
                  ) : null}
                </div>
                {isAdmin && !self && m.role !== 'admin' ? (
                  <div className="perm-grid" style={{ marginTop: 6 }}>
                    {PERM_KEYS.map((k) => (
                      <label key={k} className="perm-chk">
                        <input type="checkbox" checked={!!m.perms[k]}
                          onChange={(e) => run(() => setMemberPermissions(m.user_id, { [k]: e.target.checked }))} />
                        {t('perm.' + k)}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
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
