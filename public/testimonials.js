(() => {
  const track = document.querySelector("#testimonial-track");
  if (!track || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cards = [...track.children]; let active = 1;
  const show = () => { cards.forEach((card, index) => card.classList.toggle("active", index === active)); const width = cards[0].getBoundingClientRect().width + 16; track.style.transform = `translateX(-${Math.max(0, active - 1) * width}px)`; };
  setInterval(() => { active = (active + 1) % cards.length; show(); }, 3600);
  window.addEventListener("resize", show, { passive: true }); show();
})();
