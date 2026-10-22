import { useEffect, useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import { collectionErrorMessage, getOrders } from '../lib/accountCollection'
import Navbar from './Navbar'

const orderFilters = [
  { id: 'confirmation', label: '주문확인' },
  { id: 'preparing', label: '상품준비중' },
  { id: 'shipping-started', label: '배송시작' },
  { id: 'shipping', label: '배송중' },
  { id: 'completed', label: '배송완료' },
  { id: 'cancelled', label: '주문취소' },
]

function getOrderStatus(order) {
  if (order.orderStatus === 'cancelled') {
    return { label: '주문취소', group: 'cancelled', className: 'cancelled' }
  }
  if (order.payment?.status === 'failed') {
    return { label: '주문취소', group: 'cancelled', className: 'cancelled' }
  }
  if (order.fulfillmentStatus === 'returned') {
    return { label: '주문취소', group: 'cancelled', className: 'cancelled' }
  }
  if (
    order.fulfillmentStatus === 'delivered' ||
    order.orderStatus === 'completed'
  ) {
    return { label: '배송완료', group: 'completed', className: 'completed' }
  }
  if (order.fulfillmentStatus === 'shipped') {
    return { label: '배송중', group: 'shipping', className: 'shipping' }
  }
  if (order.fulfillmentStatus === 'preparing') {
    return { label: '상품준비중', group: 'preparing', className: 'processing' }
  }
  return { label: '주문확인', group: 'confirmation', className: 'processing' }
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('ko-KR')
}

function OrderListPage({ authMessage, currentUser, onLogout, onNavigate }) {
  const [orders, setOrders] = useState([])
  const [activeFilter, setActiveFilter] = useState('confirmation')
  const [expandedOrderId, setExpandedOrderId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrders() {
      setIsLoading(true)
      setError('')
      try {
        const result = await getOrders({ signal: controller.signal })
        if (!controller.signal.aborted) setOrders(result)
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(collectionErrorMessage(loadError))
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadOrders()
    return () => controller.abort()
  }, [retryCount])

  const visibleOrders = [...orders]
    .sort((first, second) => (
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    ))
    .filter((order) => (
      activeFilter === 'shipping-started'
        ? getOrderStatus(order).group === 'shipping'
        : getOrderStatus(order).group === activeFilter
    ))

  return (
    <main className="storefront order-list-page">
      <Navbar
        authMessage={authMessage}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
      <section className="order-list-content" aria-labelledby="order-list-title">
        <h1 id="order-list-title" className="visually-hidden">내 주문 내역</h1>
        <div className="order-list-filters" role="group" aria-label="주문 상태 필터">
          {orderFilters.map((filter) => (
            <button
              aria-pressed={activeFilter === filter.id}
              className={activeFilter === filter.id ? 'is-active' : ''}
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="order-list-state order-list-error" role="alert">
            <p>{error}</p>
            <button onClick={() => setRetryCount((count) => count + 1)} type="button">
              다시 시도
            </button>
          </div>
        ) : isLoading ? (
          <p className="order-list-state" role="status">주문 내역을 불러오고 있습니다.</p>
        ) : visibleOrders.length ? (
          <div className="order-list-cards">
            {visibleOrders.map((order) => {
              const status = getOrderStatus(order)
              const isExpanded = expandedOrderId === order._id
              return (
                <article className="order-list-card" key={order._id}>
                  <header className="order-list-card-header">
                    <div className="order-list-heading">
                      <span className={`order-list-status order-list-status--${status.className}`}>
                        {status.label}
                      </span>
                      <strong>주문 #{order.orderNumber}</strong>
                      <span>주문일: {formatDate(order.createdAt)}</span>
                    </div>
                    <strong className="order-list-total">
                      {Number(order.totalAmount).toLocaleString('ko-KR')}원
                    </strong>
                  </header>

                  <div className="order-list-items">
                    {order.items.map((item) => (
                      <div className="order-list-item" key={item._id}>
                        <span className="order-list-image">
                          {item.image
                            ? <img alt="" src={item.image} />
                            : <span>이미지 없음</span>}
                        </span>
                        <div className="order-list-item-copy">
                          <strong>{item.name}</strong>
                          {(item.size || item.color) && (
                            <span>
                              {[item.size && `사이즈: ${item.size}`, item.color && `색상: ${item.color}`]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                          <span>수량: {item.quantity}</span>
                          <strong>{Number(item.lineTotal).toLocaleString('ko-KR')}원</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`order-list-note order-list-note--${status.className}`}>
                    {status.label}
                    {order.shippedAt && status.group === 'shipping'
                      ? ` · 발송일 ${formatDate(order.shippedAt)}`
                      : order.deliveredAt && status.group === 'completed'
                        ? ` · 배송일 ${formatDate(order.deliveredAt)}`
                        : ''}
                  </div>

                  {isExpanded && (
                    <dl className="order-list-details">
                      <div>
                        <dt>받는 분</dt>
                        <dd>{order.shippingAddress?.recipientName || '-'}</dd>
                      </div>
                      <div>
                        <dt>배송 주소</dt>
                        <dd>
                          {[
                            order.shippingAddress?.postalCode,
                            order.shippingAddress?.address1,
                            order.shippingAddress?.address2,
                          ].filter(Boolean).join(' ')}
                        </dd>
                      </div>
                      <div>
                        <dt>결제 방법</dt>
                        <dd>{order.payment?.method || '-'}</dd>
                      </div>
                      <div>
                        <dt>결제 상태</dt>
                        <dd>{order.payment?.status === 'paid' ? '결제 완료' : order.payment?.status || '-'}</dd>
                      </div>
                    </dl>
                  )}

                  <footer className="order-list-card-actions">
                    <button
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedOrderId(isExpanded ? '' : order._id)}
                      type="button"
                    >
                      {isExpanded ? '상세 닫기' : '주문 상세보기'}
                    </button>
                  </footer>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="order-list-state">
            <p>
              {orders.length
                ? '선택한 주문 상태의 내역이 없습니다.'
                : '아직 주문 내역이 없습니다.'}
            </p>
            <button onClick={() => onNavigate('/?view=products')} type="button">
              상품 둘러보기
            </button>
          </div>
        )}
      </section>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

export default OrderListPage
