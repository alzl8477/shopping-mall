import { useEffect, useState } from 'react'
import Navbar from './Navbar'
import SiteFooter from '../components/SiteFooter'
import {
  collectionErrorMessage,
  loadAccountCollection,
  removeCartItem,
  removeWishlistItem,
  updateCartItem,
} from '../lib/accountCollection'
import { getCartItemKey } from '../lib/cartItems'

function AccountCollectionPage({
  mode,
  onNavigate,
  currentUser,
  onLogout,
  authMessage,
}) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyProductId, setBusyProductId] = useState('')
  const [selectedCartItemKeys, setSelectedCartItemKeys] = useState([])
  const isCart = mode === 'cart'

  useEffect(() => {
    const controller = new AbortController()

    async function loadItems() {
      setIsLoading(true)
      setError('')
      try {
        const collection = await loadAccountCollection()
        if (!controller.signal.aborted) {
          const nextItems = isCart ? collection.cart : collection.wishlist
          setItems(nextItems)
          if (isCart) setSelectedCartItemKeys(nextItems.map(getCartItemKey))
        }
      } catch (loadError) {
        if (!controller.signal.aborted) setError(collectionErrorMessage(loadError))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadItems()
    return () => controller.abort()
  }, [isCart])

  async function handleRemove(productId) {
    setBusyProductId(productId)
    setError('')
    try {
      if (isCart) {
        await removeCartItem(productId)
      } else {
        await removeWishlistItem(productId)
      }
      setItems((currentItems) => currentItems.filter((item) => (
        isCart
          ? item.product._id !== productId
          : item._id !== productId
      )))
    } catch (removeError) {
      setError(collectionErrorMessage(removeError))
    } finally {
      setBusyProductId('')
    }
  }

  async function changeQuantity(productId, quantity) {
    setBusyProductId(productId)
    setError('')
    try {
      await updateCartItem(productId, quantity)
      setItems((currentItems) => currentItems.map((item) => (
        item.product._id === productId ? { ...item, quantity } : item
      )))
    } catch (updateError) {
      setError(collectionErrorMessage(updateError))
    } finally {
      setBusyProductId('')
    }
  }

  const selectedCartItems = items.filter((item) => (
    selectedCartItemKeys.includes(getCartItemKey(item))
  ))
  const selectedTotal = selectedCartItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  )
  const selectedTotalItems = selectedCartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  )
  const allCartItemsSelected = isCart && items.length > 0 && selectedCartItems.length === items.length

  function toggleCartItemSelection(item) {
    const key = getCartItemKey(item)
    setSelectedCartItemKeys((currentKeys) => (
      currentKeys.includes(key)
        ? currentKeys.filter((currentKey) => currentKey !== key)
        : [...currentKeys, key]
    ))
  }

  function toggleAllCartItems() {
    setSelectedCartItemKeys(allCartItemsSelected ? [] : items.map(getCartItemKey))
  }

  function purchaseSelectedItems() {
    const params = new URLSearchParams({ source: 'cart' })
    selectedCartItems.forEach((item) => {
      params.append('line', getCartItemKey(item))
    })
    onNavigate(`/checkout?${params.toString()}`)
  }

  return (
    <main className="storefront">
      <Navbar
        authMessage={authMessage}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <section
        className={`account-collection-page${isCart ? ' cart-collection-page' : ''}`}
        aria-labelledby="account-collection-title"
      >
        <p className="section-label">MAISON LUNE</p>
        <h1 id="account-collection-title">{isCart ? '장바구니' : '위시리스트'}</h1>
        <p className="account-collection-subtitle">
          {isCart ? '담아 둔 상품을 확인해 보세요.' : '마음에 드는 상품을 모아두었어요.'}
        </p>

        {error && <p className="account-collection-error" role="alert">{error}</p>}
        {isLoading ? (
          <p className="account-collection-state" role="status">불러오는 중입니다.</p>
        ) : items.length ? (
          <div className={isCart ? 'cart-page-layout' : 'account-collection-list'}>
            <div className={isCart ? 'cart-item-column' : undefined}>
              {isCart && (
                <div className="cart-selection-toolbar">
                  <label className="cart-select-control">
                    <input
                      checked={allCartItemsSelected}
                      onChange={toggleAllCartItems}
                      type="checkbox"
                    />
                    <span>전체 선택 ({selectedCartItems.length}/{items.length})</span>
                  </label>
                </div>
              )}
              <div className={isCart ? 'account-collection-list cart-item-list' : undefined}>
              {items.map((item) => {
                const product = isCart ? item.product : item
                return (
                  <article
                    className="account-collection-item"
                    key={isCart ? getCartItemKey(item) : product._id}
                  >
                    {isCart && (
                      <label className="cart-item-checkbox">
                        <input
                          aria-label={`${product.name} 선택`}
                          checked={selectedCartItemKeys.includes(getCartItemKey(item))}
                          onChange={() => toggleCartItemSelection(item)}
                          type="checkbox"
                        />
                      </label>
                    )}
                    <button
                      className="account-collection-item-main"
                      onClick={() => onNavigate(`/products/${product._id}`)}
                      type="button"
                    >
                      <span className="account-collection-image">
                        {product.image
                          ? <img alt="" src={product.image} />
                          : <span>이미지 없음</span>}
                      </span>
                      <span className="account-collection-product-copy">
                        <span>{product.category}</span>
                        <strong>{product.name}</strong>
                        {isCart && item.size && <span>사이즈 · {item.size}</span>}
                        {isCart && item.color && <span>컬러 · {item.color}</span>}
                        <span>{Number(isCart ? item.price : product.price).toLocaleString('ko-KR')}원</span>
                      </span>
                    </button>

                    <div className="account-collection-item-actions">
                      {isCart && (
                        <div className="cart-quantity-control" aria-label={`${product.name} 수량`}>
                          <button
                            aria-label="수량 줄이기"
                            disabled={busyProductId === product._id || item.quantity <= 1}
                            onClick={() => changeQuantity(product._id, item.quantity - 1)}
                            type="button"
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            aria-label="수량 늘리기"
                            disabled={busyProductId === product._id}
                            onClick={() => changeQuantity(product._id, item.quantity + 1)}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      )}
                      <button
                        className="account-collection-remove"
                        disabled={busyProductId === product._id}
                        onClick={() => handleRemove(product._id)}
                        type="button"
                      >
                        {busyProductId === product._id ? '처리 중' : '삭제'}
                      </button>
                    </div>
                  </article>
                )
              })}
              </div>
              {isCart && (
                <div className="cart-list-total">
                  <span>선택 상품 금액 ({selectedTotalItems}개)</span>
                  <strong>{selectedTotal.toLocaleString('ko-KR')}원</strong>
                </div>
              )}
            </div>
            {isCart && (
              <aside className="cart-summary" aria-label="주문 요약">
                <h2>주문 요약</h2>
                <div className="cart-summary-row">
                  <span>상품 수량 ({selectedTotalItems}개)</span>
                  <strong>{selectedTotal.toLocaleString('ko-KR')}원</strong>
                </div>
                <div className="cart-summary-row">
                  <span>배송비</span>
                  <strong className="cart-shipping-free">무료</strong>
                </div>
                <div className="cart-summary-total">
                  <span>총 결제금액</span>
                  <strong>{selectedTotal.toLocaleString('ko-KR')}원</strong>
                </div>
                <button
                  className="cart-checkout-button"
                  disabled={selectedCartItems.length === 0}
                  onClick={purchaseSelectedItems}
                  type="button"
                >
                  결제하기
                </button>
                <button
                  className="cart-continue-button"
                  onClick={() => onNavigate('/?view=products')}
                  type="button"
                >
                  쇼핑 계속하기
                </button>
              </aside>
            )}
          </div>
        ) : (
          <div className="account-collection-state">
            <p>{isCart ? '장바구니가 비어 있습니다.' : '아직 찜한 상품이 없습니다.'}</p>
            <button
              onClick={() => onNavigate('/?view=products')}
              type="button"
            >
              상품 둘러보기
            </button>
          </div>
        )}
      </section>

      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

export default AccountCollectionPage
