import { useEffect, useMemo, useRef, useState } from 'react'
import './ProductManagementPage.css'

const categories = ['주방', '거실', '침실', '욕실', '패브릭', '조명', '소품']
const productsPerPage = 2
const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const isCloudinaryConfigured = Boolean(
  cloudinaryCloudName?.trim() &&
  cloudinaryUploadPreset?.trim() &&
  !['Cloudinary_Cloud_Name', 'your_cloud_name'].includes(cloudinaryCloudName.trim()) &&
  !['Unsigned_Upload_Preset_Name', 'your_unsigned_upload_preset'].includes(
    cloudinaryUploadPreset.trim(),
  ),
)

function ProductManagementPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState(
    () => new URLSearchParams(window.location.search).get('tab') === 'register'
      ? 'register'
      : 'list',
  )
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [productsRequestId, setProductsRequestId] = useState(0)
  const [productsLoadError, setProductsLoadError] = useState('')
  const [form, setForm] = useState({
    sku: '',
    name: '',
    price: '',
    category: '',
    image: '',
    description: '',
  })
  const [editingProductId, setEditingProductId] = useState(null)
  const [isDeletingProductId, setIsDeletingProductId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isCloudinaryReady, setIsCloudinaryReady] = useState(
    () => Boolean(window.cloudinary?.createUploadWidget),
  )
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false)
  const cloudinaryWidget = useRef(null)

  useEffect(() => {
    if (!isCloudinaryConfigured || isCloudinaryReady) {
      return undefined
    }

    let isActive = true
    let script = document.getElementById('cloudinary-upload-widget')

    function handleLoad() {
      if (isActive && window.cloudinary?.createUploadWidget) {
        setIsCloudinaryReady(true)
      } else if (isActive) {
        setMessage('Cloudinary 업로드 위젯을 불러오지 못했습니다.')
        setMessageType('error')
      }
    }

    function handleError() {
      if (isActive) {
        setMessage('Cloudinary 업로드 위젯을 불러오지 못했습니다. 네트워크를 확인해 주세요.')
        setMessageType('error')
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = 'cloudinary-upload-widget'
      script.src = 'https://upload-widget.cloudinary.com/global/all.js'
      script.async = true
      document.head.appendChild(script)
    }

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)
    if (window.cloudinary?.createUploadWidget) handleLoad()

    return () => {
      isActive = false
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
  }, [isCloudinaryReady])

  useEffect(() => () => {
    cloudinaryWidget.current?.destroy()
    cloudinaryWidget.current = null
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setIsLoading(true)
      setProductsLoadError('')
      try {
        const response = await fetch('/api/products', { signal: controller.signal })
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(result.message || '상품 목록을 불러오지 못했습니다.')
        }
        if (!Array.isArray(result)) {
          throw new Error('상품 목록 응답 형식이 올바르지 않습니다.')
        }
        setProducts(result)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setProductsLoadError(
            error.message === 'Failed to fetch'
              ? '서버에 연결할 수 없습니다. 백엔드와 데이터베이스가 실행 중인지 확인해 주세요.'
              : error.message,
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [productsRequestId])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name?.toLocaleLowerCase().includes(normalizedSearch) ||
        product.sku?.toLocaleLowerCase().includes(normalizedSearch)
      const matchesCategory = !categoryFilter || product.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [products, search, categoryFilter])
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const displayedPage = Math.min(currentPage, Math.max(totalPages, 1))
  const paginatedProducts = filteredProducts.slice(
    (displayedPage - 1) * productsPerPage,
    displayedPage * productsPerPage,
  )

  function updateField(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function openImageUploader() {
    if (!isCloudinaryConfigured) {
      setMessage('예시 문자열이 아닌 실제 Cloud Name과 unsigned Upload Preset 이름을 client/.env에 입력해 주세요.')
      setMessageType('error')
      return
    }

    if (!isCloudinaryReady || isUploadingImage) return

    setMessage('')
    setIsUploadingImage(true)
    try {
      if (!cloudinaryWidget.current) {
        cloudinaryWidget.current = window.cloudinary.createUploadWidget(
          {
            cloudName: cloudinaryCloudName,
            uploadPreset: cloudinaryUploadPreset,
            sources: ['local', 'url', 'camera'],
            resourceType: 'image',
            multiple: false,
            maxFileSize: 10000000,
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            folder: 'maison-lune/products',
            showAdvancedOptions: false,
            showUploadMoreButton: false,
          },
          (error, result) => {
            if (error) {
              setMessage(error.message || '이미지 업로드 중 오류가 발생했습니다.')
              setMessageType('error')
              setIsUploadingImage(false)
              return
            }

            if (result?.event === 'success') {
              const imageUrl = result.info?.secure_url
              if (typeof imageUrl !== 'string' || !imageUrl) {
                setMessage('업로드된 이미지 주소를 확인할 수 없습니다. 다시 시도해 주세요.')
                setMessageType('error')
                setIsUploadingImage(false)
                return
              }

              setForm((currentForm) => ({ ...currentForm, image: imageUrl }))
              setImagePreviewFailed(false)
              setMessage('이미지가 업로드되었습니다.')
              setMessageType('success')
              setIsUploadingImage(false)
              cloudinaryWidget.current?.close()
              return
            }

            if (result?.event === 'close' || result?.event === 'abort') {
              setIsUploadingImage(false)
            }
          },
        )
      }

      cloudinaryWidget.current.open()
    } catch (error) {
      setIsUploadingImage(false)
      setMessage(error.message || '이미지 업로드 위젯을 열지 못했습니다.')
      setMessageType('error')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    if (isUploadingImage) {
      setMessage('이미지 업로드가 끝난 후 상품을 등록해 주세요.')
      setMessageType('error')
      return
    }
    if (!form.image) {
      setMessage('상품 이미지를 Cloudinary 위젯으로 추가해 주세요.')
      setMessageType('error')
      return
    }
    setIsSubmitting(true)

    try {
      const token = sessionStorage.getItem('maison-lune-token')
      if (!token) {
        throw new Error('로그인 정보가 없습니다. 다시 로그인해 주세요.')
      }

      const response = await fetch(
        editingProductId ? `/api/products/${editingProductId}` : '/api/products',
        {
        method: editingProductId ? 'PUT' : 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const fieldErrors = result.errors
          ? Object.entries(result.errors)
            .map(([field, error]) => `${field}: ${error}`)
            .join(', ')
          : ''
        throw new Error(
          response.status === 409
            ? '이미 사용 중인 SKU입니다. 다른 SKU를 입력해 주세요.'
            : fieldErrors
              ? `${result.message || '상품 정보를 확인해 주세요.'} (${fieldErrors})`
              : result.message || (editingProductId ? '상품 수정에 실패했습니다.' : '상품 등록에 실패했습니다.'),
        )
      }

      setProducts((currentProducts) => (
        editingProductId
          ? currentProducts.map((product) => (
            product._id === editingProductId ? result : product
          ))
          : [result, ...currentProducts]
      ))
      setEditingProductId(null)
      setForm({
        sku: '',
        name: '',
        price: '',
        category: '',
        image: '',
        description: '',
      })
      setMessage(editingProductId ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.')
      setMessageType('success')
      setActiveTab('list')
      setProductsRequestId((requestId) => requestId + 1)
    } catch (error) {
      setMessage(
        error.message === 'Failed to fetch'
          ? '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.'
          : error.message,
      )
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEditingProduct(product) {
    setEditingProductId(product._id)
    setForm({
      sku: product.sku || '',
      name: product.name || '',
      price: String(product.price ?? ''),
      category: product.category || '',
      image: product.image || '',
      description: product.description || '',
    })
    setImagePreviewFailed(false)
    setMessage('')
    setActiveTab('register')
  }

  async function deleteProduct(product) {
    if (!window.confirm(`"${product.name}" 상품을 삭제하시겠습니까?`)) return

    const token = sessionStorage.getItem('maison-lune-token')
    if (!token) {
      setMessage('로그인 정보가 없습니다. 다시 로그인해 주세요.')
      setMessageType('error')
      return
    }

    setIsDeletingProductId(product._id)
    setMessage('')
    try {
      const response = await fetch(`/api/products/${product._id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.message || '상품 삭제에 실패했습니다.')
      }

      setProducts((currentProducts) => currentProducts.filter(
        (currentProduct) => currentProduct._id !== product._id,
      ))
      setMessage('상품이 삭제되었습니다.')
      setMessageType('success')
    } catch (error) {
      setMessage(error.message === 'Failed to fetch'
        ? '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.'
        : error.message)
      setMessageType('error')
    } finally {
      setIsDeletingProductId(null)
    }
  }

  function cancelProductForm() {
    setEditingProductId(null)
    setForm({
      sku: '',
      name: '',
      price: '',
      category: '',
      image: '',
      description: '',
    })
    setImagePreviewFailed(false)
    setMessage('')
    setActiveTab('list')
  }

  return (
    <main className="product-management">
      <header className="product-management-header">
        <button
          aria-label="관리자 대시보드로 돌아가기"
          className="product-back-button"
          onClick={() => onNavigate('/admin')}
          type="button"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1>상품 관리</h1>
        <button
          className="product-new-button"
          onClick={() => {
            setEditingProductId(null)
            setForm({
              sku: '',
              name: '',
              price: '',
              category: '',
              image: '',
              description: '',
            })
            setImagePreviewFailed(false)
            setActiveTab('register')
            setMessage('')
          }}
          type="button"
        >
          <span aria-hidden="true">＋</span> 새 상품 등록
        </button>
      </header>

      <div className="product-management-content">
        <div className="product-tabs" role="tablist" aria-label="상품 관리 메뉴">
          <button
            aria-selected={activeTab === 'list'}
            className={activeTab === 'list' ? 'is-active' : ''}
            onClick={() => {
              setActiveTab('list')
              setMessage('')
              setProductsRequestId((requestId) => requestId + 1)
            }}
            role="tab"
            type="button"
          >
            상품 목록
          </button>
          <button
            aria-selected={activeTab === 'register'}
            className={activeTab === 'register' ? 'is-active' : ''}
            onClick={() => {
              setActiveTab('register')
              setMessage('')
            }}
            role="tab"
            type="button"
          >
            상품 등록
          </button>
        </div>

        {activeTab === 'list' ? (
          <section className="product-list-view" aria-label="상품 목록">
            <div className="product-list-toolbar">
              <label className="product-search">
                <span aria-hidden="true">⌕</span>
                <input
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="상품명 또는 SKU로 검색..."
                  type="search"
                  value={search}
                />
              </label>
              <label className="product-filter">
                <span aria-hidden="true">▽</span>
                <select
                  aria-label="카테고리 필터"
                  onChange={(event) => {
                    setCategoryFilter(event.target.value)
                    setCurrentPage(1)
                  }}
                  value={categoryFilter}
                >
                  <option value="">필터</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>

            {message && (
              <p className={`product-message product-message--${messageType}`} role="status">
                {message}
              </p>
            )}

            {isLoading ? (
              <p className="product-empty-state">상품 목록을 불러오는 중입니다.</p>
            ) : productsLoadError ? (
              <div className="product-empty-state product-load-error" role="alert">
                <p>{productsLoadError}</p>
                <button
                  onClick={() => setProductsRequestId((requestId) => requestId + 1)}
                  type="button"
                >
                  다시 시도
                </button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="product-table-scroll">
                  <table className="product-table">
                    <thead>
                      <tr>
                        <th scope="col">이미지</th>
                        <th scope="col">상품명</th>
                        <th scope="col">카테고리</th>
                        <th scope="col">가격</th>
                        <th scope="col">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => (
                        <tr key={product._id || product.sku}>
                          <td>
                            <button
                              aria-label={`${product.name} 상세 정보 보기`}
                              className="product-table-image"
                              disabled={!product._id}
                              onClick={() => onNavigate(`/products/${encodeURIComponent(product._id)}`)}
                              type="button"
                            >
                              {product.image ? (
                                <img alt="" loading="lazy" src={product.image} />
                              ) : (
                                <span aria-hidden="true">이미지 없음</span>
                              )}
                            </button>
                          </td>
                          <td>
                            <div className="product-table-name">
                              <strong>{product.name}</strong>
                              <span>SKU · {product.sku}</span>
                            </div>
                          </td>
                          <td><span className="product-category-chip">{product.category}</span></td>
                          <td className="product-table-price">
                            {Number(product.price).toLocaleString('ko-KR')}원
                          </td>
                          <td>
                            <div className="product-row-actions">
                              <button
                                aria-label={`${product.name} 수정`}
                                className="product-row-action product-row-action--edit"
                                onClick={() => startEditingProduct(product)}
                                type="button"
                              >
                                <span aria-hidden="true">✎</span>
                                <span className="product-row-action-label">수정</span>
                              </button>
                              <button
                                aria-label={`${product.name} 삭제`}
                                className="product-row-action product-row-action--delete"
                                disabled={isDeletingProductId === product._id}
                                onClick={() => deleteProduct(product)}
                                type="button"
                              >
                                <span aria-hidden="true">⌫</span>
                                <span className="product-row-action-label">
                                  {isDeletingProductId === product._id ? '삭제 중' : '삭제'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <nav className="product-pagination" aria-label="상품 목록 페이지">
                    <span>
                      {filteredProducts.length}개 상품 · {displayedPage} / {totalPages} 페이지
                    </span>
                    <div className="product-pagination-controls">
                      <button
                        aria-label="이전 페이지"
                        disabled={displayedPage === 1}
                        onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                        type="button"
                      >
                        이전
                      </button>
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                        <button
                          aria-current={page === displayedPage ? 'page' : undefined}
                          aria-label={`${page}페이지`}
                          className={page === displayedPage ? 'is-active' : ''}
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          type="button"
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        aria-label="다음 페이지"
                        disabled={displayedPage === totalPages}
                        onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                        type="button"
                      >
                        다음
                      </button>
                    </div>
                  </nav>
                )}
              </>
            ) : (
              <div className="product-empty-state">
                <span aria-hidden="true">□</span>
                <p>{search || categoryFilter ? '검색 조건에 맞는 상품이 없습니다.' : '등록된 상품이 없습니다.'}</p>
                <button onClick={() => setActiveTab('register')} type="button">
                  첫 상품 등록하기
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="product-register-view" aria-label="상품 등록">
            <div className="product-form-intro">
              <p>PRODUCT INFORMATION</p>
              <h2>{editingProductId ? '상품 정보를 수정해 주세요.' : '새로운 상품을 등록해 주세요.'}</h2>
              <span>{editingProductId ? '수정한 정보는 저장 즉시 상품 목록에 반영됩니다.' : '상품 정보를 입력하면 쇼핑몰 상품 목록에 바로 반영됩니다.'}</span>
            </div>

            {message && (
              <p className={`product-message product-message--${messageType}`} role="alert">
                {message}
              </p>
            )}

            <form className="product-form" onSubmit={handleSubmit}>
              <label className="product-form-field">
                <span>상품명 <b>*</b></span>
                <input
                  autoComplete="off"
                  maxLength={120}
                  name="name"
                  onChange={updateField}
                  placeholder="상품명을 입력해 주세요"
                  required
                  value={form.name}
                />
              </label>
              <label className="product-form-field">
                <span>SKU <b>*</b></span>
                <input
                  autoComplete="off"
                  maxLength={64}
                  name="sku"
                  onChange={updateField}
                  placeholder="예: ML-KITCHEN-001"
                  required
                  value={form.sku}
                />
                <small>SKU는 상품마다 고유해야 합니다.</small>
              </label>
              <label className="product-form-field">
                <span>상품 가격 <b>*</b></span>
                <span className="product-price-input">
                  <input
                    min="0"
                    name="price"
                    onChange={updateField}
                    placeholder="0"
                    required
                    step="1"
                    type="number"
                    value={form.price}
                  />
                  <span>원</span>
                </span>
              </label>
              <label className="product-form-field">
                <span>카테고리 <b>*</b></span>
                <select
                  name="category"
                  onChange={updateField}
                  required
                  value={form.category}
                >
                  <option disabled value="">카테고리를 선택해 주세요</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <div className="product-form-field product-image-field">
                <span>이미지 주소 <b>*</b></span>
                <div className="product-image-uploader">
                  <div className="product-image-preview">
                    {form.image && !imagePreviewFailed ? (
                      <img
                        alt="업로드한 상품 이미지 미리보기"
                        onError={() => setImagePreviewFailed(true)}
                        src={form.image}
                      />
                    ) : (
                      <div className="product-image-placeholder">
                        <span aria-hidden="true">▧</span>
                        <span>{imagePreviewFailed ? '이미지 미리보기를 불러오지 못했습니다.' : '이미지를 업로드하면 미리보기가 표시됩니다.'}</span>
                      </div>
                    )}
                  </div>
                  <div className="product-image-controls">
                    <button
                      aria-describedby="product-image-help"
                      className="product-image-upload-button"
                      disabled={!isCloudinaryReady || isUploadingImage}
                      onClick={openImageUploader}
                      type="button"
                    >
                      <span aria-hidden="true">＋</span>
                      {!isCloudinaryConfigured
                        ? 'Cloudinary 설정 확인'
                        : isUploadingImage
                          ? '업로드 중...'
                          : form.image ? '이미지 변경' : '이미지 추가'}
                    </button>
                    {form.image && (
                      <button
                        className="product-image-remove-button"
                        onClick={() => {
                          setForm((currentForm) => ({ ...currentForm, image: '' }))
                          setImagePreviewFailed(false)
                        }}
                        type="button"
                      >
                        이미지 삭제
                      </button>
                    )}
                    <small id="product-image-help">
                      JPG, PNG, WEBP · 최대 10MB
                    </small>
                    {!isCloudinaryConfigured ? (
                      <small>Cloudinary Console의 실제 Cloud Name과 unsigned Upload Preset 이름을 입력해 주세요.</small>
                    ) : null}
                    {form.image && (
                      <input name="image" required type="hidden" value={form.image} />
                    )}
                  </div>
                </div>
              </div>
              <label className="product-form-field product-description-field">
                <span>상품 설명 <b>*</b></span>
                <textarea
                  maxLength={2000}
                  name="description"
                  onChange={updateField}
                  placeholder="상품의 특징과 상세 정보를 입력해 주세요"
                  required
                  rows="5"
                  value={form.description}
                />
              </label>
              <div className="product-form-actions">
                <button className="product-cancel-button" onClick={cancelProductForm} type="button">
                  취소
                </button>
                <button className="product-submit-button" disabled={isSubmitting || isUploadingImage} type="submit">
                  {isUploadingImage
                    ? '이미지 업로드 중...'
                    : isSubmitting
                      ? editingProductId ? '수정 중...' : '등록 중...'
                      : editingProductId ? '상품 수정하기' : '상품 등록하기'}
                  {!isSubmitting && !isUploadingImage && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}

export default ProductManagementPage
