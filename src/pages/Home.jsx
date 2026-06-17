import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { fmt } from '../lib/format'
import Stat from '../components/Stat'
import OrderCard from '../components/OrderCard'

export default function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { orders, deleteOrder, error } = useOrders()

  const pending = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length
  const send = orders.reduce((s, x) => s + x.tx.send, 0)
  const fee = orders.reduce((s, x) => s + x.tx.charge + x.tx.comm + x.tx.fee + x.tx.tax, 0)
  const recent = orders.slice(0, 5)

  return (
    <>
      <div className="viewtitle">{t('home.title')}</div>
      <div className="viewsub">{t('home.subtitle')}</div>
      {error ? <div className="banner err">{error}</div> : null}
      <div className="stats">
        <Stat label={t('home.totalOrders')} value={orders.length} />
        <Stat label={t('home.pending')} value={pending} />
        <Stat label={t('home.totalSend')} value={fmt(send)} />
        <Stat label={t('home.totalFee')} value={fmt(fee)} />
      </div>
      <div className="btn-row" style={{ marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={() => navigate('/create')}>+ {t('nav.createOrder')}</button>
        <button className="btn btn-ghost" onClick={() => navigate('/search-orders')}>{t('home.viewOrders')}</button>
      </div>
      <div className="toolbar"><h3>{t('home.recent')}</h3></div>
      <div className="list">
        {recent.length === 0 ? (
          <div className="empty">{t('search.noOrders')} <a onClick={() => navigate('/create')}>{t('nav.createOrder')}</a></div>
        ) : (
          recent.map((o) => <OrderCard key={o.id} order={o} onDelete={deleteOrder} />)
        )}
      </div>
    </>
  )
}
