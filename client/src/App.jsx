import { useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AdminPage from './pages/admin/AdminPage'
import ProductManagementPage from './pages/admin/ProductManagementPage'
import ProductDetailPage from './pages/ProductDetailPage'
import AccountCollectionPage from './pages/AccountCollectionPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderFailurePage from './pages/OrderFailurePage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import OrderListPage from './pages/OrderListPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import './App.css'

function getStoredUser() {
  const token = sessionStorage.getItem('maison-lune-token')
  const storedUser = sessionStorage.getItem('maison-lune-user')
  if (!token) {
    sessionStorage.removeItem('maison-lune-token')
    sessionStorage.removeItem('maison-lune-user')
    sessionStorage.removeItem('maison-lune-token-expires-at')
    return null
  }

  if (!storedUser) return null

  try {
    const user = JSON.parse(storedUser)
    if (
      user &&
      typeof user.user_id === 'string' &&
      typeof user.name === 'string'
    ) {
      return user
    }
  } catch {
    sessionStorage.removeItem('maison-lune-user')
  }

  sessionStorage.removeItem('maison-lune-user')
  return null
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [currentUser, setCurrentUser] = useState(getStoredUser)
  const [authMessage, setAuthMessage] = useState('')
  const routePath = new URL(path, window.location.origin).pathname

  useEffect(() => {
    function syncPath() {
      setPath(window.location.pathname)
    }

    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  useEffect(() => {
    if (path !== '/' && path !== '/login') return undefined

    const token = sessionStorage.getItem('maison-lune-token')
    if (!token) return undefined

    const controller = new AbortController()
    let isCurrentRequest = true
    const shouldRedirectToHome = path === '/login'

    async function loadCurrentUser() {
      try {
        const response = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (response.status === 401) {
            sessionStorage.removeItem('maison-lune-token')
            sessionStorage.removeItem('maison-lune-user')
            sessionStorage.removeItem('maison-lune-token-expires-at')
            setCurrentUser(null)
          }
          throw new Error(result.message || '사용자 정보를 불러오지 못했습니다.')
        }

        if (
          typeof result.user_id !== 'string' ||
          typeof result.name !== 'string'
        ) {
          throw new Error('사용자 정보 응답 형식이 올바르지 않습니다.')
        }

        if (
          isCurrentRequest &&
          sessionStorage.getItem('maison-lune-token') === token
        ) {
          sessionStorage.setItem('maison-lune-user', JSON.stringify(result))
          setCurrentUser(result)
          setAuthMessage('')
          if (shouldRedirectToHome) {
            navigate('/')
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError' && isCurrentRequest) {
          setAuthMessage(error.message)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [path])

  useEffect(() => {
    if (path.startsWith('/admin') && currentUser?.user_type !== 'admin') {
      navigate('/')
    }
  }, [path, currentUser])

  function navigate(nextPath) {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    setAuthMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleLogout() {
    sessionStorage.removeItem('maison-lune-token')
    sessionStorage.removeItem('maison-lune-user')
    sessionStorage.removeItem('maison-lune-token-expires-at')
    setCurrentUser(null)
    navigate('/')
  }

  if (routePath === '/signup') {
    return (
      <SignupPage
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={navigate}
      />
    )
  }

  if (routePath === '/login') {
    return (
      <LoginPage
        currentUser={currentUser}
        onAuthenticated={setCurrentUser}
        onLogout={handleLogout}
        onNavigate={navigate}
        redirectTo={new URLSearchParams(window.location.search).get('returnTo') || '/'}
      />
    )
  }

  const accountCollectionMatch = routePath.match(/^\/account\/(cart|wishlist)$/)
  const isCheckoutRoute = routePath === '/checkout'
  const isOrderFailureRoute = routePath === '/order-failure'
  const isOrderSuccessRoute = routePath === '/order-success'
  const isOrderListRoute = routePath === '/account/orders'
  if (
    (accountCollectionMatch || isCheckoutRoute || isOrderFailureRoute || isOrderSuccessRoute || isOrderListRoute) &&
    !currentUser
  ) {
    const returnTo = `${routePath}${window.location.search}`
    return (
      <LoginPage
        currentUser={currentUser}
        onAuthenticated={setCurrentUser}
        onLogout={handleLogout}
        onNavigate={navigate}
        redirectTo={returnTo}
      />
    )
  }

  if (accountCollectionMatch) {
    return (
      <AccountCollectionPage
        authMessage={authMessage}
        currentUser={currentUser}
        mode={accountCollectionMatch[1]}
        onLogout={handleLogout}
        onNavigate={navigate}
      />
    )
  }

  if (isCheckoutRoute) {
    const params = new URLSearchParams(window.location.search)
    const checkoutQuantity = Number(params.get('quantity') || 1)
    return (
      <CheckoutPage
        authMessage={authMessage}
        currentUser={currentUser}
        fromCart={params.get('source') === 'cart'}
        onLogout={handleLogout}
        onNavigate={navigate}
        productId={params.get('productId') || ''}
        selectedCartItemKeys={params.has('line') ? params.getAll('line') : null}
        quantity={
          Number.isSafeInteger(checkoutQuantity) && checkoutQuantity > 0
            ? checkoutQuantity
            : 1
        }
      />
    )
  }

  if (isOrderSuccessRoute) {
    return (
      <OrderSuccessPage
        onNavigate={navigate}
        orderId={new URLSearchParams(window.location.search).get('orderId') || ''}
      />
    )
  }

  if (isOrderListRoute) {
    return (
      <OrderListPage
        authMessage={authMessage}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={navigate}
      />
    )
  }

  if (isOrderFailureRoute) {
    return <OrderFailurePage onNavigate={navigate} />
  }

  const productDetailMatch = routePath.match(/^\/products\/([^/]+)$/)
  if (productDetailMatch) {
    return (
      <ProductDetailPage
        authMessage={authMessage}
        category={new URLSearchParams(window.location.search).get('category') || ''}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={navigate}
        productId={decodeURIComponent(productDetailMatch[1])}
      />
    )
  }

  if (routePath === '/admin/products' && currentUser?.user_type === 'admin') {
    return <ProductManagementPage onNavigate={navigate} />
  }

  if (routePath === '/admin/orders' && currentUser?.user_type === 'admin') {
    return <AdminOrdersPage onNavigate={navigate} />
  }

  if (routePath === '/admin' && currentUser?.user_type === 'admin') {
    return <AdminPage onNavigate={navigate} />
  }

  return (
    <HomePage
    authMessage={authMessage}
    currentUser={currentUser}
      onLogout={handleLogout}
      onNavigate={navigate}
      initialCategory={new URLSearchParams(window.location.search).get('category')}
      showCollectionInitially={new URLSearchParams(window.location.search).get('view') === 'products'}
    />
  )
}

export default App
