import { useEffect, useState } from 'react'
import { collectionErrorMessage, getOrder } from '../lib/accountCollection'
import SiteFooter from '../components/SiteFooter'

function OrderSuccessPage({ orderId, onNavigate }) {
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [cartCleanupError] = useState(() => {
    const message = sessionStorage.getItem('checkout-cart-cleanup-error') || ''
    sessionStorage.removeItem('checkout-cart-cleanup-error')
    return message
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrder() {
      if (!orderId) {
        setError('주문 정보를 찾을 수 없습니다.')
        setIsLoading(false)
        return
      }

      try {
        const result = await getOrder(orderId, { signal: controller.signal })
        if (!controller.signal.aborted) {
          if (result.payment?.status !== 'paid') {
            setError('결제 완료가 확인된 주문만 주문 성공 화면에서 확인할 수 있습니다.')
          } else {
            setOrder(result)
          }
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(collectionErrorMessage(loadError))
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadOrder()
    return () => controller.abort()
  }, [orderId])

  return (
    <main className="storefront order-success-page">
      <header className="order-success-topbar">
        <span>Order Confirmation</span>
      </header>
      <section className="order-success-content" aria-labelledby="order-success-title">
        {isLoading ? (
          <p className="order-success-state" role="status">주문 정보를 확인하고 있습니다.</p>
        ) : error ? (
          <div className="order-success-state" role="alert">
            <p>{error}</p>
            <button className="order-success-secondary-button" onClick={() => onNavigate('/?view=products')} type="button">
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <>
            <div className="order-success-confirmation">
              <span className="order-success-check" aria-hidden="true">✓</span>
              <h1 id="order-success-title">주문이 성공적으로 완료되었습니다!</h1>
              <p>주문해 주셔서 감사합니다.</p>
              <p>주문 내역과 결제 정보를 아래에서 확인하실 수 있습니다.</p>
            </div>

            <section className="order-success-card" aria-labelledby="order-info-title">
              <h2 id="order-info-title"><span aria-hidden="true">◇</span> 주문 정보</h2>
              <dl className="order-success-details">
                <div>
                  <dt>주문번호</dt>
                  <dd>{order.orderNumber}</dd>
                </div>
                <div>
                  <dt>주문 날짜</dt>
                  <dd>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</dd>
                </div>
                <div>
                  <dt>결제 방법</dt>
                  <dd>{order.payment.method}</dd>
                </div>
                <div>
                  <dt>결제 상태</dt>
                  <dd className="order-success-paid">결제 완료</dd>
                </div>
              </dl>
              <div className="order-success-items">
                {order.items.map((item) => (
                  <div className="order-success-item" key={item._id}>
                    <div>
                      <strong>{item.name}</strong>
                      {(item.size || item.color) && (
                        <span>{[item.size, item.color].filter(Boolean).join(' · ')}</span>
                      )}
                      <span>{item.quantity}개</span>
                    </div>
                    <strong>{Number(item.lineTotal).toLocaleString('ko-KR')}원</strong>
                  </div>
                ))}
              </div>
              <div className="order-success-total">
                <span>총 결제 금액</span>
                <strong>{Number(order.totalAmount).toLocaleString('ko-KR')}원</strong>
              </div>
            </section>

            {cartCleanupError && <p className="order-success-warning" role="alert">{cartCleanupError}</p>}
            <div className="order-success-actions">
              <button
                className="order-success-primary-button"
                onClick={() => onNavigate('/account/orders')}
                type="button"
              >
                주문 목록 보기
              </button>
              <button
                className="order-success-secondary-button"
                onClick={() => onNavigate('/?view=products')}
                type="button"
              >
                계속 쇼핑하기
              </button>
            </div>
          </>
        )}
      </section>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

export default OrderSuccessPage
