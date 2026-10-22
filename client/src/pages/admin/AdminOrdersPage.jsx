import { useEffect, useState } from 'react'
import {
  collectionErrorMessage,
  getAllOrders,
  updateAdminOrderStatus,
} from '../../lib/accountCollection'
import './AdminPage.css'

const orderFilters = [
  { id: 'all', label: '전체' },
  { id: 'confirmed', label: '주문확인' },
  { id: 'preparing', label: '상품준비중' },
  { id: 'shipping', label: '배송중' },
  { id: 'completed', label: '배송완료' },
  { id: 'cancelled', label: '주문취소' },
]

const statusOptions = [
  { id: 'confirmed', label: '주문확인' },
  { id: 'preparing', label: '상품준비중' },
  { id: 'shipping', label: '배송중' },
  { id: 'completed', label: '배송완료' },
  { id: 'cancelled', label: '주문취소' },
]

function getStatus(order) {
  if (order.orderStatus === 'cancelled' || order.payment?.status === 'failed') {
    return { label: '주문취소', filter: 'cancelled', value: 'cancelled', className: 'cancelled' }
  }
  if (order.fulfillmentStatus === 'delivered' || order.orderStatus === 'completed') {
    return { label: '배송완료', filter: 'completed', value: 'completed', className: 'delivered' }
  }
  if (order.fulfillmentStatus === 'shipped') {
    return { label: '배송중', filter: 'shipping', value: 'shipping', className: 'shipping' }
  }
  if (order.fulfillmentStatus === 'preparing') {
    return { label: '상품준비중', filter: 'preparing', value: 'preparing', className: 'processing' }
  }
  return { label: '주문확인', filter: 'confirmed', value: 'confirmed', className: 'processing' }
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('ko-KR')
}

function AdminOrdersPage({ onNavigate }) {
  const [orders, setOrders] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrders() {
      setIsLoading(true)
      setError('')
      try {
        const result = await getAllOrders({ signal: controller.signal })
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
      activeFilter === 'all' || getStatus(order).filter === activeFilter
    ))
    .filter((order) => {
      if (!searchTerm) return true
      const searchable = [
        order.orderNumber,
        order.shippingAddress?.recipientName,
        order.user?.name,
        order.user?.email,
        order.shippingAddress?.email,
      ].filter(Boolean).join(' ').toLocaleLowerCase()
      return searchable.includes(searchTerm.toLocaleLowerCase())
    })

  const filterCounts = orderFilters.reduce((counts, filter) => {
    counts[filter.id] = filter.id === 'all'
      ? orders.length
      : orders.filter((order) => getStatus(order).filter === filter.id).length
    return counts
  }, {})

  async function changeStatus(order, nextStatus) {
    const statusUpdates = {
      confirmed: { orderStatus: 'confirmed', fulfillmentStatus: 'pending' },
      preparing: { orderStatus: 'confirmed', fulfillmentStatus: 'preparing' },
      shipping: { orderStatus: 'confirmed', fulfillmentStatus: 'shipped' },
      completed: { orderStatus: 'completed', fulfillmentStatus: 'delivered' },
      cancelled: { orderStatus: 'cancelled' },
    }
    setBusyOrderId(order._id)
    setError('')
    try {
      const updatedOrder = await updateAdminOrderStatus(order._id, statusUpdates[nextStatus])
      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        currentOrder._id === updatedOrder._id
          ? { ...currentOrder, ...updatedOrder }
          : currentOrder
      )))
    } catch (statusError) {
      setError(collectionErrorMessage(statusError))
    } finally {
      setBusyOrderId('')
    }
  }

  return (
    <main className="admin-page admin-orders-page">
      <header className="admin-header">
        <button
          className="admin-brand"
          type="button"
          onClick={() => onNavigate('/admin')}
          aria-label="관리자 대시보드로 이동"
        >
          <span>MAISON LUNE</span>
          <span className="admin-badge">ADMIN</span>
        </button>
        <button
          className="admin-store-link"
          type="button"
          onClick={() => onNavigate('/admin')}
        >
          대시보드로 돌아가기 <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="admin-orders-content" aria-labelledby="admin-orders-title">
        <div className="admin-orders-titlebar">
          <button
            aria-label="관리자 대시보드로 돌아가기"
            className="admin-orders-back"
            onClick={() => onNavigate('/admin')}
            type="button"
          >
            ←
          </button>
          <h1 id="admin-orders-title">주문 관리</h1>
        </div>

        <form
          className="admin-order-search"
          onSubmit={(event) => {
            event.preventDefault()
            setSearchTerm(searchInput.trim())
          }}
        >
          <label className="visually-hidden" htmlFor="admin-order-query">
            주문번호 또는 고객명으로 검색
          </label>
          <span aria-hidden="true">⌕</span>
          <input
            id="admin-order-query"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="주문번호 또는 고객명으로 검색..."
            value={searchInput}
          />
          <button type="submit">필터</button>
        </form>

        <div className="admin-order-filters" role="group" aria-label="주문 상태 필터">
          {orderFilters.map((filter) => (
            <button
              aria-pressed={activeFilter === filter.id}
              className={activeFilter === filter.id ? 'is-active' : ''}
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              type="button"
            >
              {filter.label}
              <span>{filterCounts[filter.id] || 0}</span>
            </button>
          ))}
        </div>

        {error ? (
          <div className="admin-order-state" role="alert">
            <p>{error}</p>
            <button onClick={() => setRetryCount((count) => count + 1)} type="button">
              다시 시도
            </button>
          </div>
        ) : isLoading ? (
          <p className="admin-order-state" role="status">전체 주문을 불러오고 있습니다.</p>
        ) : visibleOrders.length ? (
          <div className="admin-order-cards">
            {visibleOrders.map((order) => {
              const status = getStatus(order)
              const isExpanded = expandedOrderId === order._id
              const isBusy = busyOrderId === order._id
              const isFinal = status.filter === 'completed' || status.filter === 'cancelled'
              const customerName = order.shippingAddress?.recipientName || order.user?.name || '고객'
              return (
                <article className="admin-order-card" key={order._id}>
                  <div className="admin-order-card-heading">
                    <div className="admin-order-title">
                      <span className={`admin-order-status admin-order-status--${status.className}`}>
                        {status.label}
                      </span>
                      <div>
                        <strong>{order.orderNumber}</strong>
                        <span>{customerName} · {formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="admin-order-summary">
                      <strong>{Number(order.totalAmount).toLocaleString('ko-KR')}원</strong>
                      <button
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedOrderId(isExpanded ? '' : order._id)}
                        type="button"
                      >
                        ◉ <span>{isExpanded ? '닫기' : '상세보기'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="admin-order-meta">
                    <div>
                      <span>고객 정보</span>
                      <strong>{order.user?.email || order.shippingAddress?.email || '-'}</strong>
                      <strong>{order.shippingAddress?.phone || '-'}</strong>
                    </div>
                    <div>
                      <span>주문 상품</span>
                      {order.items?.length
                        ? order.items.slice(0, 2).map((item) => (
                          <strong key={item._id}>{item.name}</strong>
                        ))
                        : <strong>주문 상품 정보 없음</strong>}
                      {order.items?.length > 2 && (
                        <strong>외 {order.items.length - 2}개 상품</strong>
                      )}
                    </div>
                    <div>
                      <span>배송 주소</span>
                      <strong>
                        {[order.shippingAddress?.address1, order.shippingAddress?.address2]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </strong>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="admin-order-expanded">
                      {order.items?.map((item) => (
                        <div className="admin-order-product" key={item._id}>
                          <span>{item.name}</span>
                          <span>{item.quantity}개</span>
                          <strong>{Number(item.lineTotal).toLocaleString('ko-KR')}원</strong>
                        </div>
                      ))}
                      <div className="admin-order-extra">
                        <span>결제 상태: {order.payment?.status === 'paid' ? '결제 완료' : order.payment?.status || '-'}</span>
                        <span>결제 방법: {order.payment?.method || '-'}</span>
                        {order.shippingAddress?.deliveryNote && (
                          <span>배송 메모: {order.shippingAddress.deliveryNote}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="admin-order-actions">
                    {!isFinal && (
                      <label className="admin-order-status-control">
                        <span className="visually-hidden">주문 상태 변경</span>
                        <select
                          disabled={isBusy}
                          onChange={(event) => changeStatus(order, event.target.value)}
                          value={status.value}
                        >
                          {statusOptions.map((option) => (
                            <option
                              disabled={
                                order.payment?.status !== 'paid'
                                && ['shipping', 'completed'].includes(option.id)
                              }
                              key={option.id}
                              value={option.id}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {isBusy && (
                      <span className="admin-order-status-saving" role="status">
                        상태 저장 중...
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="admin-order-state">
            <p>{orders.length ? '선택한 상태의 주문이 없습니다.' : '등록된 주문이 없습니다.'}</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default AdminOrdersPage
