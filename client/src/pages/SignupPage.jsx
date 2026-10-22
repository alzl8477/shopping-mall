import { useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import Navbar from './Navbar'

const initialForm = {
  name: '',
  email: '',
  user_id: '',
  password: '',
  passwordConfirm: '',
  address: '',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function SignupPage({ onNavigate, currentUser, onLogout }) {
  const [form, setForm] = useState(initialForm)
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    marketing: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [openPolicy, setOpenPolicy] = useState('')
  const passwordsMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm
  const emailInvalid =
    form.email.length > 0 && !emailPattern.test(form.email.trim())
  const requiredFieldsMissing = [
    form.name,
    form.email,
    form.user_id,
    form.password,
    form.passwordConfirm,
  ].some((value) => value.trim().length === 0)
  const allAgreed = agreements.terms && agreements.privacy && agreements.marketing

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  function updateAgreement(name, checked) {
    setAgreements((current) => ({ ...current, [name]: checked }))
  }

  function updateAllAgreements(event) {
    const checked = event.target.checked
    setAgreements({ terms: checked, privacy: checked, marketing: checked })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!agreements.terms || !agreements.privacy) {
      setError('필수 이용약관과 개인정보 처리방침에 동의해 주세요.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          user_id: form.user_id.trim(),
          password: form.password,
          ...(form.address.trim() ? { address: form.address.trim() } : {}),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const validationMessages = result.errors
          ? Object.values(result.errors).join(' ')
          : ''
        throw new Error(
          validationMessages || result.message || '회원가입에 실패했습니다.',
        )
      }

      setIsRegistered(true)
      setForm(initialForm)
    } catch (submitError) {
      setError(
        submitError.message === 'Failed to fetch'
          ? '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.'
          : submitError.message,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function togglePolicy(policy) {
    setOpenPolicy((current) => current === policy ? '' : policy)
  }

  return (
    <main className="storefront signup-storefront">
      <Navbar
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
        signup
      />

      <section className="signup-layout">
        <div className="signup-main">
          <button className="back-link" type="button" onClick={() => onNavigate('/')}>
            <span aria-hidden="true">←</span> 홈으로
          </button>

          {isRegistered ? (
            <div className="registered-state" role="status">
              <span className="registered-mark" aria-hidden="true">✓</span>
              <p className="section-label">WELCOME TO MAISON LUNE</p>
              <h1>회원가입이<br />완료되었습니다.</h1>
              <p>Discover a new story with Maison Lune.</p>
              <button className="submit-button" type="button" onClick={() => onNavigate('/')}>
                메인으로 돌아가기
              </button>
            </div>
          ) : (
            <SignupForm
              agreements={agreements}
              allAgreed={allAgreed}
              error={error}
              form={form}
              isSubmitting={isSubmitting}
              onAgreementChange={updateAgreement}
              onAllAgreementsChange={updateAllAgreements}
              onFieldChange={updateField}
              onNavigate={onNavigate}
              onPolicyToggle={togglePolicy}
              onSubmit={handleSubmit}
              openPolicy={openPolicy}
              passwordsMismatch={passwordsMismatch}
              emailInvalid={emailInvalid}
              requiredFieldsMissing={requiredFieldsMissing}
            />
          )}
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} />
    </main>
  )
}

function SignupForm({
  agreements,
  allAgreed,
  error,
  form,
  isSubmitting,
  onAgreementChange,
  onAllAgreementsChange,
  onFieldChange,
  onNavigate,
  onPolicyToggle,
  onSubmit,
  openPolicy,
  passwordsMismatch,
  emailInvalid,
  requiredFieldsMissing,
}) {
  return (
    <>
      <div className="signup-title">
        <p className="section-label">BECOME A MEMBER</p>
        <h1>회원가입</h1>
        <p>새로운 계정을 만들고 쇼핑을 시작하세요.</p>
      </div>

      <form className="signup-form" onSubmit={onSubmit}>
        {error && <div className="form-error" role="alert">{error}</div>}

        <label className="editorial-field">
          <span>이름 <b>*</b></span>
          <input autoComplete="name" name="name" onChange={onFieldChange} placeholder="이름을 입력해 주세요" required value={form.name} />
        </label>

        <label className="editorial-field">
          <span>이메일 <b>*</b></span>
          <input
            aria-describedby={emailInvalid ? 'email-format-error' : undefined}
            aria-invalid={emailInvalid}
            autoComplete="email"
            name="email"
            onChange={onFieldChange}
            placeholder="your@email.com"
            required
            type="email"
            value={form.email}
          />
          {emailInvalid && (
            <small className="field-validation-message" id="email-format-error" role="alert">
              이메일 형식이 올바르지 않습니다.
            </small>
          )}
        </label>

        <label className="editorial-field">
          <span>아이디 <b>*</b></span>
          <input autoComplete="username" name="user_id" onChange={onFieldChange} placeholder="사용할 아이디를 입력해 주세요" required value={form.user_id} />
        </label>

        <label className="editorial-field">
          <span>비밀번호 <b>*</b></span>
          <input autoComplete="new-password" minLength={8} name="password" onChange={onFieldChange} placeholder="8자 이상 입력해 주세요" required type="password" value={form.password} />
          <small>8자 이상 입력해 주세요.</small>
        </label>

        <label className="editorial-field">
          <span>비밀번호 확인 <b>*</b></span>
          <input
            aria-describedby={passwordsMismatch ? 'password-mismatch' : undefined}
            aria-invalid={passwordsMismatch}
            autoComplete="new-password"
            minLength={8}
            name="passwordConfirm"
            onChange={onFieldChange}
            placeholder="비밀번호를 다시 입력해 주세요"
            required
            type="password"
            value={form.passwordConfirm}
          />
          {passwordsMismatch && (
            <small className="password-mismatch" id="password-mismatch" role="alert">
              비밀번호가 일치하지 않습니다.
            </small>
          )}
        </label>

        <label className="editorial-field">
          <span>주소 <em>선택</em></span>
          <input autoComplete="street-address" name="address" onChange={onFieldChange} placeholder="주소를 입력해 주세요" value={form.address} />
        </label>

        <AgreementList
          agreements={agreements}
          allAgreed={allAgreed}
          onAgreementChange={onAgreementChange}
          onAllChange={onAllAgreementsChange}
          onPolicyToggle={onPolicyToggle}
          openPolicy={openPolicy}
        />

        <p className="agreement-note">
          약관 동의 여부는 화면에서 확인하며, 현재 회원 API에 별도 저장하지 않습니다.
        </p>

        {requiredFieldsMissing && (
          <p className="required-fields-message" role="status">
            필수 입력란을 모두 입력하세요.
          </p>
        )}

        <button
          className="submit-button"
          disabled={
            isSubmitting ||
            requiredFieldsMissing ||
            passwordsMismatch ||
            emailInvalid
          }
          type="submit"
        >
          {isSubmitting ? '가입 처리 중...' : '회원가입'}
          {!isSubmitting && <span aria-hidden="true">↗</span>}
        </button>
        <p className="login-prompt">
          이미 계정이 있으신가요?{' '}
          <button type="button" onClick={() => onNavigate('/login')}>로그인</button>
        </p>
      </form>
    </>
  )
}

function AgreementList({
  agreements,
  allAgreed,
  onAgreementChange,
  onAllChange,
  onPolicyToggle,
  openPolicy,
}) {
  return (
    <>
      <div className="agreement-list">
        <label className="agreement-row agreement-row--all">
          <input checked={allAgreed} onChange={onAllChange} type="checkbox" />
          <span>전체 동의</span>
        </label>

        <AgreementRow
          checked={agreements.terms}
          label="이용약관 동의"
          onChange={(checked) => onAgreementChange('terms', checked)}
          onView={() => onPolicyToggle('terms')}
          open={openPolicy === 'terms'}
        />
        <AgreementRow
          checked={agreements.privacy}
          label="개인정보 처리방침 동의"
          onChange={(checked) => onAgreementChange('privacy', checked)}
          onView={() => onPolicyToggle('privacy')}
          open={openPolicy === 'privacy'}
        />

        <label className="agreement-row">
          <input
            checked={agreements.marketing}
            onChange={(event) => onAgreementChange('marketing', event.target.checked)}
            type="checkbox"
          />
          <span>혜택 및 이벤트 알림 동의 <b className="agreement-optional">(선택)</b></span>
        </label>
      </div>

      {openPolicy && (
        <div className="policy-note" role="region">
          <strong>{openPolicy === 'terms' ? '이용약관' : '개인정보 처리방침'}</strong>
          <p>
            상세 문서는 아직 등록되지 않았습니다. 서비스 운영 전
            {openPolicy === 'terms'
              ? ' 이용약관을 확정해야 합니다.'
              : ' 개인정보 수집·이용 항목과 보유 기간을 안내해야 합니다.'}
          </p>
        </div>
      )}
    </>
  )
}

function AgreementRow({ checked, label, onChange, onView, open }) {
  return (
    <div className="agreement-row">
      <label className="agreement-choice">
        <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
        <span>{label} <b>(필수)</b></span>
      </label>
      <button type="button" aria-expanded={open} onClick={onView}>보기</button>
    </div>
  )
}

export default SignupPage
