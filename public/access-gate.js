(() => {
  const localState = () => {
    try { return JSON.parse(localStorage.getItem("workcrute.local.preview.v1") || "{}"); } catch { return {}; }
  };
  const accountRequired = element => element?.matches("[data-app]") || element?.dataset.public === "jobs" || element?.dataset.public === "job";
  document.addEventListener("click", event => {
    const action = event.target.closest("[data-app], [data-public]");
    if (!accountRequired(action) || !location.hostname.endsWith("github.io")) return;
    if (localState().session) return;
    event.preventDefault(); event.stopImmediatePropagation();
    window.workcruteAuth?.open();
  }, true);
})();
