const providerSend = async (env, message) => {
  if (env.ENVIRONMENT === "test") return "test-delivery";
  if (env.EMAIL?.send) {
    const result = await env.EMAIL.send(message);
    return result?.id || null;
  }
  if (!env.EMAIL_FROM || !env.EMAIL_PROVIDER_API_KEY) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [message.to], subject: message.subject, text: message.text }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
  return result.id || null;
};

export async function enqueueUserEmail(env, { userId = null, recipient, eventType, resourceType = null, resourceId = null, subject, text }) {
  if (!recipient || !subject || !text) return null;
  const id = crypto.randomUUID();
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO user_email_outbox(id,user_id,recipient,event_type,resource_type,resource_id,subject,body) VALUES(?,?,?,?,?,?,?,?)",
  ).bind(id, userId, recipient, eventType, resourceType, resourceId, subject, text).run();
  return result.meta?.changes ? id : null;
}

export async function processUserEmailOutbox(env, limit = 25) {
  const { results = [] } = await env.DB.prepare(
    "SELECT * FROM user_email_outbox WHERE status IN ('pending','failed') AND attempts<max_attempts AND next_attempt_at<=CURRENT_TIMESTAMP ORDER BY created_at LIMIT ?",
  ).bind(limit).all();
  const report = { sent: 0, failed: 0 };
  for (const row of results) {
    const claimed = await env.DB.prepare(
      "UPDATE user_email_outbox SET status='processing',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('pending','failed')",
    ).bind(row.id).run();
    if (!claimed.meta?.changes) continue;
    try {
      const providerId = await providerSend(env, { to: row.recipient, subject: row.subject, text: row.body });
      await env.DB.prepare(
        "UPDATE user_email_outbox SET status='sent',attempts=attempts+1,last_error=NULL,sent_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(row.id).run();
      report.sent++;
      console.log(JSON.stringify({ event: "user_email_sent", id: row.id, type: row.event_type, providerId }));
    } catch (error) {
      const attempts = Number(row.attempts) + 1;
      await env.DB.prepare(
        "UPDATE user_email_outbox SET status='failed',attempts=?,last_error=?,next_attempt_at=datetime('now',?),updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(attempts, String(error?.message || error).slice(0, 500), `+${Math.min(3600, 60 * 2 ** Math.max(0, attempts - 1))} seconds`, row.id).run();
      report.failed++;
    }
  }
  return report;
}
