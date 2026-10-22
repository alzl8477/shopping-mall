import { useEffect, useRef, useState } from 'react'
import { collectionErrorMessage, loadAccountCollection } from '../lib/accountCollection'

function SiteNav({
  onNavigate,
  onLogout,
  authMessage,
  currentUser,
  signup = false,
  login = false,
}) {
  const [cartCount, setCartCount] = useState(0)
  const [collectionError, setCollectionError] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (!isUserMenuOpen) return undefined

    function closeOnOutsideClick(event) {
      if (!userMenuRef.current?.contains(event.target)) setIsUserMenuOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsUserMenuOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isUserMenuOpen])

  useEffect(() => {
    let isCurrent = true
    const token = sessionStorage.getItem('maison-lune-token')

    async function loadCartCount() {
      if (!currentUser || !token) {
        setCartCount(0)
        setCollectionError('')
        return
      }

      try {
        const collection = await loadAccountCollection()
        if (isCurrent) {
          setCartCount(collection.cart.reduce((sum, item) => sum + item.quantity, 0))
          setCollectionError('')
        }
      } catch (error) {
        if (isCurrent) setCollectionError(collectionErrorMessage(error))
      }
    }

    function refreshCartCount() {
      loadCartCount()
    }

    loadCartCount()
    window.addEventListener('account-collection-updated', refreshCartCount)
    return () => {
      isCurrent = false
      window.removeEventListener('account-collection-updated', refreshCartCount)
    }
  }, [currentUser])

  return (
    <nav className="site-nav" aria-label="주 메뉴">
      <a
        href="/?view=products"
        onClick={(event) => {
          event.preventDefault()
          onNavigate('/?view=products')
        }}
      >
        컬렉션
      </a>
      <a href="#story">브랜드</a>
      {currentUser ? (
        <>
          {authMessage && (
            <span className="nav-auth-error" role="alert">{authMessage}</span>
          )}
          <div className="nav-user" ref={userMenuRef}>
            <button
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              className="nav-welcome"
              onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
              type="button"
            >
              {currentUser.name}님 반갑습니다. <span aria-hidden="true">▾</span>
            </button>
            {isUserMenuOpen && (
              <div className="nav-user-menu" role="menu">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    onNavigate('/account/orders')
                  }}
                  role="menuitem"
                  type="button"
                >
                  내 주문 목록
                </button>
                <button
                  className="nav-logout"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    onLogout()
                  }}
                  role="menuitem"
                  type="button"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
          {currentUser.user_type === 'admin' && (
            <button
              className="nav-admin"
              onClick={() => onNavigate('/admin')}
              type="button"
            >
              ADMIN
            </button>
          )}
        </>
      ) : (
        <>
          {authMessage && (
            <span className="nav-auth-error" role="alert">{authMessage}</span>
          )}
          <button
            type="button"
            className={login ? 'nav-login is-current' : 'nav-login'}
            onClick={() => onNavigate('/login')}
          >
            로그인
          </button>
          <button
            type="button"
            className={signup ? 'nav-join is-current' : 'nav-join'}
            onClick={() => onNavigate('/signup')}
          >
            회원가입
          </button>
        </>
      )}
      <button
        type="button"
        className="wishlist-nav-button"
        onClick={() => onNavigate('/account/wishlist')}
      >
        찜
      </button>
      <button
        type="button"
        className="bag-button"
        aria-label={`장바구니 ${cartCount}개`}
        onClick={() => onNavigate('/account/cart')}
      >
        BAG <span>({cartCount})</span>
      </button>
      {collectionError && currentUser && (
        <span className="nav-auth-error" role="status">{collectionError}</span>
      )}
    </nav>
  )
}

export default SiteNav
