const defaults = {
  400: ["VALIDATION_ERROR", "Vérifiez les informations saisies."],
  401: ["UNAUTHORIZED", "Votre session a expiré ou vous devez vous connecter."],
  403: ["FORBIDDEN", "Vous n’avez pas l’autorisation d’effectuer cette action."],
  404: ["NOT_FOUND", "La ressource demandée est introuvable."],
  405: ["METHOD_NOT_ALLOWED", "Cette action n’est pas disponible."],
  409: ["CONFLICT", "Cette action entre en conflit avec des données existantes."],
  413: ["UPLOAD_TOO_LARGE", "Le fichier dépasse la taille maximale autorisée."],
  415: ["UPLOAD_FORMAT_INVALID", "Le format du fichier n’est pas accepté."],
  429: ["RATE_LIMITED", "Trop de tentatives. Réessayez plus tard."],
  500: ["INTERNAL_ERROR", "Un problème technique est survenu. Réessayez dans quelques instants."],
  503: ["SERVICE_UNAVAILABLE", "Le service est temporairement indisponible."],
  507: ["STORAGE_ERROR", "Le fichier n’a pas pu être enregistré."],
};

const sensitive = /password|mot de passe|hash|token|session|otp|secret|stack|sql|database|d1|exception/i;
const safeMessage = (message, status) => {
  const fallback = defaults[status]?.[1] || defaults[500][1];
  if (!message || status >= 500 || sensitive.test(message)) return fallback;
  return String(message).slice(0, 500);
};
export function classifyError(status, message = "", route = "") {
  const text = `${message} ${route}`.toLowerCase();
  let code = defaults[status]?.[0] || "API_ERROR";
  let service = "api";
  if (/document|fichier|upload|stockage|storage/.test(text)) service = "upload";
  if (/email|messagerie/.test(text)) service = "email";
  if (/matching|analyse|chatbot|\bia\b/.test(text)) service = "ai";
  if (/auth|session|connexion|secret/.test(text) || [401,403].includes(status)) service = "auth";
  if (/format|pdf|docx?/.test(text)) code = "UPLOAD_FORMAT_INVALID";
  if (/8 mo|taille|trop gros|too large/.test(text)) code = "UPLOAD_TOO_LARGE";
  if (/stockage|storage/.test(text)) code = "STORAGE_ERROR";
  if (/analyse cv/.test(text)) code = "CV_ANALYSIS_ERROR";
  if (/email|messagerie/.test(text) && status >= 500) code = "EMAIL_DELIVERY_ERROR";
  return { code, service, userMessage: safeMessage(message, status) };
}
export async function recordAppError(env, details) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO app_errors(id,request_id,severity,service,code,user_message,technical_message,user_id,route,method,http_status,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
  ).bind(id,details.requestId,details.severity,details.service,details.code,details.userMessage,details.technicalMessage?.slice(0,2000)||null,details.userId||null,details.route||null,details.method||null,details.httpStatus||null,JSON.stringify(details.metadata||{})).run();
  return id;
}
export async function normalizeApiError(response, env, request, route, requestId) {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  if (response.status < 400) return new Response(response.body, { status: response.status, headers });
  const payload = await response.clone().json().catch(() => ({}));
  const classified = classifyError(response.status, payload.userMessage || payload.error, route);
  const body = { code: payload.code || classified.code, userMessage: payload.userMessage || classified.userMessage, requestId, timestamp: new Date().toISOString() };
  try { await recordAppError(env,{requestId,severity:response.status>=500?"critical":response.status>=400?"warning":"info",service:classified.service,code:body.code,userMessage:body.userMessage,technicalMessage:payload.error,route,method:request.method,httpStatus:response.status}); } catch {}
  headers.set("content-type", "application/json; charset=utf-8");
  headers.delete("content-length");
  return new Response(JSON.stringify(body), { status: response.status, headers });
}
