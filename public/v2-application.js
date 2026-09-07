(() => {
  const form = document.querySelector("[data-v2-application]");
  if (!form) return;
  const i18n = window.workcrutePublicI18n;
  const steps = [...form.querySelectorAll("[data-step]")];
  const progress = [...document.querySelectorAll("[data-progress]")];
  const back = form.querySelector("[data-back]");
  const next = form.querySelector("[data-next]");
  const submit = form.querySelector("[data-submit]");
  const error = form.querySelector("[data-form-error]");
  const cvInput = form.elements.cvInput;
  const coverInput = form.elements.coverInput;
  let current = 0;
  let cvFile = null;
  let coverFile = null;
  let sending = false;
  const idempotencyKey =
    sessionStorage.getItem("workcrute_v2_submission_key") ||
    crypto.randomUUID().replaceAll("-", "");
  sessionStorage.setItem("workcrute_v2_submission_key", idempotencyKey);

  const t = (key) => i18n.t(key);
  const setError = (message = "") => {
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
      cvFile = await new Promise((resolve, reject) => {
        const request = database.transaction("drafts").objectStore("drafts").get("cv");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      database.close();
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
    back.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    submit.hidden = current !== steps.length - 1;
    setError();
    form.querySelector("h2")?.focus?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateCurrent() {
    let valid = true;
    const required = [...steps[current].querySelectorAll("[required]")];
    required.forEach((field) => {
      const fieldValid = field.type === "checkbox" ? field.checked : field.checkValidity();
      field.setAttribute("aria-invalid", String(!fieldValid));
      if (!fieldValid) valid = false;
    });
    if (current === 1 && form.elements.domain.value === "other" && !form.elements.domainOther.value.trim()) {
      form.elements.domainOther.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (current === 2 && !cvFile) valid = false;
    setError(valid ? "" : t("apply_validation_error"));
    if (!valid) steps[current].querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  }

  function renderReview() {
    const fields = [
      ["first_name", form.elements.firstName.value],
      ["last_name", form.elements.lastName.value],
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending || !validateCurrent()) return;
    sending = true;
    submit.disabled = true;
    submit.textContent = t("apply_sending");
    setError();
    const data = new FormData();
    for (const name of ["firstName", "lastName", "email", "phone", "city", "country", "professionalTitle", "domain", "domainOther", "experienceLevel", "availability", "motivation"]) {
      data.append(name, form.elements[name].value);
    }
    data.append("language", i18n.getLanguage());
    data.append("consent", String(form.elements.consent.checked));
    data.append("idempotencyKey", idempotencyKey);
    data.append("answers", JSON.stringify({
      workModes: [...form.querySelectorAll('[name="workMode"]:checked')].map((item) => item.value),
    }));
    data.append("cv", cvFile, cvFile.name);
    if (coverFile) data.append("coverLetter", coverFile, coverFile.name);
    try {
      const response = await fetch("/api/v2/applicants", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.userMessage || t("apply_submit_error"));
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
      submit.disabled = false;
      submit.textContent = t("apply_send");
    }
  });

  document.addEventListener("workcrute:language", () => {
    if (current === 3) renderReview();
  });
  restoreCv();
  showStep(0);
})();
