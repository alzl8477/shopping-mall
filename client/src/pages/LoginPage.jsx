import { useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import Navbar from './Navbar'

function LoginPage({
  onNavigate,
  onAuthenticated,
  currentUser,
  onLogout,
  redirectTo = '/',
}) {
  const [identifierType, setIdentifierType] = useState('email')
  const [identifier, setIdentifier] = useState(
    () => localStorage.getItem('maison-lune-remembered-id') || '',
  )
  const [password, setPassword] = useState('')
  const [rememberId, setRememberId] = useState(
    () => Boolean(localStorage.getItem('maison-lune-remembered-id')),
  )
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? '아이디 또는 비밀번호를 확인해 주세요.'
            : result.message || '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        )
      }

      if (
        typeof result.token !== 'string' ||
        !result.token ||
        !result.user ||
        typeof result.user.name !== 'string' ||
        typeof result.expiresIn !== 'number' ||
        result.expiresIn <= 0
      ) {
        throw new Error('로그인 응답을 확인할 수 없습니다. 다시 시도해 주세요.')
      }

      sessionStorage.setItem('maison-lune-token', result.token)
      sessionStorage.setItem('maison-lune-user', JSON.stringify(result.user))
      sessionStorage.setItem(
        'maison-lune-token-expires-at',
        String(Date.now() + result.expiresIn * 1000),
      )
      if (rememberId) {
        localStorage.setItem('maison-lune-remembered-id', identifier.trim())
      } else {
        localStorage.removeItem('maison-lune-remembered-id')
      }
      onAuthenticated(result.user)
      onNavigate(
        redirectTo.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/',
      )
    } catch (submitError) {
      setMessage(
        submitError.message === 'Failed to fetch'
          ? '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.'
          : submitError.message,
      )
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function showUnavailableMessage() {
    setMessage('해당 기능은 준비 중입니다. 고객센터로 문의해 주세요.')
    setMessageType('notice')
  }

  return (
    <main className="storefront login-storefront">
      <Navbar
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
        login
      />

      <section className="login-layout" aria-labelledby="login-title">
        <div className="login-main">
          <div className="login-heading">
            <p className="section-label">WELCOME BACK</p>
            <h1 id="login-title">로그인</h1>
            <p>계정에 로그인하고 메종 륀의 이야기를 이어가세요.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-tabs" role="tablist" aria-label="로그인 방식">
              <button
                aria-selected={identifierType === 'email'}
                className={identifierType === 'email' ? 'is-active' : ''}
                onClick={() => setIdentifierType('email')}
                role="tab"
                type="button"
              >
                이메일
              </button>
              <button
                aria-selected={identifierType === 'id'}
                className={identifierType === 'id' ? 'is-active' : ''}
                onClick={() => setIdentifierType('id')}
                role="tab"
                type="button"
              >
                아이디
              </button>
            </div>

            <label className="login-field">
              <span>{identifierType === 'email' ? '이메일' : '아이디'}</span>
              <input
                autoComplete={identifierType === 'email' ? 'email' : 'username'}
                name="identifier"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={identifierType === 'email' ? 'name@example.com' : '아이디를 입력해 주세요'}
                required
                type={identifierType === 'email' ? 'email' : 'text'}
                value={identifier}
              />
            </label>

            <label className="login-field">
              <span>비밀번호</span>
              <span className="password-control">
                <input
                  autoComplete="current-password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호를 입력해 주세요"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? '숨기기' : '보기'}
                </button>
              </span>
            </label>

            <div className="login-options">
              <label className="remember-option">
                <input
                  checked={rememberId}
                  onChange={(event) => setRememberId(event.target.checked)}
                  type="checkbox"
                />
                <span>아이디 저장</span>
              </label>
              <button type="button" onClick={showUnavailableMessage}>
                비밀번호 찾기
              </button>
            </div>

            {message && (
              <p className={`login-message login-message--${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>
                {message}
              </p>
            )}

            <button className="login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
            <p className="login-helper">
              이메일 또는 아이디와 비밀번호를 입력해 로그인해 주세요.
            </p>
          </form>

          <div className="social-login">
            <p>또는 간편 로그인</p>
            <div className="social-login-buttons">
              <button type="button" onClick={showUnavailableMessage}>
                <span className="social-mark social-mark--kakao">K</span>
                카카오
              </button>
              <button type="button" onClick={showUnavailableMessage}>
                <span className="social-mark social-mark--naver">N</span>
                네이버
              </button>
            </div>
          </div>
        </div>

        <aside className="login-aside">
          <p className="section-label">A LITTLE MORE, WITH US</p>
          <h2>계정이 필요하신가요?</h2>
          <p>
            회원으로 가입하면 주문 내역을 확인하고,
            <br className="desktop-break" /> 위시리스트와 멤버십 혜택을 만나볼 수 있습니다.
          </p>
          <button type="button" onClick={() => onNavigate('/signup')}>
            계정 만들기 <span aria-hidden="true">↗</span>
          </button>
          <div className="login-aside-note">
            <span>MAISON LUNE</span>
            <span>OBJECTS FOR EVERYDAY</span>
          </div>
        </aside>
      </section>

      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

export default LoginPage
