import { useState } from 'react'
import SiteFooter from '../components/SiteFooter'

function OrderFailurePage({ onNavigate }) {
  const [message] = useState(() => {
    const failureMessage = sessionStorage.getItem('checkout-failure-message')
    sessionStorage.removeItem('checkout-failure-message')
    return failureMessage || '주문을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  })

  return (
    <main className="storefront order-failure-page">
      <header className="order-success-topbar">
        <span>Order Status</span>
      </header>
      <section className="order-failure-content" aria-labelledby="order-failure-title">
        <div className="order-failure-icon" aria-hidden="true">!</div>
        <p className="order-failure-eyebrow">ORDER NOT COMPLETED</p>
        <h1 id="order-failure-title">주문을 완료하지 못했습니다.</h1>
        <p className="order-failure-message">{message}</p>
        <p className="order-failure-note">
          결제가 진행되었는지 확실하지 않다면 주문 내역 또는 결제 수단을 먼저 확인해 주세요.
        </p>
        <div className="order-failure-actions">
          <button
            className="order-failure-primary-button"
            onClick={() => onNavigate('/?view=products')}
            type="button"
          >
            쇼핑 계속하기
          </button>
          <button
            className="order-failure-secondary-button"
            onClick={() => onNavigate('/account/cart')}
            type="button"
          >
            장바구니 확인
          </button>
        </div>
      </section>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

export default OrderFailurePage
