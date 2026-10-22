# Shopping Mall API

Node.js, Express, and MongoDB starter project.

## Requirements

- Node.js 20 or later
- MongoDB running locally, or a MongoDB connection URI

## Getting started

1. Install dependencies:

   From the `server` directory:

   ```bash
   npm install
   ```

2. From the `server` directory, copy `.env.example` to `.env` and update `MONGODB_URI` if needed.

   ```bash
   cp .env.example .env
   ```

   Configure `PORTONE_API_KEY` and `PORTONE_API_SECRET` from the PortOne
   dashboard for server-side payment verification. Keep these credentials only
   in the server environment; never expose them through client-side `VITE_`
   variables.

3. From the `server` directory, start the API in development mode (nodemon restarts it when files change):

   ```bash
   npm run dev
   ```

   Or start it without the development watcher:

   ```bash
   npm start
   ```

The API runs at `http://localhost:5000` by default. Check `GET /api/health` to verify that the server and MongoDB connection are ready.

## Project structure

```text
server/
  app.js               Express application setup
  index.js             Application entry point
  models/user.js       User schema and model
  models/product.js    Product schema and model
  models/cart.js       Per-customer cart schema and model
  models/order.js      Order records with item and delivery snapshots
  models/customerCollection.js  Per-customer wishlist
  src/
    config/mongoose.js  Shared Mongoose instance
    config/database.js  MongoDB connection
    controllers/productsController.js  Product CRUD handlers
    controllers/cartsController.js  Customer cart handlers
    controllers/ordersController.js  Customer order handlers
    controllers/wishlistController.js  Customer wishlist handlers
    controllers/usersController.js  User CRUD handlers
    middleware/authenticateToken.js  JWT authentication middleware
    utils/jwt.js  Shared JWT signing, verification, and configuration
    routes/health.js    Health check endpoint
    routes/products.js  Product CRUD route definitions
    routes/orders.js  Authenticated order route definitions
    routes/accountCollection.js  Authenticated wishlist routes
    routes/users.js     User CRUD route definitions
  package.json
  package-lock.json
  .env.example
  README.md
```

## User model

The Mongoose `User` model is defined in `models/user.js`. It requires
`email`, `name`, `user_id`, `password`, and `user_type`; `user_type` must be
`customer`, `admin`, or `seller`. `address` is optional. Mongoose manages
`createdAt` and `updatedAt` automatically. Email and user ID values are unique,
and passwords are excluded from query results by default.

## Product model

The Mongoose `Product` model is defined in `models/product.js`. All product
fields are required: `sku`, `name`, `price`, `category`, `image`, and
`description`. Prices must be zero or greater, and `category` must be one of
`주방`, `거실`, `침실`, `욕실`, `패브릭`, `조명`, or `소품`. `image` stores an image URL or
path. `sku` is trimmed and normalized to uppercase; MongoDB's unique index
prevents duplicate SKUs. Mongoose also manages `createdAt` and `updatedAt`.

Example product document:

```json
{
  "sku": "ML-KITCHEN-001",
  "name": "클라우드 세라믹 화병",
  "price": 39000,
  "category": "소품",
  "image": "https://example.com/images/cloud-vase.jpg",
  "description": "부드러운 곡선과 차분한 색감의 세라믹 화병입니다."
}
```

## Product API

The product CRUD API is mounted at `/api/products`:

| Method | Path | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/api/products` | List products, newest first | Public |
| `POST` | `/api/products` | Create a product | Admin |
| `GET` | `/api/products/:id` | Get one product | Public |
| `PUT` | `/api/products/:id` | Replace all product fields | Admin |
| `PATCH` | `/api/products/:id` | Update provided product fields | Admin |
| `DELETE` | `/api/products/:id` | Delete a product | Admin |

Admin requests must include a valid token in the `Authorization: Bearer <token>`
header. The server checks the authenticated user's current role before allowing
product changes. Create requests require every product field; `PUT` requires
every product field as well, while `PATCH` accepts one or more product fields.
Invalid input returns `400`, a duplicate SKU returns `409`, and a missing
product returns `404`.

Create a product by sending `POST /api/products` with a JSON body:

```json
{
  "sku": "ML-KITCHEN-001",
  "name": "세라믹 머그",
  "price": 18000,
  "category": "주방",
  "image": "https://res.cloudinary.com/example/image/upload/mug.jpg",
  "description": "차분한 색감의 세라믹 머그입니다."
}
```

## User API

The user CRUD API is mounted at `/api/users`. Route definitions are in
`src/routes/users.js`, and request handling is in
`src/controllers/usersController.js`:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/users/login` | Log in with a user ID or email and password |
| `GET` | `/api/users/me` | Get the authenticated user's profile |
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/:id` | Get one user |
| `PUT` | `/api/users/:id` | Replace a user's editable fields |
| `PATCH` | `/api/users/:id` | Partially update a user |
| `DELETE` | `/api/users/:id` | Delete a user |

Create requests require `email`, `name`, `user_id`, and a password of at least
8 characters; `address` is optional. Publicly created users are always assigned
the `customer` role by the server. Passwords are stored as scrypt hashes and
are never included in API responses.

Login requests must provide an `identifier` (either `user_id` or email) and a
`password`:

```json
{
  "identifier": "user@example.com",
  "password": "your-password"
}
```

The endpoint returns `200` and the user profile (without the password) when
the credentials are valid, `400` when required input is missing or invalid,
and a generic `401` response when the identifier or password is incorrect.
On success, it also returns an HS256 Bearer access token that expires after
one hour. Configure `JWT_SECRET` in the server environment with a random value
of at least 32 bytes. Send the token in the `Authorization: Bearer <token>`
header when calling protected endpoints. The current-user endpoint requires
the token in the `Authorization: Bearer <token>` header. It returns `401` if
the token is missing, invalid, expired, or its user no longer exists.
Other user-management routes are not protected; do not expose them outside a
trusted development environment, especially operations involving admin
accounts.

## Customer cart and wishlist

Each authenticated customer has one `Cart` document containing product
references and quantities, and a `CustomerCollection` document for wishlist
product references. These endpoints require the user's bearer token:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/carts` | Get the current user's cart, item count, and total amount |
| `POST` | `/api/carts/items` | Add a product (`productId`, optional `quantity`, `size`, `color`) |
| `PATCH` | `/api/carts/items/:productId` | Set a cart quantity |
| `DELETE` | `/api/carts/items/:productId` | Remove a cart item |
| `DELETE` | `/api/carts/items` | Remove purchased cart lines atomically (`items` array of product IDs and options) |
| `DELETE` | `/api/carts` | Empty the cart |
| `GET` | `/api/account/collection/wishlist` | Get the current user's wishlist |
| `POST` | `/api/account/collection/wishlist/items` | Save a product to the wishlist (`productId`) |
| `DELETE` | `/api/account/collection/wishlist/items/:productId` | Remove a wishlist item |

Cart and wishlist data are stored per account in MongoDB. Checkout sends payment requests through the PortOne V1 SDK.

Each cart line stores a trusted unit-price snapshot from the product record,
optional `size` and `color` selections, and quantity. Cart documents maintain
`totalAmount` (sum of line price times quantity) and `totalItems` (sum of
quantities); both are recalculated whenever cart items change.

Order routes require a bearer token. Customers can create orders with product
IDs, quantities, optional size/color, shipping details, and an optional payment
method; product names, SKUs, images, and prices are read from the server-side
catalog, and totals are calculated by the order model.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/orders` | List the authenticated customer's orders |
| `POST` | `/api/orders` | Idempotently create an order using a `checkoutId`, product IDs, and shipping details |
| `POST` | `/api/orders/:id/verify-payment` | Verify an `impUid` against PortOne and confirm the order |
| `GET` | `/api/orders/:id` | Get one of the authenticated customer's orders |
| `PATCH` | `/api/orders/:id` | Update shipping details before confirmation/payment |
| `DELETE` | `/api/orders/:id` | Cancel an unpaid, unconfirmed order |
| `PATCH` | `/api/orders/:id/status` | Admin-only order/fulfillment status update |

Order deletion is implemented as cancellation to preserve order history.
Order creation checks a per-checkout idempotency key before inserting, and a
unique database index prevents concurrent retries from creating duplicates.
Payment confirmation is server-side: the verification route retrieves the
transaction from PortOne and checks its status, merchant order number, payment
method, and amount against the order before marking it paid. Virtual-account
orders stay pending until PortOne reports payment as paid; verify again after
the deposit is received.

`models/order.js` defines the order persistence schema. Order lines preserve
product name, SKU, image, selected
options, quantity, and unit price at purchase time so later catalog edits do
not change order history. The schema also stores a delivery-address snapshot,
item/shipping/discount totals, payment status and provider transaction fields,
order/fulfillment statuses, and lifecycle timestamps. Order prices and totals
are recalculated by the server from trusted product data.

## 한글로 빠르게 확인하기

소스 코드와 필드 이름은 그대로 두고, 아래 설명을 참고하면 유저 기능을
한글로 확인할 수 있습니다.

### 파일 역할

- `models/user.js`: 유저 데이터 구조와 필수값, 유저 유형, 생성·수정 시각을 정의합니다.
- `src/routes/users.js`: HTTP 메서드와 URL을 각 처리 함수에 연결합니다.
- `src/middleware/authenticateToken.js`: Bearer JWT를 검증하고 토큰의 사용자 ID를 확인합니다.
- `src/controllers/usersController.js`: 유저 생성·조회·수정·삭제와 입력 검증을 처리합니다.

### 유저 필드

| 코드 필드 | 의미 | 필수 여부 |
| --- | --- | --- |
| `email` | 이메일 | 필수, 중복 불가 |
| `name` | 이름 | 필수 |
| `user_id` | 서비스에서 사용하는 유저 ID | 필수, 중복 불가 |
| `password` | 비밀번호 | 필수, 저장 시 해시 처리, 응답에서 제외 |
| `user_type` | 유저 유형: `customer`, `admin`, `seller` | 필수 |
| `address` | 주소 | 선택 |
| `createdAt` | 생성 시각 | 자동 기록 |
| `updatedAt` | 마지막 수정 시각 | 자동 갱신 |

### API 사용 예시

서버를 실행한 뒤 아래 주소로 요청합니다. 단건 조회·수정·삭제의 `:id`에는
MongoDB가 생성한 문서의 `_id` 값을 사용합니다.

| 기능 | 요청 |
| --- | --- |
| 토큰으로 내 정보 조회 | `GET http://localhost:5000/api/users/me` |
| 유저 생성 | `POST http://localhost:5000/api/users` |
| 전체 유저 조회 | `GET http://localhost:5000/api/users` |
| 유저 한 명 조회 | `GET http://localhost:5000/api/users/:id` |
| 유저 전체 수정 | `PUT http://localhost:5000/api/users/:id` |
| 일부 항목 수정 | `PATCH http://localhost:5000/api/users/:id` |
| 유저 삭제 | `DELETE http://localhost:5000/api/users/:id` |

내 정보 조회 요청에는 로그인 응답의 토큰을 다음 헤더로 전달합니다:
`Authorization: Bearer <token>`.

유저 생성 요청 본문 예시:

```json
{
  "email": "user@example.com",
  "name": "홍길동",
  "user_id": "user-001",
  "password": "비밀번호",
  "user_type": "customer",
  "address": "서울시"
}
```

`PUT`은 필수 항목을 모두 보내야 하며, `PATCH`는 바꿀 항목만 보내면 됩니다.
비밀번호는 생성 또는 수정 시 해시되어 저장되고 API 응답에는 표시되지 않습니다.

## Available configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5000` | Port used by the API server |
| `MONGODB_ATLAS_URL` | (unset) | MongoDB Atlas connection string. 값이 있으면 항상 이 주소를 사용 |
| `MONGODB_URI` | (required if no Atlas URL) | 로컬 MongoDB connection string. `MONGODB_ATLAS_URL`이 없을 때만 사용 |
| `CLIENT_URL` | `http://localhost:5173` | Origin allowed by CORS |
| `PORTONE_API_KEY` | (required for payment verification) | PortOne REST API key |
| `PORTONE_API_SECRET` | (required for payment verification) | PortOne REST API secret; server only |
| `PORTONE_ALLOW_SANDBOX` | (unset) | `true`이면 포트원 테스트 결제 조회 허용. `NODE_ENV=production`에서는 `PORTONE_ALLOW_SANDBOX_IN_PRODUCTION=true`가 함께 있어야만 적용됨 |
| `PORTONE_ALLOW_SANDBOX_IN_PRODUCTION` | (unset) | `true`일 때만 production에서도 테스트 결제 조회를 허용. 실결제 전에 반드시 제거 |

## 실결제 전환 체크리스트

- [ ] `.env` / Vercel 환경변수의 `PORTONE_ALLOW_SANDBOX`와 `PORTONE_ALLOW_SANDBOX_IN_PRODUCTION` 제거 또는 `false`로 변경
- [ ] 배포 서버의 `NODE_ENV=production` 확인
- [ ] 포트원 콘솔에서 "실연동" 채널 등록 (KG이니시스 실상점 정보)
- [ ] 클라이언트 PG 설정값(`VITE_PORTONE_PG` 등)을 실연동 값으로 변경
- [ ] 실결제 소액 테스트 후 결제 취소로 확인
