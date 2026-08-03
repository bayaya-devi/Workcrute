(() => {
  const style = document.createElement('style');
  style.textContent = `
    .head { background: transparent; border-color: transparent; transition: background-color 180ms ease, backdrop-filter 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
    .head.is-scrolled { background: rgba(255,255,255,.88); backdrop-filter: blur(14px); border-color: #dce5e0; box-shadow: 0 4px 18px rgba(16,59,53,.05); }
    button, [data-public], [data-app], .role, .job { cursor: pointer; transition: transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
    .btn:hover, .role:hover, .job:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(16,59,53,.10); }
    .btn:active, .role:active { transform: translateY(0); }
    button:disabled { opacity: .55; cursor: not-allowed; transform: none; }
    [data-reveal] { opacity: 0; transform: translateY(18px); transition: opacity 460ms cubic-bezier(.2,.8,.2,1), transform 460ms cubic-bezier(.2,.8,.2,1); }
    [data-reveal="left"] { transform: translateX(-22px); }
    [data-reveal="right"] { transform: translateX(22px); }
    [data-reveal="scale"] { transform: scale(.97); }
    [data-reveal].visible { opacity: 1; transform: none; }
    .hero h1, .brand { animation: workcrute-enter 520ms cubic-bezier(.2,.8,.2,1) both; }
    .hero p { animation: workcrute-enter 520ms 90ms cubic-bezier(.2,.8,.2,1) both; }
    .hero .btn { animation: workcrute-enter 520ms 160ms cubic-bezier(.2,.8,.2,1) both; }
    @keyframes workcrute-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    html[dir="rtl"] .nav { margin-left: 0; margin-right: auto; }
    html[dir="rtl"] .actions { margin-left: 0; margin-right: 24px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } [data-reveal] { opacity: 1; transform: none; } }
  `;
  document.head.append(style);
  const header = document.querySelector('.head');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader(); window.addEventListener('scroll', updateHeader, { passive: true });
  const reveal = [...document.querySelectorAll('.public .section, .public .band, .match')];
  const directions = ['left', 'right', 'scale', ''];
  reveal.forEach((el, index) => { el.dataset.reveal = directions[index % directions.length]; el.style.transitionDelay = (index % 4) * 65 + 'ms'; });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  reveal.forEach(el => observer.observe(el));
})();