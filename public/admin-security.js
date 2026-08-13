(() => {
  const setStatus = (form, message, type = "") => { const node = form.querySelector("[data-status]"); node.textContent = message; node.className = `adm-status ${type}`; };
  document.addEventListener("admin:ready", (event) => {
    const data = event.detail;
    document.querySelector("[data-email-state]").textContent = data.security.email ? `${data.security.email} · ${data.security.emailVerified ? "vérifiée" : "non vérifiée"}` : "Aucune adresse administrative configurée.";
    document.querySelector("[data-idle-expiry]").textContent = new Date(data.admin.idleExpiresAt).toLocaleString();
    document.querySelector("[data-session-expiry]").textContent = new Date(data.admin.sessionExpiresAt).toLocaleString();
  });
  const emailRequest = document.querySelector("[data-email-request]");
  const emailConfirm = document.querySelector("[data-email-confirm]");
  let emailRequestId = "";
  emailRequest.addEventListener("submit", async (event) => {
    event.preventDefault(); const button = emailRequest.querySelector("button"); button.disabled = true;
    try { const d = await adminApi("/api/admin/security/email-change/request", { method:"POST", body:JSON.stringify(Object.fromEntries(new FormData(emailRequest))) }); emailRequestId = d.requestId; emailConfirm.hidden = false; emailConfirm.code.focus(); setStatus(emailRequest,"Code envoyé.","success"); }
    catch(e){ setStatus(emailRequest,e.message,"error"); } finally { button.disabled = false; }
  });
  emailConfirm.addEventListener("submit", async (event) => {
    event.preventDefault(); const button=emailConfirm.querySelector("button"); button.disabled=true;
    try { const d=await adminApi("/api/admin/security/email-change/confirm",{method:"POST",body:JSON.stringify({requestId:emailRequestId,code:emailConfirm.code.value})}); setStatus(emailConfirm,`Adresse ${d.email} vérifiée.`,"success"); emailConfirm.reset(); }
    catch(e){setStatus(emailConfirm,e.message,"error")}finally{button.disabled=false}
  });
  document.querySelector("[data-email-test]").addEventListener("click", async (event) => { event.currentTarget.disabled=true; try{await adminApi("/api/admin/security/email-test",{method:"POST"});setStatus(emailRequest,"Email test envoyé.","success")}catch(e){setStatus(emailRequest,e.message,"error")}finally{event.currentTarget.disabled=false} });
  document.querySelectorAll("[data-secret-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => { event.preventDefault(); const button=form.querySelector("button");button.disabled=true;try{const body=Object.fromEntries(new FormData(form));body.level=Number(form.dataset.level);const d=await adminApi("/api/admin/security/secret-change/request",{method:"POST",body:JSON.stringify(body)});const confirm=document.querySelector(`[data-secret-confirm][data-level="${form.dataset.level}"]`);confirm.dataset.requestId=d.requestId;confirm.hidden=false;confirm.code.focus();setStatus(form,"Code envoyé à l’adresse administrative.","success")}catch(e){setStatus(form,e.message,"error")}finally{button.disabled=false} });
  });
  document.querySelectorAll("[data-secret-confirm]").forEach((form) => {
    form.addEventListener("submit",async(event)=>{event.preventDefault();const button=form.querySelector("button");button.disabled=true;try{await adminApi("/api/admin/security/secret-change/confirm",{method:"POST",body:JSON.stringify({requestId:form.dataset.requestId,code:form.code.value})});setStatus(form,"Secret modifié. Les autres sessions ont été révoquées.","success");form.reset()}catch(e){setStatus(form,e.message,"error")}finally{button.disabled=false}});
  });
})();
