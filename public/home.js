(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = document.querySelector("[data-home-nav]");
  const heroMedia = document.querySelector("[data-parallax]");
  let lastY = 0, timer = 0, ticking = false;
  const showNavigation = () => nav.classList.remove("is-hidden");
  function update() {
    const y = scrollY, delta = y - lastY;
    nav.classList.toggle("is-scrolled", y > 18);
    if (!reduced && y > 80 && delta > 14) nav.classList.add("is-hidden");
    if (delta < -8 || y < 18) showNavigation();
    clearTimeout(timer);
    timer = setTimeout(showNavigation, 340);
    if (!reduced && heroMedia) heroMedia.style.setProperty("--parallax", Math.min(y * .045, 20) + "px");
    lastY = y; ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  update();
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
  }), { threshold: .16 });
  document.querySelectorAll(".reveal,[data-timeline]").forEach(node => reduced ? node.classList.add("is-visible") : observer.observe(node));
})();
