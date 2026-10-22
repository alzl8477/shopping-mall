import SiteNav from '../components/SiteNav'

function Navbar({
  onNavigate,
  onLogout,
  authMessage,
  currentUser,
  signup = false,
  login = false,
}) {
  return (
    <header className="site-header">
      <button
        className="menu-button"
        type="button"
        aria-label="메뉴"
        onClick={() => onNavigate('/')}
      >
        <span />
        <span />
      </button>
      <button
        className="brand"
        type="button"
        onClick={() => onNavigate('/')}
        aria-label="메종 륀 홈"
      >
        <span className="brand-name">MAISON LUNE</span>
        <span className="brand-caption">OBJECTS FOR EVERYDAY</span>
      </button>
      <SiteNav
        authMessage={authMessage}
        currentUser={currentUser}
        login={login}
        onLogout={onLogout}
        onNavigate={onNavigate}
        signup={signup}
      />
    </header>
  )
}

export default Navbar
