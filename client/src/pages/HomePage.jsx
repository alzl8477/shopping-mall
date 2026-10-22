import { useEffect, useRef, useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import Navbar from './Navbar'

const productCategories = ['BEST', '전체', '주방', '거실', '침실', '욕실', '패브릭', '조명', '소품']

function HomePage({
  onNavigate,
  currentUser,
  onLogout,
  authMessage,
  initialCategory,
  showCollectionInitially = false,
}) {
  const [showProducts, setShowProducts] = useState(showCollectionInitially)
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(
    productCategories.includes(initialCategory) ? initialCategory : '전체',
  )
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [productsRequestId, setProductsRequestId] = useState(0)
  const productsSectionRef = useRef(null)
  const visibleProducts = selectedCategory === '전체'
    ? products
    : selectedCategory === 'BEST'
      ? []
      : products.filter((product) => product.category === selectedCategory)

  function navigateToSignup() {
    onNavigate('/signup')
  }

  function exploreProducts() {
    setShowProducts(true)
  }

  useEffect(() => {
    if (!showProducts) return undefined

    const controller = new AbortController()

    async function loadProducts() {
      setIsLoadingProducts(true)
      setProductsError('')
      try {
        const response = await fetch('/api/products', { signal: controller.signal })
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(result?.message || '상품 정보를 불러오지 못했습니다.')
        }
        if (!Array.isArray(result)) {
          throw new Error('상품 정보 응답 형식이 올바르지 않습니다.')
        }
        setProducts(result)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setProductsError(
            error.message === 'Failed to fetch'
              ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
              : error.message,
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingProducts(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [showProducts, productsRequestId])

  useEffect(() => {
    if (showCollectionInitially) setShowProducts(true)
  }, [showCollectionInitially])

  useEffect(() => {
    if (showProducts) {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showProducts])

  return (
    <main className="storefront">
      <Navbar
        currentUser={currentUser}
        authMessage={authMessage}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <HomeHero onExplore={exploreProducts} />
      {showProducts && (
        <section
          aria-labelledby="home-products-title"
          className="home-products"
          id="products"
          ref={productsSectionRef}
        >
          <div className="home-products-heading">
            <p className="section-label">MAISON LUNE COLLECTION</p>
            <h2 id="home-products-title">오래 곁에 둘 물건들</h2>
            <p>일상에 작은 온기를 더해 줄 메종 륀의 컬렉션을 만나보세요.</p>
          </div>

          {isLoadingProducts ? (
            <p className="home-products-state" role="status">상품을 불러오는 중입니다.</p>
          ) : productsError ? (
            <div className="home-products-state home-products-error" role="alert">
              <p>{productsError}</p>
              <button
                onClick={() => setProductsRequestId((requestId) => requestId + 1)}
                type="button"
              >
                다시 시도
              </button>
            </div>
          ) : products.length > 0 ? (
            <div className="home-products-layout">
              <nav className="home-product-categories" aria-label="상품 카테고리">
                {productCategories.map((category) => {
                  const count = category === '전체'
                    ? products.length
                    : category === 'BEST'
                      ? null
                      : products.filter((product) => product.category === category).length
                  return (
                    <button
                      aria-pressed={selectedCategory === category}
                      className={[
                        selectedCategory === category ? 'is-active' : '',
                        category === 'BEST' ? 'is-best' : '',
                      ].filter(Boolean).join(' ')}
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      type="button"
                    >
                      <span>{category}</span>
                      {count !== null && (
                        <span className="home-product-category-count">{count}</span>
                      )}
                    </button>
                  )
                })}
              </nav>
              {visibleProducts.length > 0 ? (
                <div className="home-product-grid">
                  {visibleProducts.map((product) => (
                    <button
                      className="home-product-card"
                      key={product._id || product.sku}
                      onClick={() => onNavigate(
                        `/products/${encodeURIComponent(product._id)}?category=${encodeURIComponent(selectedCategory)}`,
                      )}
                      type="button"
                    >
                      <span className="home-product-image">
                        {product.image ? (
                          <img alt="" loading="lazy" src={product.image} />
                        ) : (
                          <span>이미지 준비 중</span>
                        )}
                      </span>
                      <span className="home-product-details">
                        <span className="home-product-category">{product.category}</span>
                        <span className="home-product-name">{product.name}</span>
                        <span className="home-product-price">
                          {Number(product.price).toLocaleString('ko-KR')}원
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="home-products-state">
                  {selectedCategory === 'BEST'
                    ? '베스트 상품을 준비 중입니다.'
                    : `${selectedCategory} 카테고리에 등록된 상품이 없습니다.`}
                </p>
              )}
            </div>
          ) : (
            <p className="home-products-state">아직 등록된 상품이 없습니다.</p>
          )}
        </section>
      )}
      <HomeIntro onSignup={navigateToSignup} />

      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

function HomeHero({ onExplore }) {
  return (
    <section className="home-hero" id="collection">
      <div className="hero-copy">
        <p className="section-label">NEW SEASON · 2026</p>
        <h1>
          일상에 머무는
          <br />
          아름다움.
        </h1>
        <p className="hero-description">
          오래 곁에 둘 수 있는 물건과
          <br />
          천천히 발견하는 새로운 취향.
        </p>
        <button className="shop-link" type="button" onClick={onExplore}>
          메종 륀 시작하기 <span aria-hidden="true">↗</span>
        </button>
        <div className="hero-index">
          <span>01</span>
          <span className="index-line" />
          <span>03</span>
        </div>
      </div>

      <div
        className="hero-art"
        role="img"
        aria-label="따뜻한 빛이 드는 미니멀한 공간"
      >
        <div className="art-sun" />
        <div className="art-window">
          <span />
          <span />
        </div>
        <div className="art-vase">
          <span className="vase-stem vase-stem--one" />
          <span className="vase-stem vase-stem--two" />
        </div>
        <div className="art-plinth" />
        <p>STILL LIFE Nº 01</p>
      </div>
      <div className="hero-side-note">SEOUL — PARIS — EVERYWHERE</div>
    </section>
  )
}

function HomeIntro({ onSignup }) {
  return (
    <section className="home-intro" id="story">
      <p className="section-label">MAISON LUNE, EST. 2026</p>
      <p>조금 더 오래, 조금 더 다정하게.</p>
      <button type="button" onClick={onSignup}>
        메종 륀의 멤버가 되어보세요 <span aria-hidden="true">→</span>
      </button>
    </section>
  )
}

export default HomePage
