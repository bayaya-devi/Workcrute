(() => {
  const locales = {
    fr: {
      meta_title: "Workcrute - Recrutement simple et humain",
      meta_description: "Workcrute rapproche les talents et les entreprises dans un parcours simple, rapide et humain.",
      nav_home: "Accueil", language_label: "Choisir la langue", sign_in: "Me connecter",
      tagline: "Recruter. Postuler. R\u00e9ussir.", hero_title: "Votre avenir commence !",
      hero_description: "Workcrute connecte talents et entreprises dans un parcours simple, rapide et humain.",
      apply: "Je postule", recruit: "Je recrute", hero_note: "Un recrutement qui avance avec vous.",
      candidate_kicker: "Demandeurs d'emploi", candidate_title: "Trouvez votre voie",
      candidate_description: "Cr\u00e9ez votre profil, d\u00e9couvrez les offres qui vous correspondent et suivez chaque candidature simplement.",
      candidate_step_1_title: "Je cr\u00e9e mon profil", candidate_step_1_text: "Je pr\u00e9sente mon parcours, mes comp\u00e9tences et mes objectifs.",
      candidate_step_2_title: "Je trouve une offre", candidate_step_2_text: "Je d\u00e9couvre les opportunit\u00e9s adapt\u00e9es \u00e0 mon profil.",
      candidate_step_3_title: "Je d\u00e9croche mon poste", candidate_step_3_text: "Je suis mes candidatures jusqu'\u00e0 la prochaine \u00e9tape.",
      recruiter_kicker: "Recruteurs", recruiter_title: "Recrutez plus simplement",
      recruiter_description: "Publiez vos besoins, d\u00e9couvrez des profils pertinents et avancez plus vite dans vos recrutements.",
      recruiter_step_1_title: "Je publie mon besoin", recruiter_step_1_text: "Je pr\u00e9cise le poste et le profil recherch\u00e9.",
      recruiter_step_2_title: "Je d\u00e9couvre les profils", recruiter_step_2_text: "Je consulte des candidats adapt\u00e9s \u00e0 mon recrutement.",
      recruiter_step_3_title: "Je recrute", recruiter_step_3_text: "Je s\u00e9lectionne le bon profil et je poursuis l'\u00e9change.",
      footer_tagline: "Recruter. Postuler. R\u00e9ussir.", footer_rights: "Tous droits r\u00e9serv\u00e9s."
    },
    en: {
      meta_title: "Workcrute - Simple, Human Recruitment",
      meta_description: "Workcrute brings talents and companies together through a simple, fast and human journey.",
      nav_home: "Home", language_label: "Choose language", sign_in: "Sign in",
      tagline: "Recruit. Apply. Succeed.", hero_title: "Your future starts!",
      hero_description: "Workcrute connects talents and companies through a simple, fast and human journey.",
      apply: "Apply", recruit: "Recruit", hero_note: "Recruitment that moves forward with you.",
      candidate_kicker: "Job seekers", candidate_title: "Find your path",
      candidate_description: "Create your profile, discover jobs that match you and follow every application with ease.",
      candidate_step_1_title: "I create my profile", candidate_step_1_text: "I present my background, skills and goals.",
      candidate_step_2_title: "I find a job", candidate_step_2_text: "I discover opportunities that match my profile.",
      candidate_step_3_title: "I land my role", candidate_step_3_text: "I follow my applications through every next step.",
      recruiter_kicker: "Recruiters", recruiter_title: "Recruit more simply",
      recruiter_description: "Publish your needs, discover relevant profiles and move faster with your hiring.",
      recruiter_step_1_title: "I publish my need", recruiter_step_1_text: "I define the role and the profile I need.",
      recruiter_step_2_title: "I discover profiles", recruiter_step_2_text: "I review candidates suited to my hiring.",
      recruiter_step_3_title: "I recruit", recruiter_step_3_text: "I select the right profile and continue the conversation.",
      footer_tagline: "Recruit. Apply. Succeed.", footer_rights: "All rights reserved."
    },
    ar: {
      meta_title: "Workcrute - \u062a\u0648\u0638\u064a\u0641 \u0628\u0633\u064a\u0637 \u0648\u0625\u0646\u0633\u0627\u0646\u064a",
      meta_description: "\u062a\u0631\u0628\u0637 Workcrute \u0627\u0644\u0645\u0648\u0627\u0647\u0628 \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u062a \u0641\u064a \u0631\u062d\u0644\u0629 \u0628\u0633\u064a\u0637\u0629 \u0648\u0625\u0646\u0633\u0627\u0646\u064a\u0629.",
      nav_home: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629", language_label: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0644\u063a\u0629", sign_in: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
      tagline: "\u0648\u0638\u0651\u0641. \u062a\u0642\u062f\u0651\u0645. \u0627\u0646\u062c\u062d.", hero_title: "\u0645\u0633\u062a\u0642\u0628\u0644\u0643 \u064a\u0628\u062f\u0623!",
      hero_description: "\u062a\u0631\u0628\u0637 Workcrute \u0627\u0644\u0645\u0648\u0627\u0647\u0628 \u0628\u0627\u0644\u0634\u0631\u0643\u0627\u062a \u0641\u064a \u0645\u0633\u0627\u0631 \u0628\u0633\u064a\u0637\u060c \u0633\u0631\u064a\u0639 \u0648\u0625\u0646\u0633\u0627\u0646\u064a.",
      apply: "\u0623\u0642\u062f\u0651\u0645 \u0637\u0644\u0628\u064a", recruit: "\u0623\u0648\u0638\u0651\u0641", hero_note: "\u062a\u0648\u0638\u064a\u0641 \u064a\u062a\u0642\u062f\u0651\u0645 \u0645\u0639\u0643.",
      candidate_kicker: "\u0627\u0644\u0628\u0627\u062d\u062b\u0648\u0646 \u0639\u0646 \u0639\u0645\u0644", candidate_title: "\u0627\u062c\u062f \u0637\u0631\u064a\u0642\u0643",
      candidate_description: "\u0623\u0646\u0634\u0626 \u0645\u0644\u0641\u0643\u060c \u0627\u0643\u062a\u0634\u0641 \u0627\u0644\u0648\u0638\u0627\u0626\u0641 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0648\u062a\u0627\u0628\u0639 \u0643\u0644 \u0637\u0644\u0628 \u0628\u0633\u0647\u0648\u0644\u0629.",
      candidate_step_1_title: "\u0623\u0646\u0634\u0626 \u0645\u0644\u0641\u064a", candidate_step_1_text: "\u0623\u0639\u0631\u0636 \u0645\u0633\u0627\u0631\u064a \u0648\u0645\u0647\u0627\u0631\u0627\u062a\u064a \u0648\u0623\u0647\u062f\u0627\u0641\u064a.",
      candidate_step_2_title: "\u0623\u062c\u062f \u0648\u0638\u064a\u0641\u0629", candidate_step_2_text: "\u0623\u0643\u062a\u0634\u0641 \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u0644\u0627\u0626\u0645\u0629 \u0644\u0645\u0644\u0641\u064a.",
      candidate_step_3_title: "\u0623\u062d\u0635\u0644 \u0639\u0644\u0649 \u0648\u0638\u064a\u0641\u062a\u064a", candidate_step_3_text: "\u0623\u062a\u0627\u0628\u0639 \u0637\u0644\u0628\u0627\u062a\u064a \u0641\u064a \u0643\u0644 \u062e\u0637\u0648\u0629.",
      recruiter_kicker: "\u0627\u0644\u0645\u0648\u0638\u0651\u0641\u0648\u0646", recruiter_title: "\u0648\u0638\u0651\u0641 \u0628\u0633\u0647\u0648\u0644\u0629",
      recruiter_description: "\u0627\u0646\u0634\u0631 \u0627\u062d\u062a\u064a\u0627\u062c\u0627\u062a\u0643\u060c \u0627\u0643\u062a\u0634\u0641 \u0645\u0644\u0641\u0627\u062a \u0645\u0646\u0627\u0633\u0628\u0629 \u0648\u062a\u0642\u062f\u0651\u0645 \u0628\u0634\u0643\u0644 \u0623\u0633\u0631\u0639 \u0641\u064a \u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u062a\u0648\u0638\u064a\u0641.",
      recruiter_step_1_title: "\u0623\u0646\u0634\u0631 \u0627\u062d\u062a\u064a\u0627\u062c\u064a", recruiter_step_1_text: "\u0623\u062d\u062f\u062f \u0627\u0644\u0645\u0646\u0635\u0628 \u0648\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0637\u0644\u0648\u0628.",
      recruiter_step_2_title: "\u0623\u0643\u062a\u0634\u0641 \u0627\u0644\u0645\u0644\u0641\u0627\u062a", recruiter_step_2_text: "\u0623\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0631\u0634\u062d\u064a\u0646 \u0627\u0644\u0645\u0644\u0627\u0626\u0645\u064a\u0646 \u0644\u0627\u062d\u062a\u064a\u0627\u062c\u064a.",
      recruiter_step_3_title: "\u0623\u0648\u0638\u0651\u0641", recruiter_step_3_text: "\u0623\u062e\u062a\u0627\u0631 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0648\u0623\u0648\u0627\u0635\u0644 \u0627\u0644\u062d\u0648\u0627\u0631.",
      footer_tagline: "\u0648\u0638\u0651\u0641. \u062a\u0642\u062f\u0651\u0645. \u0627\u0646\u062c\u062d.", footer_rights: "\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629."
    }
  };
  const key = "wc_home_language";
  const detect = () => { const saved = localStorage.getItem(key) || document.cookie.match(/(?:^|; )wc_language=([^;]+)/)?.[1] || (navigator.language || "fr").slice(0, 2); return locales[saved] ? saved : "fr"; };
  function apply(language) {
    const lang = locales[language] ? language : "fr", text = locales[lang];
    localStorage.setItem(key, lang); document.cookie = "wc_language=" + lang + "; Path=/; Max-Age=31536000; SameSite=Lax";
    document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = text.meta_title; document.querySelector('meta[name="description"]').content = text.meta_description;
    document.querySelector('meta[property="og:title"]').content = text.meta_title; document.querySelector('meta[property="og:description"]').content = text.meta_description;
    document.querySelectorAll("[data-i18n]").forEach(node => { if (text[node.dataset.i18n]) node.textContent = text[node.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-aria]").forEach(node => node.setAttribute("aria-label", text[node.dataset.i18nAria]));
    document.querySelectorAll("[data-language]").forEach(select => { select.value = lang; select.options[0].text = "Fran\u00e7ais"; select.options[1].text = "English"; select.options[2].text = "\u0627\u0644\u0639\u0631\u0628\u064a\u0629"; }); window.dispatchEvent(new CustomEvent("workcrute:languagechange", { detail: { language: lang } }));
  }
  document.querySelectorAll("[data-language]").forEach(select => select.addEventListener("change", () => apply(select.value)));
  document.getElementById("year").textContent = new Date().getFullYear(); apply(detect()); window.workcruteHomeI18n = { apply, locales };
})();
