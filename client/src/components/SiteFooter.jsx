function SiteFooter({ onNavigate }) {
  return (
    <footer className="site-footer">
      <button type="button" onClick={() => onNavigate('/')}>MAISON LUNE</button>
      <span>© 2026 MAISON LUNE. ALL RIGHTS RESERVED.</span>
      <nav aria-label="푸터 메뉴">
        <a href="#terms">이용약관</a>
        <a href="#privacy">개인정보 처리방침</a>
        <a href="#contact">고객센터</a>
      </nav>
    </footer>
  )
}

export default SiteFooter
