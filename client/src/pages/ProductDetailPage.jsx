import { useEffect, useState } from 'react'
import Navbar from './Navbar'
import SiteFooter from '../components/SiteFooter'
import {
  addCartItem,
  addWishlistItem,
  collectionErrorMessage,
  loadAccountCollection,
  removeWishlistItem,
} from '../lib/accountCollection'

const productTabs = [
  { id: 'info', label: '상품정보' },
  { id: 'reviews', label: '리뷰' },
  { id: 'collection', label: '컬렉션 더 둘러보기' },
]

function ProductDetailTabs({ product, onNavigate }) {
  const [activeTab, setActiveTab] = useState('info')
  const [categoryProducts, setCategoryProducts] = useState(null)
  const [isCollectionLoading, setIsCollectionLoading] = useState(false)
  const [collectionError, setCollectionError] = useState('')
  const [collectionRequestId, setCollectionRequestId] = useState(0)
  // 리뷰 기능(API)이 아직 없어 빈 목록으로 둡니다.
  const reviews = []
  const hasLoadedCollection = categoryProducts !== null

  useEffect(() => {
    if (activeTab !== 'collection' || hasLoadedCollection) return undefined

    const controller = new AbortController()

    async function loadCollection() {
      setIsCollectionLoading(true)
      setCollectionError('')
      try {
        const response = await fetch('/api/products', { signal: controller.signal })
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(result?.message || '상품 목록을 불러오지 못했습니다.')
        }
        if (!Array.isArray(result)) {
          throw new Error('상품 목록 응답 형식이 올바르지 않습니다.')
        }
        setCategoryProducts(result)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setCollectionError(
            loadError.message === 'Failed to fetch'
              ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
              : loadError.message,
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsCollectionLoading(false)
      }
    }

    loadCollection()
    return () => controller.abort()
  }, [activeTab, hasLoadedCollection, collectionRequestId])

  const relatedProducts = (categoryProducts || []).filter(
    (item) => item.category === product.category && item._id !== product._id,
  )

  return (
    <section className="product-detail-tabs" aria-label="상품 상세 정보">
      <div className="product-detail-tablist" role="tablist">
        {productTabs.map((tab) => (
          <button
            aria-controls={`product-tabpanel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'is-active' : ''}
            id={`product-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.id === 'reviews' ? `${tab.label} (${reviews.length})` : tab.label}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`product-tab-${activeTab}`}
        className="product-detail-tabpanel"
        id={`product-tabpanel-${activeTab}`}
        role="tabpanel"
      >
        {activeTab === 'info' && (
          <div className="product-detail-description">
            <p>{product.description}</p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <p className="product-detail-tab-state">
            {reviews.length ? '' : '아직 등록된 리뷰가 없습니다.'}
          </p>
        )}

        {activeTab === 'collection' && (
          isCollectionLoading ? (
            <p className="product-detail-tab-state" role="status">상품을 불러오는 중입니다.</p>
          ) : collectionError ? (
            <div className="product-detail-tab-state" role="alert">
              <p>{collectionError}</p>
              <button
                onClick={() => setCollectionRequestId((currentId) => currentId + 1)}
                type="button"
              >
                다시 시도
              </button>
            </div>
          ) : relatedProducts.length > 0 ? (
            <>
              <p className="product-detail-collection-title">
                {product.category} 카테고리 상품 {relatedProducts.length}개
              </p>
              <div className="home-product-grid">
                {relatedProducts.map((item) => (
                  <button
                    className="home-product-card"
                    key={item._id || item.sku}
                    onClick={() => onNavigate(
                      `/products/${encodeURIComponent(item._id)}?category=${encodeURIComponent(item.category)}`,
                    )}
                    type="button"
                  >
                    <span className="home-product-image">
                      {item.image ? (
                        <img alt="" loading="lazy" src={item.image} />
                      ) : (
                        <span>이미지 준비 중</span>
                      )}
                    </span>
                    <span className="home-product-details">
                      <span className="home-product-category">{item.category}</span>
                      <span className="home-product-name">{item.name}</span>
                      <span className="home-product-price">
                        {Number(item.price).toLocaleString('ko-KR')}원
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="product-detail-tab-state">
              {product.category} 카테고리에 다른 상품이 없습니다.
            </p>
          )
        )}
      </div>
    </section>
  )
}

function ProductDetailPage({
  productId,
  category,
  onNavigate,
  currentUser,
  onLogout,
  authMessage,
}) {
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [wishlistedProductId, setWishlistedProductId] = useState('')
  const [isCartLoading, setIsCartLoading] = useState(false)
  const [isWishlistLoading, setIsWishlistLoading] = useState(false)
  const [cartAdded, setCartAdded] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const isWishlisted = wishlistedProductId === productId

  useEffect(() => {
    const controller = new AbortController()

    async function loadProduct() {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
          signal: controller.signal,
        })
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? '상품을 찾을 수 없습니다.'
              : result?.message || '상품 정보를 불러오지 못했습니다.',
          )
        }
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
          throw new Error('상품 정보 응답 형식이 올바르지 않습니다.')
        }
        setProduct(result)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(
            loadError.message === 'Failed to fetch'
              ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
              : loadError.message,
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadProduct()
    return () => controller.abort()
  }, [productId, requestId])

  useEffect(() => {
    let isCurrent = true
    if (!currentUser || !sessionStorage.getItem('maison-lune-token')) {
      return () => {
        isCurrent = false
      }
    }

    async function loadWishlistStatus() {
      try {
        const collection = await loadAccountCollection()
        if (isCurrent) {
          setWishlistedProductId(
            collection.wishlist.some((item) => item._id === productId) ? productId : '',
          )
          setActionError('')
        }
      } catch (loadError) {
        if (isCurrent) setActionError(collectionErrorMessage(loadError))
      }
    }

    loadWishlistStatus()
    return () => {
      isCurrent = false
    }
  }, [currentUser, productId])

  function requireLogin() {
    if (currentUser && sessionStorage.getItem('maison-lune-token')) return true
    const returnTo = `${window.location.pathname}${window.location.search}`
    onNavigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)
    return false
  }

  async function handleAddToCart() {
    if (!requireLogin()) return
    setIsCartLoading(true)
    setActionError('')
    setActionMessage('')
    setCartAdded(false)
    try {
      await addCartItem(productId, quantity)
      setCartAdded(true)
      setActionMessage('장바구니에 상품을 담았습니다.')
      window.setTimeout(() => setCartAdded(false), 900)
    } catch (addError) {
      setActionError(collectionErrorMessage(addError))
    } finally {
      setIsCartLoading(false)
    }
  }

  async function handleToggleWishlist() {
    if (!requireLogin()) return
    setIsWishlistLoading(true)
    setActionError('')
    setActionMessage('')
    try {
      if (isWishlisted) {
        await removeWishlistItem(productId)
        setWishlistedProductId('')
        setActionMessage('위시리스트에서 삭제했습니다.')
      } else {
        await addWishlistItem(productId)
        setWishlistedProductId(productId)
        setActionMessage('위시리스트에 저장했습니다.')
      }
    } catch (wishlistError) {
      setActionError(collectionErrorMessage(wishlistError))
    } finally {
      setIsWishlistLoading(false)
    }
  }

  function handleBuyNow() {
    if (!requireLogin()) return
    onNavigate(
      `/checkout?productId=${encodeURIComponent(productId)}&quantity=${quantity}`,
    )
  }

  function returnToCollection() {
    if (category) {
      onNavigate(`/?view=products&category=${encodeURIComponent(category)}`)
      return
    }
    onNavigate('/')
  }

  return (
    <main className="storefront">
      <Navbar
        authMessage={authMessage}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <div className="product-detail-page">
        {isLoading ? (
          <p className="product-detail-state" role="status">상품 정보를 불러오는 중입니다.</p>
        ) : error ? (
          <div className="product-detail-state product-detail-error" role="alert">
            <p>{error}</p>
            <div>
              <button onClick={returnToCollection} type="button">상품 목록으로 돌아가기</button>
              {error !== '상품을 찾을 수 없습니다.' && (
                <button
                  onClick={() => setRequestId((currentId) => currentId + 1)}
                  type="button"
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        ) : product ? (
          <>
            <button
              className="product-detail-back"
              onClick={returnToCollection}
              type="button"
            >
              <span aria-hidden="true">←</span> 상품 목록
            </button>
            <section aria-labelledby="product-detail-name" className="product-detail-layout">
              <div className="product-detail-gallery">
                <div className="product-detail-thumbnails" aria-label="상품 이미지">
                  <button
                    aria-label="대표 이미지"
                    aria-current="true"
                    className="is-active"
                    type="button"
                  >
                    {product.image ? (
                      <img alt="" src={product.image} />
                    ) : (
                      <span>이미지 없음</span>
                    )}
                  </button>
                </div>
                <div className="product-detail-main-image">
                  {product.image ? (
                    <img alt={product.name} src={product.image} />
                  ) : (
                    <span>상품 이미지가 없습니다.</span>
                  )}
                </div>
              </div>

              <div className="product-detail-information">
                <p className="product-detail-category">{product.category}</p>
                <h1 id="product-detail-name">{product.name}</h1>
                <div className="product-detail-title-row">
                  <p className="product-detail-sku">SKU · {product.sku}</p>
                  <button
                    aria-pressed={isWishlisted}
                    className={`product-wishlist-button${isWishlisted ? ' is-active' : ''}`}
                    disabled={isWishlistLoading}
                    onClick={handleToggleWishlist}
                    type="button"
                  >
                    <span aria-hidden="true">{isWishlisted ? '♥' : '♡'}</span>
                    {isWishlisted ? '찜 완료' : '찜하기'}
                  </button>
                </div>

                <div className="product-detail-price">
                  <span>판매가</span>
                  <strong>{Number(product.price).toLocaleString('ko-KR')}<small>원</small></strong>
                </div>

                <dl className="product-detail-meta">
                  <div>
                    <dt>카테고리</dt>
                    <dd>{product.category}</dd>
                  </div>
                  <div>
                    <dt>상품 코드</dt>
                    <dd>{product.sku}</dd>
                  </div>
                </dl>

                <div className="product-purchase-panel">
                  <div className="product-quantity-row">
                    <span>수량</span>
                    <div className="cart-quantity-control" aria-label="구매 수량">
                      <button
                        aria-label="수량 줄이기"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                        type="button"
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button
                        aria-label="수량 늘리기"
                        onClick={() => setQuantity((value) => value + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="product-order-total">
                    <span>주문 금액</span>
                    <strong>{(Number(product.price) * quantity).toLocaleString('ko-KR')}원</strong>
                  </p>
                  {actionError && <p className="product-action-error" role="alert">{actionError}</p>}
                  {actionMessage && <p className="product-action-message" role="status">{actionMessage}</p>}
                  <div className="product-purchase-actions">
                    <button
                      className={`product-add-cart-button${cartAdded ? ' is-added' : ''}`}
                      disabled={isCartLoading}
                      onClick={handleAddToCart}
                      type="button"
                    >
                      <span aria-hidden="true">{cartAdded ? '✓' : '＋'}</span>
                      {isCartLoading ? '담는 중...' : cartAdded ? '담았어요' : '장바구니'}
                    </button>
                    <button
                      className="product-buy-button"
                      onClick={handleBuyNow}
                      type="button"
                    >
                      구매하기
                    </button>
                  </div>
                </div>
              </div>
            </section>
            <ProductDetailTabs
              key={product._id}
              onNavigate={onNavigate}
              product={product}
            />
          </>
        ) : null}
      </div>

      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

export default ProductDetailPage
