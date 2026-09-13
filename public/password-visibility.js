(() => {
  const labels = { fr: ["Afficher le mot de passe", "Masquer le mot de passe"], en: ["Show password", "Hide password"], ar: ["إظهار كلمة المرور", "إخفاء كلمة المرور"] };
  const scriptBase = new URL(".", document.currentScript.src);
  function refresh() {
    const language = document.documentElement.lang || "fr";
    document.querySelectorAll('input[type="password"]').forEach(input => {
      if (input.parentElement.querySelector("[data-password-toggle]")) return;
      const wrap=document.createElement("span");wrap.className="password-field";
      input.replaceWith(wrap);wrap.append(input);
      const button=document.createElement("button");button.type="button";button.dataset.passwordToggle="";
      wrap.append(button);
    });
    document.querySelectorAll("[data-password-toggle]").forEach(button => {
      const input = button.parentElement.querySelector("input");
      if (!input) return;
      const visible = input.type === "text";
      button.removeAttribute("data-i18n");
      button.classList.add("password-eye");
      button.setAttribute("aria-label", (labels[language] || labels.fr)[Number(visible)]);
      button.setAttribute("aria-pressed", String(visible));
      button.title = button.getAttribute("aria-label");
      const icon = document.createElement("img");
      icon.src = new URL(`assets/${visible ? "eye" : "eye-off"}.svg`, scriptBase).href;
      icon.alt = ""; icon.width = 20; icon.height = 20;
      button.replaceChildren(icon);
    });
  }
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-password-toggle]");
    if (!button) return;
    event.preventDefault();
    const input = button.parentElement.querySelector("input");
    if (input) input.type = input.type === "password" ? "text" : "password";
    refresh();
  });
  document.addEventListener("workcrute:language", refresh);
  document.addEventListener("admin:language", refresh);
  window.WorkcrutePasswordVisibility = { refresh };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh); else refresh();
})();
