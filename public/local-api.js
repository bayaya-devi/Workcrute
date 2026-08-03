(() => {
  const storageKey = "workcrute.local.preview.v1";
  const questions = [{ field_key: "domain", labels: { fr: "Domaine recherche" }, is_required: 1, options: ["Informatique et numerique", "Commerce et vente", "Finance et comptabilite", "Ressources humaines", "Marketing et communication", "Industrie et ingenierie", "Logistique et transport", "Sante", "Hotellerie et tourisme", "Education et formation", "Autre"] }];
  const read = () => JSON.parse(localStorage.getItem(storageKey) || '{"accounts":[],"session":null,"documents":[],"notifications":[]}');
  const write = value => localStorage.setItem(storageKey, JSON.stringify(value));
  const id = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
  const error = message => { throw new Error(message); };
  const current = state => state.accounts.find(account => account.id === state.session);
  const profileFor = account => account.role === "recruiter" ? { first_name: account.firstName, last_name: account.lastName, phone: account.phone, company_name: account.companyName || "", job_title: account.jobTitle || "" } : { first_name: account.firstName, last_name: account.lastName, phone: account.phone, ...(account.profile || {}) };
  async function request(path, options = {}) {
    const state = read(); const body = typeof options.body === "string" ? JSON.parse(options.body || "{}") : options.body || {};
    if (path === "/api/auth/register" && options.method === "POST") {
      if (!["candidate", "recruiter"].includes(body.role)) error("Type de compte invalide.");
      if (state.accounts.some(account => account.email === String(body.email || "").toLowerCase())) error("Un compte existe deja avec cette adresse email.");
      const account = { id: id(), email: String(body.email).toLowerCase(), password: body.password, role: ["candidate","recruiter"].includes(body.role) ? body.role : "candidate", firstName: body.firstName, lastName: body.lastName, phone: body.phone, profile: {} };
      state.accounts.push(account); state.session = account.id; state.notifications.unshift({ id: id(), user_id: account.id, title: "Bienvenue sur Workcrute", body: "Votre compte est pret.", is_read: 0 }); write(state);
      return { user: { id: account.id, email: account.email, role: account.role } };
    }
    if (path === "/api/auth/login" && options.method === "POST") {
      const account = state.accounts.find(item => item.email === String(body.email || "").toLowerCase() && item.password === body.password);
      if (!account) error("Email ou mot de passe incorrect."); state.session = account.id; write(state); return { user: { id: account.id, email: account.email, role: account.role } };
    }
    if (path === "/api/auth/logout" && options.method === "POST") { state.session = null; write(state); return { ok:true }; }
    const account = current(state); if (!account) error("Connectez-vous pour continuer.");
    if (path === "/api/auth/me") return { user: { id: account.id, email: account.email, role: account.role }, profile: profileFor(account) };
    if (path === "/api/questionnaire") return { questions };
    if (path === "/api/profile" && options.method === "PATCH") { account.profile = { ...(account.profile || {}), city: body.city || "", region: body.region || "", availability: body.availability || "", professional_title: body.professionalTitle || body.professional_title || "", introduction: body.introduction || "", questionnaire_answers: JSON.stringify(body.questionnaireAnswers || {}) }; write(state); return { profile: profileFor(account) }; }
    if (path === "/api/documents" && !options.method) return { documents: state.documents.filter(doc => doc.user_id === account.id) };
    if (path === "/api/notifications" && !options.method) return { notifications: state.notifications.filter(item => item.user_id === account.id) };
    if (path === "/api/notifications" && options.method === "POST") { state.notifications.forEach(item => { if (item.user_id === account.id) item.is_read = 1; }); write(state); return { ok: true }; }
    if (path.startsWith("/api/documents/") && options.method === "DELETE") { state.documents = state.documents.filter(doc => !(doc.id === path.split("/").pop() && doc.user_id === account.id)); write(state); return { ok: true }; }
    error("Cette action n'est pas disponible dans l'apercu local.");
  }
  async function uploadDocument(form) { const state = read(); const account = current(state); if (!account) error("Connectez-vous pour continuer."); const file = form.get("file"); if (!file || !file.size) return { ok: true }; state.documents.push({ id: id(), user_id: account.id, kind: form.get("kind") || "cv", original_name: file.name, size_bytes: file.size }); write(state); return { ok: true }; }
  window.workcruteLocalApi = { request, uploadDocument };
})();
