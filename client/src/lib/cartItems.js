export function getCartItemKey(item) {
  const productId = item.product?._id || item.product
  return JSON.stringify([String(productId || ''), item.size || '', item.color || ''])
}
