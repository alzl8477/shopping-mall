function getToken() {
  return sessionStorage.getItem('maison-lune-token')
}

function emitCollectionUpdated() {
  window.dispatchEvent(new Event('account-collection-updated'))
}

async function collectionRequest(path, { method = 'GET', body } = {}) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const headers = { Authorization: `Bearer ${token}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`/api/account/collection${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const result = response.status === 204
    ? null
    : await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(result?.message || '계정 정보를 저장하지 못했습니다.')
    error.status = response.status
    throw error
  }
  return result
}

async function cartRequest(path, { method = 'GET', body } = {}) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const headers = { Authorization: `Bearer ${token}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`/api/carts${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const result = response.status === 204
    ? null
    : await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(result?.message || '장바구니를 처리하지 못했습니다.')
    error.status = response.status
    throw error
  }
  return result
}

export async function createOrder(order) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(result?.message || '주문을 접수하지 못했습니다.')
    error.status = response.status
    throw error
  }
  return result
}

export async function getOrder(orderId, { signal } = {}) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: 'Bearer ' + token },
    signal,
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(result?.message || '주문 정보를 불러오지 못했습니다.')
    error.status = response.status
    throw error
  }
  return result
}

export async function getOrders({ signal } = {}) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const response = await fetch('/api/orders/my', {
    headers: { Authorization: 'Bearer ' + token },
    signal,
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(result?.message || '주문 내역을 불러오지 못했습니다.')
    error.status = response.status
    throw error
  }
  if (!Array.isArray(result)) {
    throw new Error('주문 내역 응답 형식이 올바르지 않습니다.')
  }
  return result
}

export async function getAllOrders({ signal } = {}) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const response = await fetch('/api/orders/admin/all', {
    headers: { Authorization: 'Bearer ' + token },
    signal,
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(result?.message || '전체 주문을 불러오지 못했습니다.')
    error.status = response.status
    throw error
  }
  if (!Array.isArray(result)) {
    throw new Error('전체 주문 응답 형식이 올바르지 않습니다.')
  }
  return result
}

export async function updateAdminOrderStatus(orderId, status) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(status),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(result?.message || '주문 상태를 변경하지 못했습니다.')
    error.status = response.status
    throw error
  }
  return result
}

export async function verifyOrderPayment(orderId, impUid) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const response = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}/verify-payment`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ impUid }),
    },
  )
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(result?.message || '결제 내역을 검증하지 못했습니다.')
    error.status = response.status
    throw error
  }
  return result
}

export async function cancelOrder(orderId) {
  const token = getToken()
  if (!token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(result?.message || '미결제 주문을 취소하지 못했습니다.')
    error.status = response.status
    throw error
  }
  return result
}

export async function loadAccountCollection() {
  const [cart, collection] = await Promise.all([
    cartRequest('/'),
    collectionRequest('/wishlist'),
  ])
  if (
    !cart ||
    !Array.isArray(cart.items) ||
    !Array.isArray(collection?.wishlist)
  ) {
    throw new Error('계정 상품 정보 응답 형식이 올바르지 않습니다.')
  }
  return { cart: cart.items, wishlist: collection.wishlist }
}

export async function addCartItem(productId, quantity = 1, options = {}) {
  const result = await cartRequest('/items', {
    method: 'POST',
    body: { productId, quantity, ...options },
  })
  emitCollectionUpdated()
  return result
}

export async function updateCartItem(productId, quantity) {
  const result = await cartRequest(`/items/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: { quantity },
  })
  emitCollectionUpdated()
  return result
}

export async function removeCartItem(productId, options) {
  const query = new URLSearchParams()
  if (options) {
    query.set('size', options.size || '')
    query.set('color', options.color || '')
  }
  const queryString = query.toString()
  const result = await cartRequest(
    `/items/${encodeURIComponent(productId)}${queryString ? `?${queryString}` : ''}`,
    {
      method: 'DELETE',
    },
  )
  emitCollectionUpdated()
  return result
}

export async function removeCartItems(items) {
  const result = await cartRequest('/items', {
    method: 'DELETE',
    body: {
      items: items.map((item) => ({
        productId: item.product?._id || item.productId,
        size: item.size || '',
        color: item.color || '',
      })),
    },
  })
  emitCollectionUpdated()
  return result
}

export async function clearCart() {
  const result = await cartRequest('/', { method: 'DELETE' })
  emitCollectionUpdated()
  return result
}

export async function addWishlistItem(productId) {
  const result = await collectionRequest('/wishlist/items', {
    method: 'POST',
    body: { productId },
  })
  emitCollectionUpdated()
  return result
}

export async function removeWishlistItem(productId) {
  const result = await collectionRequest(`/wishlist/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  })
  emitCollectionUpdated()
  return result
}

export function collectionErrorMessage(error) {
  if (error.message === 'Failed to fetch') {
    return '서버에 연결할 수 없습니다. 백엔드 서버를 확인해 주세요.'
  }
  return error.message
}
