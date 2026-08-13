(() => {
  const title = document.body.dataset.title || "Module administrateur";
  document.querySelector("[data-foundation-title]").textContent = title;
})();
