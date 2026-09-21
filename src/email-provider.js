export async function sendTransactionalEmail(env, { to, subject, text, html = null, attachments = [] }) {
  if (env.ENVIRONMENT === "test") return "test-delivery";
  if (!env.EMAIL_FROM || !to) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  if (env.EMAIL?.send) {
    const result = await env.EMAIL.send({ to, from: env.EMAIL_FROM, subject, text, html, attachments });
    return result?.id || null;
  }
  if (env.BREVO_API_KEY) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: env.EMAIL_FROM, name: "Workcrute" },
        to: [{ email: to }], subject, textContent: text,
        ...(html ? { htmlContent: html } : {}),
        ...(attachments.length ? { attachment: attachments.map((a) => ({ content: a.content, name: a.filename || a.name || "piece-jointe" })) } : {}),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`EMAIL_PROVIDER_BREVO_${response.status}:${JSON.stringify(result).slice(0, 300)}`);
    return result.messageId || result.id || null;
  }
  if (env.EMAIL_PROVIDER_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, ...(html ? { html } : {}), attachments }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`EMAIL_PROVIDER_RESEND_${response.status}:${JSON.stringify(result).slice(0, 300)}`);
    return result.id || null;
  }
  throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
}
