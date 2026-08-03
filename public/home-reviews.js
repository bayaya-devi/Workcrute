(() => {
  const copy = {
    fr: {
      kicker: "Ils nous font confiance", title: "Des parcours qui avancent",
      intro: "Six retours d'exp\u00e9rience de candidats et de recruteurs.",
      previous: "Afficher l'avis pr\u00e9c\u00e9dent", next: "Afficher l'avis suivant",
      dot: "Afficher l'avis", status: "Avis {current} sur 6",
      reviews: [
        ["Sophie Martin", "Responsable RH - Novalech", "Workcrute nous a permis de trouver rapidement des profils pertinents, sans complexifier notre processus de recrutement."],
        ["Karim Benali", "D\u00e9veloppeur web", "La plateforme est claire et simple. J'ai trouv\u00e9 une offre correspondant r\u00e9ellement \u00e0 mon profil."],
        ["Julie Lef\u00e8vre", "Charg\u00e9e de recrutement - Horizon", "Le suivi des candidatures est fluide et nous fait gagner un temps pr\u00e9cieux au quotidien."],
        ["Ahmed Dupont", "Chef de projet", "Une interface agr\u00e9able, des \u00e9tapes compr\u00e9hensibles et un vrai suivi de chaque candidature."],
        ["Nadia Moreau", "Consultante RH", "Nous trouvons plus facilement les bons profils au bon moment gr\u00e2ce \u00e0 Workcrute."],
        ["Lucas Bernard", "Data Analyst", "Le parcours est rapide, rassurant et parfaitement adapt\u00e9 aux chercheurs d'emploi."]
      ]
    },
    en: {
      kicker: "Trusted by our users", title: "Journeys that move forward",
      intro: "Six perspectives from candidates and recruiters.", previous: "Show previous review",
      next: "Show next review", dot: "Show review", status: "Review {current} of 6",
      reviews: [
        ["Sophie Martin", "HR Manager - Novalech", "Workcrute helped us find relevant profiles quickly without making our recruitment process more complex."],
        ["Karim Benali", "Web Developer", "The platform is clear and simple. I found a role that genuinely matched my profile."],
        ["Julie Lefevre", "Recruitment Specialist - Horizon", "Application tracking is smooth and saves our team valuable time every day."],
        ["Ahmed Dupont", "Project Manager", "A pleasant interface, easy-to-understand steps and meaningful follow-up for every application."],
        ["Nadia Moreau", "HR Consultant", "Workcrute makes it easier to find the right profiles at the right time."],
        ["Lucas Bernard", "Data Analyst", "The journey is fast, reassuring and perfectly suited to job seekers."]
      ]
    },
    ar: {
      kicker: "\u062a\u062c\u0627\u0631\u0628 \u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646\u0627", title: "\u0645\u0633\u0627\u0631\u0627\u062a \u062a\u062a\u0642\u062f\u0651\u0645",
      intro: "\u0633\u062a\u0629 \u0622\u0631\u0627\u0621 \u0645\u0646 \u0627\u0644\u0645\u062a\u0642\u062f\u0651\u0645\u064a\u0646 \u0648\u0627\u0644\u0645\u0648\u0638\u0651\u0641\u064a\u0646.",
      previous: "\u0639\u0631\u0636 \u0627\u0644\u0631\u0623\u064a \u0627\u0644\u0633\u0627\u0628\u0642", next: "\u0639\u0631\u0636 \u0627\u0644\u0631\u0623\u064a \u0627\u0644\u062a\u0627\u0644\u064a",
      dot: "\u0639\u0631\u0636 \u0627\u0644\u0631\u0623\u064a", status: "\u0627\u0644\u0631\u0623\u064a {current} \u0645\u0646 6",
      reviews: [
        ["\u0635\u0648\u0641\u064a \u0645\u0627\u0631\u062a\u0627\u0646", "\u0645\u062f\u064a\u0631\u0629 \u0645\u0648\u0627\u0631\u062f \u0628\u0634\u0631\u064a\u0629 - Novalech", "\u0633\u0627\u0639\u062f\u062a\u0646\u0627 Workcrute \u0641\u064a \u0625\u064a\u062c\u0627\u062f \u0645\u0644\u0641\u0627\u062a \u0645\u0644\u0627\u0626\u0645\u0629 \u0628\u0633\u0631\u0639\u0629 \u0645\u0646 \u062f\u0648\u0646 \u062a\u0639\u0642\u064a\u062f \u0639\u0645\u0644\u064a\u0629 \u0627\u0644\u062a\u0648\u0638\u064a\u0641."],
        ["\u0643\u0631\u064a\u0645 \u0628\u0646\u0639\u0644\u064a", "\u0645\u0637\u0648\u0651\u0631 \u0648\u064a\u0628", "\u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u0627\u0636\u062d\u0629 \u0648\u0628\u0633\u064a\u0637\u0629. \u0648\u062c\u062f\u062a \u0648\u0638\u064a\u0641\u0629 \u062a\u0646\u0627\u0633\u0628 \u0645\u0644\u0641\u064a \u062d\u0642\u0627\u064b."],
        ["\u062c\u0648\u0644\u064a \u0644\u0648\u0641\u064a\u0641\u0631", "\u0645\u0633\u0624\u0648\u0644\u0629 \u062a\u0648\u0638\u064a\u0641 - Horizon", "\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0633\u0644\u0633\u0629 \u0648\u062a\u0648\u0641\u0631 \u0639\u0644\u064a\u0646\u0627 \u0648\u0642\u062a\u0627\u064b \u0642\u064a\u0651\u0645\u0627\u064b \u064a\u0648\u0645\u064a\u0627\u064b."],
        ["\u0623\u062d\u0645\u062f \u062f\u0648\u0628\u0648\u0646", "\u0645\u062f\u064a\u0631 \u0645\u0634\u0631\u0648\u0639", "\u0648\u0627\u062c\u0647\u0629 \u0645\u0631\u064a\u062d\u0629\u060c \u0645\u0631\u0627\u062d\u0644 \u0648\u0627\u0636\u062d\u0629 \u0648\u0645\u062a\u0627\u0628\u0639\u0629 \u062d\u0642\u064a\u0642\u064a\u0629 \u0644\u0643\u0644 \u0637\u0644\u0628."],
        ["\u0646\u0627\u062f\u064a\u0627 \u0645\u0648\u0631\u0648", "\u0645\u0633\u062a\u0634\u0627\u0631\u0629 \u0645\u0648\u0627\u0631\u062f \u0628\u0634\u0631\u064a\u0629", "\u0646\u062c\u062f \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0628\u0633\u0647\u0648\u0644\u0629 \u0641\u064a \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0628\u0641\u0636\u0644 Workcrute."],
        ["\u0644\u0648\u0643\u0627 \u0628\u0631\u0646\u0627\u0631", "\u0645\u062d\u0644\u0644 \u0628\u064a\u0627\u0646\u0627\u062a", "\u0627\u0644\u0645\u0633\u0627\u0631 \u0633\u0631\u064a\u0639 \u0648\u0645\u0637\u0645\u0626\u0646 \u0648\u0645\u0646\u0627\u0633\u0628 \u062a\u0645\u0627\u0645\u0627\u064b \u0644\u0644\u0628\u0627\u062d\u062b\u064a\u0646 \u0639\u0646 \u0639\u0645\u0644."]
      ]
    }
  };
  const root = document.querySelector("[data-reviews]");
  if (!root) return;
  const track = root.querySelector("[data-review-track]"), dots = root.querySelector("[data-review-dots]");
  const prev = root.querySelector("[data-review-prev]"), next = root.querySelector("[data-review-next]"), status = root.querySelector("[data-review-status]");
  let active = 0, timer = 0, resume = 0, startX = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const currentLanguage = () => document.documentElement.lang === "ar" ? "ar" : document.documentElement.lang === "en" ? "en" : "fr";
  const initials = name => name.split(" ").map(part => part[0]).join("");
  function renderLanguage() {
    const text = copy[currentLanguage()];
    root.querySelector('[data-review="kicker"]').textContent = text.kicker;
    root.querySelector('[data-review="title"]').textContent = text.title;
    root.querySelector('[data-review="intro"]').textContent = text.intro;
    prev.setAttribute("aria-label", text.previous); next.setAttribute("aria-label", text.next);
    prev.textContent = document.documentElement.dir === "rtl" ? "\u2192" : "\u2190";
    next.textContent = document.documentElement.dir === "rtl" ? "\u2190" : "\u2192";
    track.replaceChildren(...text.reviews.map((review, index) => {
      const card = document.createElement("article"); card.className = "review-card"; card.dataset.reviewIndex = index;
      card.innerHTML = '<span class="review-quote" aria-hidden="true">\u201c</span><p class="review-stars" aria-label="5 stars">\u2605\u2605\u2605\u2605\u2605</p><blockquote></blockquote><footer><span class="review-avatar"></span><span><strong></strong><small></small></span></footer>';
      card.querySelector("blockquote").textContent = review[2]; card.querySelector(".review-avatar").textContent = initials(review[0]);
      card.querySelector("strong").textContent = review[0]; card.querySelector("small").textContent = review[1]; return card;
    }));
    dots.replaceChildren(...text.reviews.map((_, index) => { const button = document.createElement("button"); button.type = "button"; button.dataset.reviewDot = index; button.setAttribute("aria-label", text.dot + " " + (index + 1)); button.addEventListener("click", () => { setActive(index); pause(); }); return button; }));
    setActive(active, true);
  }
  function setActive(index, immediate) {
    active = (index + 6) % 6;
    track.querySelectorAll("[data-review-index]").forEach(card => {
      const position = (+card.dataset.reviewIndex - active + 6) % 6;
      card.classList.toggle("is-active", position === 0); card.classList.toggle("is-before", position === 5); card.classList.toggle("is-after", position === 1);
      card.setAttribute("aria-hidden", position > 1 && position !== 5 ? "true" : "false");
    });
    dots.querySelectorAll("[data-review-dot]").forEach(dot => dot.classList.toggle("is-active", +dot.dataset.reviewDot === active));
    const text = copy[currentLanguage()]; status.textContent = text.status.replace("{current}", active + 1);
    if (immediate) root.classList.add("reviews-ready");
  }
  function advance(direction) { setActive(active + direction); }
  function restart() { clearTimeout(timer); if (!reduced) timer = setTimeout(() => { advance(1); restart(); }, 5000); }
  function pause() { clearTimeout(timer); clearTimeout(resume); resume = setTimeout(restart, 5000); }
  prev.addEventListener("click", () => { advance(-1); pause(); }); next.addEventListener("click", () => { advance(1); pause(); });
  root.addEventListener("mouseenter", () => clearTimeout(timer)); root.addEventListener("mouseleave", restart);
  root.addEventListener("focusin", () => clearTimeout(timer)); root.addEventListener("focusout", event => { if (!root.contains(event.relatedTarget)) restart(); });
  root.addEventListener("touchstart", event => { startX = event.changedTouches[0].clientX; clearTimeout(timer); }, { passive: true });
  root.addEventListener("touchend", event => { const delta = event.changedTouches[0].clientX - startX; if (Math.abs(delta) > 36) advance((delta > 0) === (document.documentElement.dir !== "rtl") ? -1 : 1); pause(); }, { passive: true });
  addEventListener("workcrute:languagechange", renderLanguage); renderLanguage(); restart();
})();
