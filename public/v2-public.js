(() => {
  const i18n = window.workcrutePublicI18n;
  const root = location.pathname.startsWith("/Workcrute/") ? "/Workcrute" : "";
  const allowedExtensions = new Set(["pdf", "doc", "docx"]);
  const maxBytes = 8 * 1024 * 1024;

  const text = (key, replacements = {}) => {
    let value = i18n.t(key);
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replace(`{${name}}`, replacement);
    });
    return value;
  };

  const openDatabase = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open("workcrute-v2", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("drafts")) {
          request.result.createObjectStore("drafts");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const saveCv = async (file) => {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("drafts", "readwrite");
      transaction.objectStore("drafts").put(file, "cv");
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  };

  function setupCvEntry() {
    const input = document.querySelector("[data-cv-file]");
    const drop = document.querySelector("[data-cv-drop]");
    const feedback = document.querySelector("[data-cv-feedback]");
    if (!input || !drop || !feedback) return;

    const handleFile = async (file) => {
      feedback.classList.remove("is-error", "is-ready");
      const extension = String(file?.name || "").split(".").pop().toLowerCase();
      if (!file || !allowedExtensions.has(extension)) {
        feedback.textContent = text("v2_file_type_error");
        feedback.classList.add("is-error");
        return;
      }
      if (file.size > maxBytes) {
        feedback.textContent = text("v2_file_size_error");
        feedback.classList.add("is-error");
        return;
      }
      feedback.textContent = text("v2_file_ready", { name: file.name });
      feedback.classList.add("is-ready");
      try {
        await saveCv(file);
      } catch {
        sessionStorage.setItem("workcrute_cv_name", file.name);
      }
      window.setTimeout(() => {
        location.href = `${root}/postuler/`;
      }, 350);
    };

    input.addEventListener("change", () => handleFile(input.files?.[0]));
    drop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });
    ["dragenter", "dragover"].forEach((name) =>
      drop.addEventListener(name, (event) => {
        event.preventDefault();
        drop.classList.add("is-dragging");
      }),
    );
    ["dragleave", "drop"].forEach((name) =>
      drop.addEventListener(name, (event) => {
        event.preventDefault();
        drop.classList.remove("is-dragging");
      }),
    );
    drop.addEventListener("drop", (event) => handleFile(event.dataTransfer?.files?.[0]));
  }

  function setupReveal() {
    const elements = [...document.querySelectorAll("[data-reveal]")];
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    elements.forEach((element) => observer.observe(element));
  }

  const init = () => {
    setupCvEntry();
    setupReveal();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
