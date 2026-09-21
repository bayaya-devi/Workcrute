(() => {
  const form = document.querySelector("[data-v2-application]");
  if (!form) return;
  const i18n = window.workcrutePublicI18n;
  const stepNodes = [...form.querySelectorAll("[data-step]")];
  const steps = [stepNodes[2], stepNodes[0], stepNodes[1], stepNodes[3]];
  const progress = [...document.querySelectorAll("[data-progress]")];
  const back = form.querySelector("[data-back]");
  const next = form.querySelector("[data-next]");
  const submit = form.querySelector("[data-submit]");
  const cancel = form.querySelector("[data-cancel]");
  const error = form.querySelector("[data-form-error]");
  const cvInput = form.elements.cvInput;
  const coverInput = form.elements.coverInput;
  let current = 0;
  let cvFile = null;
  let coverFile = null;
  let sending = false;
  let questions=[];
  const questionRoot=document.createElement("div");questionRoot.className="wc-form-grid";steps[2].append(questionRoot);
  const translateQuestions=()=>questionRoot.querySelectorAll('[data-question-label]').forEach(node=>{const question=questions.find(item=>item.id===node.dataset.questionLabel);if(question)node.textContent=question['label_'+i18n.getLanguage()]+(question.required?' *':'');});
  async function loadQuestions(){
    next.disabled=true;
    try{const response=await fetch(window.workcrute.apiUrl('/api/v2/questions'),{credentials:'omit'});if(!response.ok)throw new Error('questions');questions=(await response.json()).items;questionRoot.replaceChildren();questions.forEach(question=>{const label=document.createElement('label');label.className='wc-field';const text=document.createElement('span');text.dataset.questionLabel=question.id;const input=document.createElement(question.type==='textarea'?'textarea':'input');if(question.type!=='textarea')input.type=question.type;input.name='question_'+question.id;input.required=Boolean(question.required);if(['text','textarea'].includes(question.type))input.maxLength=4000;label.append(text,input);questionRoot.append(label);});translateQuestions();form.dataset.questionsReady='true';next.disabled=false;}catch{questionRoot.textContent=t('apply_submit_error');const retry=document.createElement('button');retry.type='button';retry.className='wc-button';retry.textContent=t('retry');retry.addEventListener('click',loadQuestions);questionRoot.append(retry);}
  }
  const idempotencyKey =
    sessionStorage.getItem("workcrute_v2_submission_key") ||
    crypto.randomUUID().replaceAll("-", "");
  sessionStorage.setItem("workcrute_v2_submission_key", idempotencyKey);

  const t = (key) => i18n.t(key);
  let displayedErrorKey = "";
  const setError = (message = "") => {
    displayedErrorKey = message ? ["apply_validation_error", "apply_submit_error", "apply_rate_error", "v2_file_type_error"].find(key => t(key) === message) || "apply_submit_error" : "";
    error.textContent = message;
    if (message) error.focus?.();
  };
  const openDatabase = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open("workcrute-v2", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("drafts")) request.result.createObjectStore("drafts");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const restoreCv = async () => {
    try {
      const database = await openDatabase();
      const savedCv = await new Promise((resolve, reject) => {
        const request = database.transaction("drafts").objectStore("drafts").get("cv");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      database.close();
      if (!cvFile) cvFile = savedCv;
      if (cvFile) document.querySelector("[data-cv-name]").textContent = cvFile.name;
    } catch {}
  };

  function showStep(index) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, position) => {
      const active = position === current;
      step.hidden = !active;
      step.classList.toggle("is-active", active);
    });
    progress.forEach((item, position) => {
      item.classList.toggle("is-active", position === current);
      item.classList.toggle("is-complete", position < current);
    });
    back.disabled = current === 0 || sending;
    const confirmation = current === steps.length - 1;
    next.hidden = confirmation;
    next.style.display = confirmation ? "none" : "inline-flex";
    next.setAttribute("aria-hidden", String(confirmation));
    submit.hidden = !confirmation;
    submit.style.display = confirmation ? "inline-flex" : "none";
    submit.disabled = !confirmation || sending;
    setError();
    form.querySelector("h2")?.focus?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateCurrent() {
    let valid = true;
    const missing = [];
    const required = [...steps[current].querySelectorAll("input,select,textarea")];
    required.forEach((field) => {
      if (field.disabled || field.closest("[hidden]")) return;
      const fieldValid = field.type === "checkbox" ? !field.required || field.checked : field.checkValidity();
      field.setAttribute("aria-invalid", String(!fieldValid));
      if (!fieldValid) {
        valid = false;
        const label = field.closest("label")?.querySelector("span")?.textContent?.trim() || field.name;
        if (label && !missing.includes(label)) missing.push(label);
      }
    });
    if (current === 2 && form.elements.domain.value === "other" && !form.elements.domainOther.value.trim()) {
      form.elements.domainOther.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (current === 0 && (!validDocument(cvFile) || (coverFile && !validDocument(coverFile)))) valid = false;
    setError(valid ? "" : `${t("apply_validation_error")} ${missing.length ? `(${missing.join(", ")})` : ""}`);
    if (!valid) steps[current].querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  }

  function renderReview() {
    const fields = [
      ["first_name", form.elements.firstName.value],
      ["last_name", form.elements.lastName.value],
      ["gender", form.elements.gender.options[form.elements.gender.selectedIndex]?.text],
      ["email", form.elements.email.value],
      ["phone", form.elements.phone.value],
      ["professional_title", form.elements.professionalTitle.value],
      ["domain", form.elements.domainOther.value || form.elements.domain.options[form.elements.domain.selectedIndex]?.text],
      ["experience", form.elements.experienceLevel.options[form.elements.experienceLevel.selectedIndex]?.text],
      ["availability", form.elements.availability.options[form.elements.availability.selectedIndex]?.text],
      ["cv", cvFile?.name],
    ];
    form.querySelector("[data-review]").innerHTML = fields
      .map(([key, value]) => `<div><dt>${t(key)}</dt><dd>${String(value || "—").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]))}</dd></div>`)
      .join("");
  }

  form.elements.domain.addEventListener("change", () => {
    const other = form.querySelector(".wc-domain-other");
    const visible = form.elements.domain.value === "other";
    other.hidden = !visible;
    form.elements.domainOther.required = visible;
  });
  cvInput.addEventListener("change", () => {
    cvFile = cvInput.files?.[0] || null;
    document.querySelector("[data-cv-name]").textContent = cvFile?.name || "";
    if (validDocument(cvFile) && current === 0) setTimeout(() => showStep(1), 150);
  });
  coverInput.addEventListener("change", () => {
    coverFile = coverInput.files?.[0] || null;
    document.querySelector("[data-cover-name]").textContent = coverFile?.name || "";
  });
  next.addEventListener("click", () => {
    if (!validateCurrent()) return;
    if (current === 2) renderReview();
    showStep(current + 1);
  });
  back.addEventListener("click", () => showStep(current - 1));
  cancel.addEventListener("click", async () => {
    if (sending) return;
    const dirty = cvFile || [...form.elements].some(field => field.name && (field.type === "checkbox" ? field.checked : field.value));
    if (dirty && !window.confirm(t("apply_cancel_confirm"))) return;
    sessionStorage.removeItem("workcrute_v2_submission_key");
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction("drafts", "readwrite");
        transaction.objectStore("drafts").delete("cv");
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    } catch {}
    location.assign(location.pathname.startsWith("/Workcrute/") ? "/Workcrute/" : "/");
  });

  function validDocument(file) {
    return file && file.size > 0 && file.size <= 8 * 1024 * 1024 && /\.(pdf|doc|docx)$/i.test(file.name);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    if (current !== steps.length - 1) { next.click(); return; }
    if (!validateCurrent()) return;
    sending = true;
    back.disabled = cancel.disabled = true;
    submit.disabled = true;
    submit.textContent = t("apply_sending");
    setError();
    try {
    if (!validDocument(cvFile)) throw new Error(t("v2_file_type_error"));
    const data = new FormData();
    for (const name of ["firstName", "lastName", "gender", "email", "phone", "city", "country", "professionalTitle", "domain", "domainOther", "experienceLevel", "availability", "motivation"]) {
      data.append(name, form.elements[name].value);
    }
    data.append("language", i18n.getLanguage());
    data.append("consent", String(form.elements.consent.checked));
    data.append("idempotencyKey", idempotencyKey);
    data.append("answers", JSON.stringify({
      ...Object.fromEntries(questions.map(question=>{const input=form.elements['question_'+question.id];return[question.id,question.type==='checkbox'?input.checked:input.value];})),
      workModes: [...form.querySelectorAll('[name="workMode"]:checked')].map((item) => item.value),
    }));
    data.append("cv", cvFile, cvFile.name);
    if (coverFile) data.append("coverLetter", coverFile, coverFile.name);
      const response = await fetch(window.workcrute.apiUrl("/api/v2/applicants"), { method: "POST", credentials: "omit", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const invalidFields = Object.keys(result.fields || {});
        const invalidStep = steps.findIndex(step => invalidFields.some(name => step.querySelector(`[name="${name}"]`)));
        if (invalidStep >= 0) showStep(invalidStep);
        const key = result.code === "RATE_LIMITED" ? "apply_rate_error" : result.code === "VALIDATION_ERROR" ? "apply_validation_error" : "apply_submit_error";
        throw new Error(t(key));
      }
      if (!result.ok || !result.reference) throw new Error(t("apply_submit_error"));
      form.hidden = true;
      document.querySelector(".wc-apply-progress").hidden = true;
      const success = document.querySelector("[data-application-success]");
      success.hidden = false;
      success.querySelector("[data-reference]").textContent = result.reference;
      sessionStorage.removeItem("workcrute_v2_submission_key");
      try {
        const database = await openDatabase();
        database.transaction("drafts", "readwrite").objectStore("drafts").delete("cv");
        database.close();
      } catch {}
    } catch (failure) {
      setError(failure.message || t("apply_submit_error"));
    } finally {
      sending = false;
      cancel.disabled = false;
      back.disabled = current === 0;
      submit.disabled = false;
      submit.textContent = t("apply_send");
    }
  });

  document.addEventListener("workcrute:language", () => {
    translateQuestions();
    if (current === 3) renderReview();
    if (displayedErrorKey) setError(t(displayedErrorKey));
    if (sending) submit.textContent = t("apply_sending");
  });
  restoreCv();
  showStep(0);
  loadQuestions();
})();
