# Shopping Mall Client

React와 Vite 기반 쇼핑몰 프론트엔드입니다.

## 시작하기

Node.js `20.19+` 또는 `22.12+`가 필요합니다.

```bash
npm install
npm run dev
```

Vite 개발 서버가 표시하는 주소(기본값: `http://localhost:5173`)로 접속합니다.

## Cloudinary 상품 이미지 업로드

상품 등록 페이지는 Cloudinary Upload Widget으로 이미지를 업로드합니다.
프로젝트 설정 전에 Cloudinary 콘솔에서 unsigned 업로드 프리셋을 만들고,
허용 파일 형식을 JPG, PNG, WEBP로 제한하세요. 업로드 프리셋과 Cloudinary
클라우드 이름은 클라이언트에 공개되는 값이며, API Secret은 절대
`VITE_` 환경 변수로 만들거나 프런트엔드에 저장하지 마세요.

`client/.env.example`을 복사해 `client/.env`를 만들고 다음 두 값을
Cloudinary Console의 **Product Environment → Settings** 및
**Upload → Upload presets**에서 확인해 설정합니다.

```dotenv
VITE_CLOUDINARY_CLOUD_NAME=Cloudinary_Cloud_Name
VITE_CLOUDINARY_UPLOAD_PRESET=Unsigned_Upload_Preset_Name
```

`VITE_CLOUDINARY_CLOUD_NAME`은 Cloudinary의 cloud name이고,
`VITE_CLOUDINARY_UPLOAD_PRESET`은 unsigned 업로드 프리셋 이름입니다.
위젯은 두 값을 각각 `cloudName`과 `uploadPreset` 설정으로 사용합니다.
Unsigned 업로드에는 API Secret이 필요하지 않습니다. API Secret이나
API Key를 프런트엔드 환경 변수에 넣지 마세요. `.env` 파일은 Git에서 제외됩니다.

환경 변수 변경 후에는 Vite 개발 서버를 재시작하세요. 이미지 업로드가
완료되면 Cloudinary의 HTTPS 이미지 주소가 상품 데이터에 저장되고,
등록 화면에서 미리보기를 확인할 수 있습니다.

## 포트원 결제

Checkout은 포트원 V1 SDK의 `IMP.request_pay`로 신용카드, 실시간 계좌이체,
가상계좌, 휴대폰 결제를 요청할 수 있습니다. 사용 가능한 결제 수단은
선택한 PG 및 포트원 가맹점 설정에 따라 달라집니다.
`VITE_PORTONE_PG`로 PG 식별자를 설정할 수 있으며 기본값은 이니시스 테스트
모드(`html5_inicis.INIpayTest`)입니다. 실제 결제를 사용하기 전에 포트원
콘솔에서 설정한 PG 식별자로 바꾸고 결제 테스트를 진행하세요.

브라우저 결제 콜백만으로 결제 완료를 확정하지 않습니다. 백엔드는 포트원
거래 상태, 주문번호, 결제 수단 및 금액을 조회·대조한 뒤 주문을 확정합니다.
서버 `.env`에 `PORTONE_API_KEY`와 `PORTONE_API_SECRET`을 설정하세요. API
Secret은 서버에만 보관하고 `VITE_` 환경 변수나 프런트엔드에 넣지 마세요.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 및 HMR |
| `npm run lint` | Oxlint 검사 |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 프로덕션 빌드 미리보기 |

## 백엔드 API

개발 서버는 `/api` 요청을 `http://localhost:5000`으로 프록시합니다. 백엔드를 먼저 실행한 뒤 `/api/health`처럼 상대 경로로 요청하면 CORS 별도 설정 없이 API를 사용할 수 있습니다.

현재 화면에서는 `/api/users` API를 사용해 유저 목록/상세 조회, 등록, 수정, 삭제를 할 수 있습니다. 백엔드 코드를 변경한 뒤 목록 요청이 `404`를 반환하면 실행 중인 백엔드 프로세스를 재시작하세요.

## 주요 파일

```text
client/
  index.html
  vite.config.js
  src/
    App.jsx
    App.css
    index.css
    components/
      SiteFooter.jsx
      SiteHeader.jsx
    pages/
      HomePage.jsx
      SignupPage.jsx
    main.jsx
```

메인 페이지(`/`)의 가입 버튼을 누르면 회원가입 페이지(`/signup`)로 이동합니다.
`App.jsx`는 경로 전환만 담당하고, 화면은 `pages/`의 페이지 컴포넌트로 분리되어 있습니다.
헤더와 푸터는 `components/`에서 공통으로 사용합니다. 회원 정보 제출 시 Vite 프록시를 통해
백엔드 `POST /api/users`에 가입 데이터를 전송합니다. 폼은 컨트롤러 필수값인
`name`, `email`, `user_id`, `password`, `user_type`을 반영합니다. 일반 가입의
유형은 `customer`로 고정하고 `address`는 선택 항목으로 받습니다.
비밀번호 확인 및 필수 약관 동의는 브라우저에서 검사하지만, 약관 동의 기록은
현재 백엔드 스키마에 저장되지 않습니다. 전화번호 또한 현재 컨트롤러가 지원하지
않아 가입 정보로 전송하지 않습니다. 로그인 페이지는 아직 구현되어 있지 않습니다.
