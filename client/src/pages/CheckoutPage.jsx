import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from './Navbar'
import SiteFooter from '../components/SiteFooter'
import {
  cancelOrder,
  collectionErrorMessage,
  createOrder,
  loadAccountCollection,
  removeCartItems,
  verifyOrderPayment,
} from '../lib/accountCollection'
import { getCartItemKey } from '../lib/cartItems'

const checkoutSteps = ['배송 정보', '결제 방법']
const portOnePg = import.meta.env.VITE_PORTONE_PG || 'html5_inicis.INIpayTest'
const paymentMethods = [
  { value: 'card', label: '신용카드', portOneMethod: 'card' },
  { value: 'bank_transfer', label: '실시간 계좌이체', portOneMethod: 'trans' },
  { value: 'virtual_account', label: '가상계좌', portOneMethod: 'vbank' },
  { value: 'mobile', label: '휴대폰 결제', portOneMethod: 'phone' },
]

function CheckoutPage({
  productId,
  quantity,
  fromCart,
  selectedCartItemKeys,
  onNavigate,
  currentUser,
  onLogout,
  authMessage,
}) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [paymentInitError, setPaymentInitError] = useState('')
  const [cartCleanupError, setCartCleanupError] = useState('')
  const [pendingImpUid, setPendingImpUid] = useState('')
  const [step, setStep] = useState(0)
  const [order, setOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const isPortOneInitialized = useRef(false)
  const checkoutId = useRef(crypto.randomUUID())
  const [shipping, setShipping] = useState({
    recipientName: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    deliveryNote: '',
  })

  function initializePortOne() {
    if (isPortOneInitialized.current) return

    if (!window.IMP) {
      setPaymentInitError('포트원 결제 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.')
      return
    }

    try {
      window.IMP.init('imp38067021')
      isPortOneInitialized.current = true
    } catch (initializationError) {
      setPaymentInitError(
        initializationError instanceof Error
          ? initializationError.message
          : '포트원 결제 모듈을 초기화하지 못했습니다.',
      )
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadCheckoutItems() {
      setIsLoading(true)
      setError('')
      try {
        if (fromCart) {
          const collection = await loadAccountCollection()
          if (!collection.cart.length) {
            throw new Error('장바구니에 담긴 상품이 없습니다.')
          }
          const checkoutItems = selectedCartItemKeys === null
            ? collection.cart
            : collection.cart.filter((item) => (
              selectedCartItemKeys.includes(getCartItemKey(item))
            ))
          if (!checkoutItems.length) {
            throw new Error('선택한 상품을 찾을 수 없습니다. 장바구니에서 다시 선택해 주세요.')
          }
          if (!controller.signal.aborted) setItems(checkoutItems)
        } else {
          if (!productId) {
            throw new Error('구매할 상품을 찾을 수 없습니다.')
          }
          const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
            signal: controller.signal,
          })
          const result = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(response.status === 404
              ? '상품을 찾을 수 없습니다.'
              : result?.message || '상품 정보를 불러오지 못했습니다.')
          }
          if (!controller.signal.aborted) {
            setItems([{ product: result, quantity }])
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

    loadCheckoutItems()
    return () => controller.abort()
  }, [fromCart, productId, quantity, selectedCartItemKeys])

  const subtotal = useMemo(() => items.reduce(
    (sum, item) => sum + Number(item.price ?? item.product.price) * item.quantity,
    0,
  ), [items])
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  function updateShipping(event) {
    const { name, value } = event.target
    setShipping((current) => ({ ...current, [name]: value }))
  }

  function validateShipping() {
    const required = [
      ['recipientName', '받는 분 성함을 입력해 주세요.'],
      ['phone', '연락처를 입력해 주세요.'],
      ['address1', '주소를 입력해 주세요.'],
      ['city', '도시를 입력해 주세요.'],
      ['postalCode', '우편번호를 입력해 주세요.'],
    ]
    const missing = required.find(([field]) => !shipping[field].trim())
    if (missing) {
      setError(missing[1])
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email.trim())) {
      setError('올바른 이메일 주소를 입력해 주세요.')
      return false
    }
    setError('')
    return true
  }

  function continueToPayment(event) {
    event.preventDefault()
    if (validateShipping()) {
      initializePortOne()
      setStep(1)
    }
  }

  function showOrderFailure(message) {
    sessionStorage.setItem('checkout-failure-message', message)
    onNavigate('/order-failure')
  }

  function requestPortOnePayment(paymentRequest) {
    return new Promise((resolve, reject) => {
      try {
        window.IMP.request_pay(paymentRequest, resolve)
      } catch (requestError) {
        reject(requestError)
      }
    })
  }

  async function finishPaidOrder(paidOrder) {
    if (fromCart) {
      try {
        await removeCartItems(items.map((item) => ({
          productId: item.product._id,
          size: item.size || '',
          color: item.color || '',
        })))
      } catch (cleanupError) {
        sessionStorage.setItem(
          'checkout-cart-cleanup-error',
          `결제는 확인됐지만 장바구니 정리에 실패했습니다. 장바구니에서 구매한 상품을 직접 삭제해 주세요. (${collectionErrorMessage(cleanupError)})`,
        )
      }
    }
    setPendingImpUid('')
    onNavigate(`/order-success?orderId=${encodeURIComponent(paidOrder._id)}`)
  }

  async function submitOrder() {
    if (isSubmitting) return
    if (!isPortOneInitialized.current || !window.IMP?.request_pay) {
      showOrderFailure(
        paymentInitError || '포트원 결제 모듈을 사용할 수 없습니다. 페이지를 새로고침해 주세요.',
      )
      return
    }

    setIsSubmitting(true)
    setError('')
    setCartCleanupError('')
    let createdOrder
    let shouldCancelOrder = true
    let paymentInitiated = false
    let paymentImpUid = ''
    try {
      createdOrder = await createOrder({
        checkoutId: checkoutId.current,
        items: items.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          size: item.size || '',
          color: item.color || '',
        })),
        shippingAddress: {
          recipientName: shipping.recipientName.trim(),
          email: shipping.email.trim(),
          phone: shipping.phone.trim(),
          postalCode: shipping.postalCode.trim(),
          address1: `${shipping.address1.trim()}, ${shipping.city.trim()}`,
          address2: shipping.address2.trim(),
          deliveryNote: shipping.deliveryNote.trim(),
        },
        paymentMethod,
      })

      const paymentResult = await requestPortOnePayment({
        pg: portOnePg,
        pay_method: paymentMethods.find((method) => method.value === paymentMethod).portOneMethod,
        merchant_uid: createdOrder.orderNumber,
        name: createdOrder.items.length > 1
          ? `${createdOrder.items[0].name} 외 ${createdOrder.items.length - 1}건`
          : createdOrder.items[0].name,
        amount: createdOrder.totalAmount,
        buyer_email: shipping.email.trim(),
        buyer_name: shipping.recipientName.trim(),
        buyer_tel: shipping.phone.trim(),
        buyer_addr: [
          shipping.address1.trim(),
          shipping.address2.trim(),
          shipping.city.trim(),
        ].filter(Boolean).join(', '),
        buyer_postcode: shipping.postalCode.trim(),
      })

      if (!paymentResult?.success) {
        shouldCancelOrder = false
        const failureMessage = paymentResult?.error_msg || '결제가 취소되었거나 완료되지 않았습니다.'
        try {
          await cancelOrder(createdOrder._id)
          checkoutId.current = crypto.randomUUID()
        } catch (cancelError) {
          showOrderFailure(
            `${failureMessage} 미결제 주문 정리에 실패했습니다: ${collectionErrorMessage(cancelError)}`,
          )
          return
        }
        showOrderFailure(failureMessage)
        return
      }

      shouldCancelOrder = false
      paymentInitiated = true
      paymentImpUid = paymentResult.imp_uid || ''
      if (!paymentImpUid) {
        setOrder(createdOrder)
        setError('결제 응답에 거래번호가 없습니다. 주문 상태를 확인한 뒤 고객센터에 문의해 주세요.')
        return
      }

      const verification = await verifyOrderPayment(createdOrder._id, paymentImpUid)
      if (verification.pending) {
        setOrder(verification.order)
        setPendingImpUid(paymentImpUid)
        return
      }
      await finishPaidOrder(verification.order)
    } catch (submitError) {
      if (createdOrder && shouldCancelOrder) {
        try {
          await cancelOrder(createdOrder._id)
          checkoutId.current = crypto.randomUUID()
        } catch (cancelError) {
          showOrderFailure(
            `${collectionErrorMessage(submitError)} 미결제 주문 취소에도 실패했습니다: ${collectionErrorMessage(cancelError)}`,
          )
          return
        }
      }
      if (createdOrder && paymentInitiated) {
        setOrder(createdOrder)
        setPendingImpUid(paymentImpUid)
        setError(
          `결제 요청은 완료됐지만 서버 검증을 마치지 못했습니다. 결제 상태를 다시 확인해 주세요. (${collectionErrorMessage(submitError)})`,
        )
        return
      }
      showOrderFailure(collectionErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function retryPaymentVerification() {
    if (!order || !pendingImpUid || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const verification = await verifyOrderPayment(order._id, pendingImpUid)
      if (verification.pending) {
        setOrder(verification.order)
        setError('아직 입금이 확인되지 않았습니다. 입금 후 다시 확인해 주세요.')
        return
      }
      await finishPaidOrder(verification.order)
    } catch (verificationError) {
      setError(collectionErrorMessage(verificationError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="storefront">
      <Navbar
        authMessage={authMessage}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
      <section className="checkout-page" aria-labelledby="checkout-title">
        <div className="checkout-heading-row">
          <button
            aria-label="장바구니로 돌아가기"
            className="checkout-back-button"
            onClick={() => onNavigate(fromCart ? '/account/cart' : '/?view=products')}
            type="button"
          >
            ←
          </button>
          <div>
            <p className="section-label">ORDER</p>
            <h1 id="checkout-title">{order ? '주문 완료' : '주문 / 결제'}</h1>
          </div>
        </div>

        {isLoading ? (
          <p className="checkout-state" role="status">주문 정보를 불러오는 중입니다.</p>
        ) : error && !items.length ? (
          <div className="checkout-state" role="alert">
            <p>{error}</p>
            <button onClick={() => onNavigate('/account/cart')} type="button">
              장바구니로 돌아가기
            </button>
          </div>
        ) : order ? (
          <div className="checkout-success" role="status">
            <span className="checkout-success-mark">✓</span>
            <p className="section-label">
              {order.payment.status === 'paid' ? 'PAYMENT CONFIRMED' : 'PAYMENT PENDING'}
            </p>
            <h2>
              {order.payment.status === 'paid'
                ? '결제가 확인되었습니다.'
                : '결제 확인을 기다리는 중입니다.'}
            </h2>
            <p>주문번호 <strong>{order.orderNumber}</strong></p>
            <p className="checkout-success-note">
              {order.payment.status === 'paid'
                ? '포트원 결제 정보를 서버에서 검증했습니다.'
                : '결제가 확인되기 전까지 주문 상품은 장바구니에 유지됩니다. 가상계좌는 입금 후, 그 외 결제는 서버 검증이 완료된 후 장바구니에서 제거됩니다.'}
            </p>
            {pendingImpUid && order.payment.status !== 'paid' && (
              <button
                className="checkout-primary-button"
                disabled={isSubmitting}
                onClick={retryPaymentVerification}
                type="button"
              >
                {isSubmitting ? '결제 확인 중...' : '결제 상태 확인'}
              </button>
            )}
            {error && <p className="checkout-inline-error" role="alert">{error}</p>}
            {cartCleanupError && (
              <p className="checkout-inline-error" role="alert">{cartCleanupError}</p>
            )}
            <div className="checkout-success-actions">
              <button
                className="checkout-primary-button"
                onClick={() => onNavigate('/account/orders')}
                type="button"
              >
                주문 목록 보기
              </button>
              <button
                className="checkout-secondary-button"
                onClick={() => onNavigate('/?view=products')}
                type="button"
              >
                쇼핑 계속하기
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="checkout-intro">배송 정보를 입력하고 주문 내용을 확인해 주세요.</p>
            <div className="checkout-layout">
              <div className="checkout-main-column">
                <ol className="checkout-stepper" aria-label="주문 진행 단계">
                  {checkoutSteps.map((label, index) => (
                    <li
                      aria-current={step === index ? 'step' : undefined}
                      className={index <= step ? 'is-active' : ''}
                      key={label}
                    >
                      <span>{index + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>

                {step === 0 && (
                  <form className="checkout-form-card" onSubmit={continueToPayment}>
                    <div className="checkout-card-heading">
                      <span aria-hidden="true">01</span>
                      <h2>배송 정보</h2>
                    </div>
                    <div className="checkout-form-grid">
                      <label className="checkout-field checkout-field-wide">
                        <span>받는 분</span>
                        <input
                          autoComplete="name"
                          name="recipientName"
                          onChange={updateShipping}
                          placeholder="받는 분 성함"
                          required
                          value={shipping.recipientName}
                        />
                      </label>
                      <label className="checkout-field checkout-field-wide">
                        <span>이메일</span>
                        <input
                          autoComplete="email"
                          name="email"
                          onChange={updateShipping}
                          placeholder="you@example.com"
                          required
                          type="email"
                          value={shipping.email}
                        />
                      </label>
                      <label className="checkout-field checkout-field-wide">
                        <span>연락처</span>
                        <input
                          autoComplete="tel"
                          name="phone"
                          onChange={updateShipping}
                          placeholder="010-0000-0000"
                          required
                          type="tel"
                          value={shipping.phone}
                        />
                      </label>
                      <label className="checkout-field checkout-field-wide">
                        <span>주소</span>
                        <input
                          autoComplete="address-line1"
                          name="address1"
                          onChange={updateShipping}
                          placeholder="도로명 주소"
                          required
                          value={shipping.address1}
                        />
                      </label>
                      <label className="checkout-field checkout-field-wide">
                        <span>상세 주소 <small>선택</small></span>
                        <input
                          autoComplete="address-line2"
                          name="address2"
                          onChange={updateShipping}
                          placeholder="상세 주소"
                          value={shipping.address2}
                        />
                      </label>
                      <label className="checkout-field">
                        <span>도시</span>
                        <input
                          autoComplete="address-level2"
                          name="city"
                          onChange={updateShipping}
                          placeholder="서울"
                          required
                          value={shipping.city}
                        />
                      </label>
                      <label className="checkout-field">
                        <span>우편번호</span>
                        <input
                          autoComplete="postal-code"
                          name="postalCode"
                          onChange={updateShipping}
                          placeholder="12345"
                          required
                          value={shipping.postalCode}
                        />
                      </label>
                      <label className="checkout-field checkout-field-wide">
                        <span>배송 메모 <small>선택</small></span>
                        <textarea
                          name="deliveryNote"
                          onChange={updateShipping}
                          placeholder="배송 시 요청사항을 입력해 주세요."
                          rows="3"
                          value={shipping.deliveryNote}
                        />
                      </label>
                    </div>
                    {error && <p className="checkout-inline-error" role="alert">{error}</p>}
                    <button className="checkout-primary-button" type="submit">
                      결제 방법 선택
                    </button>
                  </form>
                )}

                {step === 1 && (
                  <section className="checkout-form-card" aria-labelledby="payment-step-title">
                    <div className="checkout-card-heading">
                      <span aria-hidden="true">02</span>
                      <h2 id="payment-step-title">결제 방법</h2>
                    </div>
                    <fieldset className="checkout-payment-options">
                      <legend className="visually-hidden">결제 방법 선택</legend>
                      {paymentMethods.map((method) => (
                        <label className="checkout-payment-option" key={method.value}>
                          <input
                            checked={paymentMethod === method.value}
                            disabled={isSubmitting}
                            name="paymentMethod"
                            onChange={() => setPaymentMethod(method.value)}
                            type="radio"
                            value={method.value}
                          />
                          <span>{method.label}</span>
                        </label>
                      ))}
                    </fieldset>
                    <p className="checkout-payment-help">
                      선택한 결제 방법의 결제창이 열립니다. 결제 수단은 PG 설정에 따라 달라질 수 있습니다.
                    </p>
                    {paymentInitError && (
                      <p className="checkout-inline-error" role="alert">{paymentInitError}</p>
                    )}
                    {error && <p className="checkout-inline-error" role="alert">{error}</p>}
                    <div className="checkout-form-actions">
                      <button
                        className="checkout-secondary-button"
                        onClick={() => setStep(0)}
                        type="button"
                      >
                        배송 정보 수정
                      </button>
                      <button
                        className="checkout-primary-button"
                        disabled={isSubmitting}
                        onClick={submitOrder}
                        type="button"
                      >
                        {isSubmitting
                          ? '결제 진행 중...'
                          : `결제하기 · ${subtotal.toLocaleString('ko-KR')}원`}
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <aside className="checkout-order-summary" aria-label="주문 요약">
                <h2>주문 요약</h2>
                <div className="checkout-summary-items">
                  {items.map((item) => (
                    <article className="checkout-summary-item" key={getCartItemKey(item)}>
                      <div className="checkout-summary-image">
                        {item.product.image
                          ? <img alt="" src={item.product.image} />
                          : <span>이미지 없음</span>}
                        <span className="checkout-summary-quantity">{item.quantity}</span>
                      </div>
                      <div className="checkout-summary-copy">
                        <strong>{item.product.name}</strong>
                        {(item.size || item.color) && (
                          <span>
                            {[item.size, item.color].filter(Boolean).join(' · ')}
                          </span>
                        )}
                        <span>{Number(item.price ?? item.product.price).toLocaleString('ko-KR')}원</span>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="checkout-summary-row">
                  <span>상품 금액 ({totalItems}개)</span>
                  <strong>{subtotal.toLocaleString('ko-KR')}원</strong>
                </div>
                <div className="checkout-summary-row">
                  <span>배송비</span>
                  <strong className="is-free">무료</strong>
                </div>
                <div className="checkout-summary-total">
                  <span>총 결제 예정 금액</span>
                  <strong>{subtotal.toLocaleString('ko-KR')}원</strong>
                </div>
                <p className="checkout-summary-caption">
                  결제창에서 결제를 완료해 주세요.
                </p>
              </aside>
            </div>
          </>
        )}
      </section>
      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

export default CheckoutPage
