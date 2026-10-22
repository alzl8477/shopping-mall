import './AdminPage.css'

const orders = [
  {
    id: 'ORD-001234',
    customer: '김민수',
    date: '2026-10-19',
    status: '처리 중',
    statusClass: 'processing',
    amount: '₩219,000',
  },
  {
    id: 'ORD-001233',
    customer: '이영희',
    date: '2026-10-18',
    status: '배송 중',
    statusClass: 'shipping',
    amount: '₩156,000',
  },
  {
    id: 'ORD-001232',
    customer: '박서준',
    date: '2026-10-18',
    status: '배송 완료',
    statusClass: 'delivered',
    amount: '₩89,000',
  },
]

const metrics = [
  {
    label: '총 주문',
    value: '1,234',
    change: '+12%',
    icon: 'cart',
    tone: 'blue',
  },
  {
    label: '총 상품',
    value: '156',
    change: '+3%',
    icon: 'box',
    tone: 'green',
  },
  {
    label: '총 고객',
    value: '2,345',
    change: '+8%',
    icon: 'users',
    tone: 'purple',
  },
  {
    label: '총 매출',
    value: '₩45,678,000',
    change: '+15%',
    icon: 'trend',
    tone: 'orange',
  },
]

function MetricIcon({ name }) {
  const paths = {
    cart: (
      <>
        <path d="M3 4h2l2.2 11h10.9l2-8H6" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="17" cy="19" r="1" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 7.7 7.5 4.4 7.5-4.4M12 12v9M8 5.3l8 4.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M17 3.3a4 4 0 0 1 0 7.5M21 20v-1.5a4 4 0 0 0-3-3.9" />
      </>
    ),
    trend: <path d="m3 17 6-6 4 3 8-9M15 5h6v6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    eye: (
      <>
        <path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V11M10 20V5M16 20v-7M22 20H2" />
      </>
    ),
    person: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="admin-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function AdminPage({ onNavigate }) {
  return (
    <main className="admin-page">
      <header className="admin-header">
        <button
          className="admin-brand"
          type="button"
          onClick={() => onNavigate('/')}
          aria-label="메종 륀 쇼핑몰 홈"
        >
          <span>MAISON LUNE</span>
          <span className="admin-badge">ADMIN</span>
        </button>
        <button
          className="admin-store-link"
          type="button"
          onClick={() => onNavigate('/')}
        >
          쇼핑몰로 돌아가기
          <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="admin-content">
        <section className="admin-welcome" aria-labelledby="admin-title">
          <p className="admin-eyebrow">STORE MANAGEMENT</p>
          <h1 id="admin-title">관리자 대시보드</h1>
          <p>메종 륀 쇼핑몰 관리 시스템에 오신 것을 환영합니다.</p>
        </section>

        <section className="admin-metrics" aria-label="쇼핑몰 주요 지표">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div>
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <span className="metric-change">
                  {metric.change} <span>from last month</span>
                </span>
              </div>
              <span className={`metric-icon metric-icon--${metric.tone}`}>
                <MetricIcon name={metric.icon} />
              </span>
            </article>
          ))}
        </section>

        <section className="admin-management-links" aria-label="관리 메뉴">
          <button
            className="management-link-card"
            onClick={() => onNavigate('/admin/products')}
            type="button"
          >
            <span className="management-link-icon management-link-icon--products">
              <MetricIcon name="box" />
            </span>
            <span className="management-link-copy">
              <strong>상품 관리</strong>
              <span>상품 등록, 수정, 삭제 및 재고 관리</span>
            </span>
            <span className="management-link-arrow" aria-hidden="true">↗</span>
          </button>
          <button
            className="management-link-card"
            onClick={() => onNavigate('/admin/orders')}
            type="button"
          >
            <span className="management-link-icon management-link-icon--orders">
              <MetricIcon name="cart" />
            </span>
            <span className="management-link-copy">
              <strong>주문 관리</strong>
              <span>주문 조회, 상태 변경 및 배송 관리</span>
            </span>
            <span className="management-link-arrow" aria-hidden="true">↘</span>
          </button>
        </section>

        <div className="admin-panels">
          <section className="admin-panel quick-panel" aria-labelledby="quick-title">
            <h2 id="quick-title">빠른 작업</h2>
            <nav className="quick-actions" aria-label="관리자 빠른 작업">
              <button
                className="quick-action quick-action--primary"
                onClick={() => onNavigate('/admin/products?tab=register')}
                type="button"
              >
                <MetricIcon name="plus" />
                <span>새 상품 등록</span>
                <span className="quick-arrow" aria-hidden="true">↗</span>
              </button>
              <button className="quick-action" onClick={() => onNavigate('/admin/orders')} type="button">
                <MetricIcon name="eye" />
                <span>주문 관리</span>
                <span className="quick-arrow" aria-hidden="true">↗</span>
              </button>
              <a className="quick-action" href="#sales">
                <MetricIcon name="chart" />
                <span>매출 분석</span>
                <span className="quick-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="quick-action" href="#customers">
                <MetricIcon name="person" />
                <span>고객 관리</span>
                <span className="quick-arrow" aria-hidden="true">↗</span>
              </a>
            </nav>
          </section>

          <section className="admin-panel orders-panel" id="orders" aria-labelledby="orders-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">ACTIVITY</p>
                <h2 id="orders-title">최근 주문</h2>
              </div>
              <button type="button" onClick={() => onNavigate('/admin/orders')} className="panel-more">
                전체 보기 <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-row" key={order.id}>
                  <div className="order-info">
                    <strong>{order.id}</strong>
                    <span>{order.customer}</span>
                    <time>{order.date}</time>
                  </div>
                  <div className="order-summary">
                    <span className={`order-status order-status--${order.statusClass}`}>
                      {order.status}
                    </span>
                    <strong>{order.amount}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-panel sales-panel" id="sales" aria-labelledby="sales-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">THIS WEEK</p>
                <h2 id="sales-title">매출 분석</h2>
              </div>
              <span className="sales-total">₩8,420,000</span>
            </div>
            <div className="sales-chart" role="img" aria-label="월요일부터 일요일까지의 주간 매출 그래프">
              {[42, 68, 51, 85, 62, 100, 74].map((height, index) => (
                <div className="chart-column" key={index}>
                  <span className="chart-bar" style={{ height: `${height}%` }} />
                  <span className="chart-day">{'월화수목금토일'[index]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel products-panel" id="products" aria-labelledby="products-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">INVENTORY</p>
                <h2 id="products-title">인기 상품</h2>
              </div>
              <span className="stock-label">재고 현황</span>
            </div>
            <div className="product-list">
              <article className="product-row">
                <span className="product-swatch product-swatch--sand">01</span>
                <div><strong>클라우드 세라믹 화병</strong><span>홈 데코 · 42개 판매</span></div>
                <b>재고 18</b>
              </article>
              <article className="product-row">
                <span className="product-swatch product-swatch--olive">02</span>
                <div><strong>린넨 테이블 러너</strong><span>패브릭 · 36개 판매</span></div>
                <b>재고 24</b>
              </article>
              <article className="product-row">
                <span className="product-swatch product-swatch--rose">03</span>
                <div><strong>오브제 캔들 홀더</strong><span>라이프스타일 · 29개 판매</span></div>
                <b>재고 11</b>
              </article>
            </div>
          </section>

          <section className="admin-panel customers-panel" id="customers" aria-labelledby="customers-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">COMMUNITY</p>
                <h2 id="customers-title">고객 관리</h2>
              </div>
              <a href="#customers" className="panel-more">전체 보기 <span aria-hidden="true">→</span></a>
            </div>
            <div className="customer-summary">
              <span className="customer-avatar">ML</span>
              <div><strong>이번 달 신규 고객</strong><span>지난달보다 더 많은 고객이 함께하고 있어요.</span></div>
              <b>+186</b>
            </div>
            <div className="customer-footnote">고객 만족도 <strong>4.9 <span>／ 5.0</span></strong></div>
          </section>
        </div>

        <footer className="admin-footer">
          <span>MAISON LUNE · ADMIN</span>
          <span>오늘도 좋은 하루 되세요.</span>
        </footer>
      </div>
    </main>
  )
}

export default AdminPage
