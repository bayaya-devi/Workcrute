(() => {
  const storageKey = "workcrute.local.preview.v2",
    blank = {
      accounts: [],
      session: null,
      documents: [],
      notifications: [],
      jobs: [],
      applications: [],
      applicationHistory: [],
      jobAlerts: [],
      savedJobs: [],
      interviews: [],
      questionnaires: [],
      questions: [],
      internalNotes: [],
      companies: {},
      settings: {},
    };
  const read = () => {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return { ...structuredClone(blank), ...stored };
  };
  const write = (state) =>
    localStorage.setItem(storageKey, JSON.stringify(state));
  const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const fail = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    throw error;
  };
  const accountFor = (state) =>
    state.accounts.find((account) => account.id === state.session);
  const profileFor = (account) =>
    account.role === "candidate"
      ? {
          first_name: account.firstName,
          last_name: account.lastName,
          phone: account.phone,
          city: "",
          region: "",
          country: "Maroc",
          preferred_language: "fr",
          professional_title: "",
          introduction: "",
          availability: "",
          availability_details: "",
          profile_visible: 1,
          skills_json: "[]",
          preferences_json: "{}",
          experience_json: "[]",
          education_json: "[]",
          languages_json: "[]",
          questionnaire_answers: "{}",
          ...(account.profile || {}),
        }
      : {
          first_name: account.firstName,
          last_name: account.lastName,
          phone: account.phone,
          company_name: account.companyName || "",
          job_title: account.jobTitle || "",
          company_sector: account.companySector || "",
          company_size: account.companySize || "",
          city: account.city || "",
          website: account.website || "",
        };
  const currentUser = (state) => {
    const account = accountFor(state);
    if (!account) fail("Authentification requise.", 401);
    return account;
  };
  const ownedJobs = (state, userId) =>
    state.jobs.filter((job) => job.recruiter_user_id === userId);
  const candidateData = (state, userId) => {
    const user = state.accounts.find((x) => x.id === userId);
    return user
      ? { user_id: user.id, email: user.email, ...profileFor(user) }
      : null;
  };
  const enrichApplication = (state, application) => {
    const job = state.jobs.find((x) => x.id === application.job_offer_id) || {},
      candidate = candidateData(state, application.candidate_user_id) || {};
    return {
      ...job,
      ...candidate,
      ...application,
      id: application.id,
      application_id: application.id,
      job_id: job.id,
      title: job.title,
      company_name: job.company_name,
    };
  };
  async function request(input, options = {}) {
    const url = new URL(input, location.origin),
      path = url.pathname,
      method = options.method || "GET",
      body =
        typeof options.body === "string"
          ? JSON.parse(options.body || "{}")
          : options.body || {},
      state = read();
    if (path === "/api/public/stats")
      return {
        stats: {
          candidates: state.accounts.filter((x) => x.role === "candidate")
            .length,
          companies: 0,
          jobs: state.jobs.filter((x) => x.status === "published").length,
          applications: state.applications.length,
        },
      };
    if (path === "/api/auth/register" && method === "POST") {
      if (!["candidate", "recruiter"].includes(body.role))
        fail("Type de compte invalide.");
      if (
        state.accounts.some(
          (x) => x.email === String(body.email || "").toLowerCase(),
        )
      )
        fail("Un compte existe déjà avec cette adresse e-mail.", 409);
      const account = {
        id: id(),
        email: String(body.email || "").toLowerCase(),
        password: body.password,
        role: body.role,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        companyName: body.companyName || "",
        jobTitle: body.jobTitle || "",
        profile: { preferred_language: body.language || "fr" },
      };
      state.accounts.push(account);
      state.session = account.id;
      state.notifications.unshift({
        id: id(),
        user_id: account.id,
        type: "account",
        title: "Bienvenue sur Workcrute",
        body: "Complétez votre profil pour améliorer vos opportunités.",
        created_at: new Date().toISOString(),
        read_at: null,
      });
      write(state);
      return {
        user: { id: account.id, email: account.email, role: account.role },
      };
    }
    if (path === "/api/auth/login" && method === "POST") {
      const account = state.accounts.find(
        (x) =>
          x.email === String(body.email || "").toLowerCase() &&
          x.password === body.password,
      );
      if (!account) fail("Identifiants invalides.", 401);
      state.session = account.id;
      write(state);
      return {
        user: { id: account.id, email: account.email, role: account.role },
      };
    }
    if (path === "/api/auth/logout" && method === "POST") {
      state.session = null;
      write(state);
      return { ok: true };
    }
    if (path === "/api/auth/forgot-password" && method === "POST")
      return { ok: true };
    const account = currentUser(state),
      profile = profileFor(account);
    if (path === "/api/auth/me")
      return {
        user: {
          id: account.id,
          email: account.email,
          role: account.role,
          emailVerified: false,
        },
        profile,
      };
    if (path === "/api/profile" && method === "PATCH") {
      if (account.role === "candidate") {
        account.firstName = body.firstName || account.firstName;
        account.lastName = body.lastName || account.lastName;
        account.phone = body.phone || account.phone;
        account.profile = {
          ...account.profile,
          city: body.city || "",
          region: body.region || "",
          country: body.country || "",
          preferred_language: body.language || "fr",
          professional_title: body.professionalTitle || "",
          introduction: body.introduction || "",
          availability: body.availability || "",
          availability_details: body.availabilityDetails || "",
          skills_json: JSON.stringify(body.skills || []),
          preferences_json: JSON.stringify(body.preferences || {}),
          experience_json: JSON.stringify(body.experience || []),
          education_json: JSON.stringify(body.education || []),
          languages_json: JSON.stringify(body.languages || []),
        };
      }
      write(state);
      return { profile: profileFor(account) };
    }
    if (path === "/api/candidate/stats") {
      const apps = state.applications.filter(
        (x) => x.candidate_user_id === account.id,
      );
      return {
        applicationsSent: apps.length,
        applicationsActive: apps.filter((x) =>
          ["reviewing", "shortlisted", "interview"].includes(x.status),
        ).length,
        interviews: state.interviews.filter(
          (x) =>
            x.candidate_user_id === account.id &&
            new Date(x.starts_at) > new Date(),
        ).length,
        recruiterViews: 0,
      };
    }
    if (path === "/api/candidate/overview") {
      const apps = state.applications.filter(
          (x) => x.candidate_user_id === account.id,
        ),
        stats = {
          applicationsSent: apps.length,
          applicationsActive: apps.filter((x) =>
            ["reviewing", "shortlisted", "interview"].includes(x.status),
          ).length,
          interviews: state.interviews.filter(
            (x) =>
              x.candidate_user_id === account.id &&
              new Date(x.starts_at) > new Date(),
          ).length,
          recruiterViews: 0,
        };
      return {
        profile,
        stats,
        notifications: state.notifications
          .filter((x) => x.user_id === account.id)
          .slice(0, 5),
        applications: apps.slice(0, 5),
        interviews: state.interviews
          .filter(
            (x) =>
              x.candidate_user_id === account.id &&
              new Date(x.starts_at) > new Date(),
          )
          .slice(0, 3),
        recommendedJobs: state.jobs
          .filter((x) => x.status === "published")
          .slice(0, 4),
        matchingScore: null,
      };
    }
    if (path === "/api/jobs" && method === "GET") {
      const q = (url.searchParams.get("q") || "").toLowerCase(),
        city = (url.searchParams.get("city") || "").toLowerCase(),
        domain = (url.searchParams.get("domain") || "").toLowerCase(),
        contract = url.searchParams.get("contract") || "";
      return {
        items: state.jobs
          .filter(
            (x) =>
              x.status === "published" &&
              (!q ||
                `${x.title} ${x.description} ${x.domain}`
                  .toLowerCase()
                  .includes(q)) &&
              (!city || String(x.city).toLowerCase().includes(city)) &&
              (!domain || String(x.domain).toLowerCase().includes(domain)) &&
              (!contract || x.contract_type === contract),
          )
          .map((x) => ({
            ...x,
            is_saved: state.savedJobs.some(
              (s) => s.user_id === account.id && s.job_offer_id === x.id,
            ),
          })),
      };
    }
    if (path === "/api/jobs" && method === "POST") {
      if (account.role !== "recruiter") fail("Accès recruteur requis.", 403);
      const job = {
        id: id(),
        recruiter_user_id: account.id,
        title: body.title,
        domain: body.domain,
        description: body.description,
        missions: body.missions || "",
        required_skills: JSON.stringify(body.skills || []),
        contract_type: body.contractType,
        city: body.city,
        work_mode: body.workMode,
        company_name: body.companyName || account.companyName || "Entreprise",
        status: body.status === "published" ? "published" : "draft",
        published_at: new Date().toISOString(),
      };
      state.jobs.unshift(job);
      write(state);
      return { job: { id: job.id, status: job.status } };
    }
    if (/^\/api\/jobs\/[^/]+$/.test(path) && method === "GET") {
      const job = state.jobs.find(
        (x) => x.id === path.split("/").pop() && x.status === "published",
      );
      if (!job) fail("Offre introuvable.", 404);
      return {
        job: {
          ...job,
          is_saved: state.savedJobs.some(
            (s) => s.user_id === account.id && s.job_offer_id === job.id,
          ),
        },
        matchingScore: null,
      };
    }
    if (path === "/api/saved-jobs" && method === "GET")
      return {
        items: state.savedJobs
          .filter((x) => x.user_id === account.id)
          .map((saved) =>
            state.jobs.find((job) => job.id === saved.job_offer_id),
          )
          .filter(Boolean)
          .map((job) => ({ ...job, is_saved: 1 })),
      };
    if (path.startsWith("/api/saved-jobs/") && method === "POST") {
      const jobId = path.split("/").pop();
      if (
        !state.savedJobs.some(
          (x) => x.user_id === account.id && x.job_offer_id === jobId,
        )
      )
        state.savedJobs.push({
          user_id: account.id,
          job_offer_id: jobId,
          created_at: new Date().toISOString(),
        });
      write(state);
      return { saved: true };
    }
    if (path.startsWith("/api/saved-jobs/") && method === "DELETE") {
      const jobId = path.split("/").pop();
      state.savedJobs = state.savedJobs.filter(
        (x) => !(x.user_id === account.id && x.job_offer_id === jobId),
      );
      write(state);
      return null;
    }
    if (path === "/api/job-alerts" && method === "GET")
      return { items: state.jobAlerts.filter((x) => x.user_id === account.id) };
    if (path === "/api/job-alerts" && method === "POST") {
      if (
        !body.keywords &&
        !body.domain &&
        !body.city &&
        !body.contractType &&
        !(body.skills || []).length
      )
        fail("Choisissez au moins un critère.");
      const alert = {
        id: id(),
        user_id: account.id,
        name: body.name || "",
        keywords: body.keywords || "",
        domain: body.domain || "",
        city: body.city || "",
        contract_type: body.contractType || "",
        skills_json: JSON.stringify(body.skills || []),
        frequency: body.frequency || "daily",
        is_active: 1,
        created_at: new Date().toISOString(),
      };
      state.jobAlerts.unshift(alert);
      write(state);
      return { alert };
    }
    if (path.startsWith("/api/job-alerts/") && method === "PATCH") {
      const alert = state.jobAlerts.find(
        (x) => x.id === path.split("/").pop() && x.user_id === account.id,
      );
      if (alert && typeof body.active === "boolean")
        alert.is_active = body.active ? 1 : 0;
      write(state);
      return { ok: true };
    }
    if (path.startsWith("/api/job-alerts/") && method === "DELETE") {
      state.jobAlerts = state.jobAlerts.filter(
        (x) => !(x.id === path.split("/").pop() && x.user_id === account.id),
      );
      write(state);
      return null;
    }
    if (path === "/api/applications" && method === "GET")
      return {
        items: state.applications.filter(
          (x) => x.candidate_user_id === account.id,
        ),
      };
    if (path === "/api/applications" && method === "POST") {
      if (
        state.applications.some(
          (x) =>
            x.candidate_user_id === account.id && x.job_offer_id === body.jobId,
        )
      )
        fail("Vous avez déjà postulé à cette offre.", 409);
      const job = state.jobs.find(
        (x) => x.id === body.jobId && x.status === "published",
      );
      if (!job) fail("Offre introuvable.", 404);
      const application = {
        id: id(),
        job_offer_id: job.id,
        job_id: job.id,
        candidate_user_id: account.id,
        status: "submitted",
        title: job.title,
        description: job.description,
        company_name: job.company_name,
        city: job.city,
        contract_type: job.contract_type,
        work_mode: job.work_mode,
        cover_letter: body.coverLetter || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      state.applications.unshift(application);
      state.applicationHistory.push({
        application_id: application.id,
        status: "submitted",
        created_at: application.created_at,
      });
      write(state);
      return { application };
    }
    if (/^\/api\/applications\/[^/]+$/.test(path)) {
      const application = state.applications.find(
        (x) =>
          x.id === path.split("/").pop() && x.candidate_user_id === account.id,
      );
      if (!application) fail("Candidature introuvable.", 404);
      if (method === "GET")
        return {
          application,
          timeline: state.applicationHistory.filter(
            (x) => x.application_id === application.id,
          ),
        };
      if (method === "PATCH") {
        application.status = "withdrawn";
        application.updated_at = new Date().toISOString();
        state.applicationHistory.push({
          application_id: application.id,
          status: "withdrawn",
          created_at: application.updated_at,
        });
        write(state);
        return { ok: true };
      }
    }
    if (path === "/api/documents" && method === "GET")
      return { items: state.documents.filter((x) => x.user_id === account.id) };
    if (
      path.startsWith("/api/documents/") &&
      path.endsWith("/default") &&
      method === "PATCH"
    ) {
      const documentId = path.split("/").at(-2);
      state.documents
        .filter((x) => x.user_id === account.id && x.kind === "cv")
        .forEach((x) => (x.is_default = x.id === documentId ? 1 : 0));
      write(state);
      return { ok: true };
    }
    if (path.startsWith("/api/documents/") && method === "DELETE") {
      state.documents = state.documents.filter(
        (x) => !(x.id === path.split("/").pop() && x.user_id === account.id),
      );
      write(state);
      return null;
    }
    if (path === "/api/interviews" && method === "GET")
      return {
        items: state.interviews.filter(
          (x) => x.candidate_user_id === account.id,
        ),
      };
    if (path.startsWith("/api/interviews/") && method === "PATCH") {
      const interview = state.interviews.find(
        (x) =>
          x.id === path.split("/").pop() && x.candidate_user_id === account.id,
      );
      if (interview) interview.status = body.status;
      write(state);
      return { ok: true };
    }
    if (path === "/api/notifications" && method === "GET")
      return {
        items: state.notifications.filter((x) => x.user_id === account.id),
      };
    if (path === "/api/notifications" && method === "POST") {
      state.notifications
        .filter((x) => x.user_id === account.id)
        .forEach((x) => (x.read_at = new Date().toISOString()));
      write(state);
      return null;
    }
    if (path.startsWith("/api/notifications/") && method === "PATCH") {
      const note = state.notifications.find(
        (x) => x.id === path.split("/").pop() && x.user_id === account.id,
      );
      if (note) note.read_at = body.read ? new Date().toISOString() : null;
      write(state);
      return { ok: true };
    }
    if (path.startsWith("/api/notifications/") && method === "DELETE") {
      state.notifications = state.notifications.filter(
        (x) => !(x.id === path.split("/").pop() && x.user_id === account.id),
      );
      write(state);
      return null;
    }
    if (path === "/api/candidate/settings" && method === "GET")
      return {
        settings: {
          inAppEnabled: true,
          emailEnabled: true,
          jobAlertsEnabled: true,
          profileViewEnabled: false,
          profileVisible: Boolean(profile.profile_visible),
          language: profile.preferred_language,
          ...(state.settings[account.id] || {}),
        },
      };
    if (path === "/api/candidate/settings" && method === "PATCH") {
      state.settings[account.id] = body;
      account.profile = {
        ...(account.profile || {}),
        profile_visible: body.profileVisible ? 1 : 0,
        preferred_language: body.language || "fr",
      };
      write(state);
      return { ok: true };
    }
    if (path === "/api/auth/change-password" && method === "POST") {
      if (account.password !== body.currentPassword)
        fail("Le mot de passe actuel est incorrect.", 401);
      if (body.newPassword !== body.confirmPassword)
        fail("Les mots de passe ne correspondent pas.");
      account.password = body.newPassword;
      write(state);
      return { ok: true };
    }
    if (account.role !== "recruiter" && path.startsWith("/api/recruiter/"))
      fail("Accès recruteur requis.", 403);
    if (path === "/api/recruiter/overview" && method === "GET") {
      const jobs = ownedJobs(state, account.id),
        jobIds = new Set(jobs.map((x) => x.id)),
        apps = state.applications.filter((x) => jobIds.has(x.job_offer_id));
      return {
        stats: {
          activeJobs: jobs.filter((x) => x.status === "published").length,
          newApplications: apps.filter((x) => x.status === "submitted").length,
          shortlisted: apps.filter((x) => x.status === "shortlisted").length,
          interviews: state.interviews.filter(
            (x) =>
              x.recruiter_user_id === account.id &&
              x.status !== "cancelled" &&
              new Date(x.starts_at) > new Date(),
          ).length,
        },
        recentApplications: apps
          .slice(0, 6)
          .map((x) => enrichApplication(state, x)),
        performance: jobs
          .slice(0, 6)
          .map((job) => ({
            id: job.id,
            title: job.title,
            status: job.status,
            applications: apps.filter((x) => x.job_offer_id === job.id).length,
            shortlisted: apps.filter(
              (x) => x.job_offer_id === job.id && x.status === "shortlisted",
            ).length,
            accepted: apps.filter(
              (x) => x.job_offer_id === job.id && x.status === "accepted",
            ).length,
          })),
        recommendedCandidates: [],
      };
    }
    if (path === "/api/recruiter/jobs" && method === "GET")
      return {
        items: ownedJobs(state, account.id).map((job) => ({
          ...job,
          applications: state.applications.filter(
            (x) => x.job_offer_id === job.id,
          ).length,
        })),
      };
    if (path === "/api/recruiter/jobs" && method === "POST") {
      const job = {
        id: id(),
        recruiter_user_id: account.id,
        company_id: account.id,
        title: body.title || "",
        domain: body.domain || "",
        description: body.description || "",
        missions: body.missions || "",
        responsibilities: body.responsibilities || "",
        required_skills: JSON.stringify(body.skills || []),
        contract_type: body.contractType || "",
        city: body.city || "",
        country: body.country || "Maroc",
        work_mode: body.workMode || "onsite",
        experience_level: body.experienceLevel || "",
        education_level: body.educationLevel || "",
        salary_min: body.salaryMin || null,
        salary_max: body.salaryMax || null,
        deadline_at: body.deadlineAt || null,
        openings_count: Number(body.openingsCount) || 1,
        benefits: body.benefits || "",
        conditions_json: JSON.stringify(body.conditions || {}),
        questionnaire_id: body.questionnaireId || null,
        company_name:
          (state.companies[account.id] || {}).name || account.companyName || "",
        status: body.status === "published" ? "published" : "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at:
          body.status === "published" ? new Date().toISOString() : null,
      };
      state.jobs.unshift(job);
      write(state);
      return { job: { id: job.id, status: job.status } };
    }
    const recruiterJob = path.match(
      /^\/api\/recruiter\/jobs\/([^/]+)(?:\/(duplicate|publish))?$/,
    );
    if (recruiterJob) {
      const job = state.jobs.find(
        (x) => x.id === recruiterJob[1] && x.recruiter_user_id === account.id,
      );
      if (!job) fail("Offre introuvable.", 404);
      if (method === "GET")
        return {
          job: {
            ...job,
            applications: state.applications.filter(
              (x) => x.job_offer_id === job.id,
            ).length,
          },
        };
      if (method === "POST" && recruiterJob[2] === "duplicate") {
        const copy = {
          ...job,
          id: id(),
          title: `${job.title} - Copie`,
          status: "draft",
          published_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.jobs.unshift(copy);
        write(state);
        return { job: { id: copy.id, status: copy.status } };
      }
      if (method === "POST" && recruiterJob[2] === "publish") {
        job.status = "published";
        job.published_at = job.published_at || new Date().toISOString();
        job.updated_at = new Date().toISOString();
        write(state);
        return { ok: true };
      }
      if (method === "PATCH") {
        Object.assign(job, {
          title: body.title || job.title,
          domain: body.domain ?? job.domain,
          description: body.description ?? job.description,
          missions: body.missions ?? job.missions,
          responsibilities: body.responsibilities ?? job.responsibilities,
          required_skills: JSON.stringify(
            body.skills || JSON.parse(job.required_skills || "[]"),
          ),
          contract_type: body.contractType ?? job.contract_type,
          city: body.city ?? job.city,
          country: body.country ?? job.country,
          work_mode: body.workMode ?? job.work_mode,
          experience_level: body.experienceLevel ?? job.experience_level,
          education_level: body.educationLevel ?? job.education_level,
          salary_min: body.salaryMin ?? job.salary_min,
          salary_max: body.salaryMax ?? job.salary_max,
          deadline_at: body.deadlineAt ?? job.deadline_at,
          openings_count: Number(body.openingsCount) || job.openings_count,
          benefits: body.benefits ?? job.benefits,
          conditions_json: JSON.stringify(
            body.conditions || JSON.parse(job.conditions_json || "{}"),
          ),
          questionnaire_id: body.questionnaireId ?? job.questionnaire_id,
          status: body.status === "published" ? "published" : "draft",
          updated_at: new Date().toISOString(),
        });
        if (job.status === "published")
          job.published_at = job.published_at || new Date().toISOString();
        write(state);
        return { job: { id: job.id, status: job.status } };
      }
    }
    if (path === "/api/recruiter/questionnaires" && method === "GET")
      return {
        items: state.questionnaires
          .filter((x) => x.recruiter_user_id === account.id)
          .map((q) => ({
            ...q,
            question_count: state.questions.filter(
              (x) => x.questionnaire_id === q.id,
            ).length,
            usage_count: state.jobs.filter((x) => x.questionnaire_id === q.id)
              .length,
          })),
      };
    if (path === "/api/recruiter/questionnaires" && method === "POST") {
      const questionnaire = {
        id: id(),
        recruiter_user_id: account.id,
        name: body.name,
        description: body.description || "",
        status: "draft",
        created_at: new Date().toISOString(),
      };
      state.questionnaires.unshift(questionnaire);
      write(state);
      return { questionnaire };
    }
    const questionnaire = path.match(
      /^\/api\/recruiter\/questionnaires\/([^/]+)$/,
    );
    if (questionnaire && method === "GET") {
      const item = state.questionnaires.find(
        (x) => x.id === questionnaire[1] && x.recruiter_user_id === account.id,
      );
      if (!item) fail("Questionnaire introuvable.", 404);
      return {
        questionnaire: item,
        questions: state.questions
          .filter((x) => x.questionnaire_id === item.id)
          .sort((a, b) => a.position - b.position),
      };
    }
    const questionsRoute = path.match(
      /^\/api\/recruiter\/questionnaires\/([^/]+)\/questions(?:\/([^/]+))?$/,
    );
    if (questionsRoute && method === "POST") {
      const item = state.questionnaires.find(
        (x) => x.id === questionsRoute[1] && x.recruiter_user_id === account.id,
      );
      if (!item) fail("Questionnaire introuvable.", 404);
      const question = {
        id: id(),
        questionnaire_id: item.id,
        question_type: body.type,
        label_json: JSON.stringify({
          fr: body.label,
          en: body.labelEn || body.label,
          ar: body.labelAr || body.label,
        }),
        options_json: JSON.stringify(body.options || []),
        is_required: body.required ? 1 : 0,
        weight: Number(body.weight) || 0,
        is_eliminatory: body.eliminatory ? 1 : 0,
        condition_json: JSON.stringify(body.condition || {}),
        position: state.questions.filter((x) => x.questionnaire_id === item.id)
          .length,
      };
      state.questions.push(question);
      write(state);
      return { question };
    }
    if (questionsRoute && questionsRoute[2] && method === "DELETE") {
      state.questions = state.questions.filter(
        (x) =>
          x.id !== questionsRoute[2] ||
          x.questionnaire_id !== questionsRoute[1],
      );
      write(state);
      return null;
    }
    if (path === "/api/recruiter/applications" && method === "GET") {
      const jobId = url.searchParams.get("jobId"),
        jobIds = new Set(
          ownedJobs(state, account.id)
            .filter((x) => !jobId || x.id === jobId)
            .map((x) => x.id),
        );
      return {
        items: state.applications
          .filter((x) => jobIds.has(x.job_offer_id))
          .map((x) => enrichApplication(state, x)),
      };
    }
    const recruiterApplication = path.match(
      /^\/api\/recruiter\/applications\/([^/]+)$/,
    );
    if (recruiterApplication) {
      const application = state.applications.find(
          (x) => x.id === recruiterApplication[1],
        ),
        job =
          application &&
          state.jobs.find(
            (x) =>
              x.id === application.job_offer_id &&
              x.recruiter_user_id === account.id,
          );
      if (!application || !job) fail("Candidature introuvable.", 404);
      if (method === "GET")
        return {
          application: enrichApplication(state, application),
          history: state.applicationHistory.filter(
            (x) => x.application_id === application.id,
          ),
          notes: state.internalNotes.filter(
            (x) => x.application_id === application.id,
          ),
          documents: state.documents.filter(
            (x) => x.user_id === application.candidate_user_id,
          ),
          matching: { score: null, breakdown: [] },
        };
      if (method === "PATCH") {
        if (
          ![
            "submitted",
            "reviewing",
            "shortlisted",
            "interview",
            "accepted",
            "rejected",
            "withdrawn",
          ].includes(body.status)
        )
          fail("Statut invalide.");
        application.status = body.status;
        application.updated_at = new Date().toISOString();
        state.applicationHistory.push({
          application_id: application.id,
          status: body.status,
          created_at: application.updated_at,
        });
        state.notifications.unshift({
          id: id(),
          user_id: application.candidate_user_id,
          type: "application",
          title: "Mise à jour de candidature",
          body: `Votre candidature pour ${job.title} a été mise à jour.`,
          created_at: new Date().toISOString(),
          read_at: null,
        });
        write(state);
        return { ok: true };
      }
    }
    const notesRoute = path.match(
      /^\/api\/recruiter\/applications\/([^/]+)\/notes$/,
    );
    if (notesRoute && method === "POST") {
      const application = state.applications.find(
          (x) => x.id === notesRoute[1],
        ),
        job =
          application &&
          state.jobs.find(
            (x) =>
              x.id === application.job_offer_id &&
              x.recruiter_user_id === account.id,
          );
      if (!job) fail("Candidature introuvable.", 404);
      if (!String(body.content || "").trim()) fail("La note est vide.");
      const note = {
        id: id(),
        application_id: application.id,
        author_user_id: account.id,
        content: String(body.content).trim(),
        first_name: account.firstName,
        last_name: account.lastName,
        created_at: new Date().toISOString(),
      };
      state.internalNotes.unshift(note);
      write(state);
      return { note };
    }
    if (path === "/api/recruiter/candidates" && method === "GET") {
      const q = (url.searchParams.get("q") || "").toLowerCase(),
        city = (url.searchParams.get("city") || "").toLowerCase();
      return {
        items: state.accounts
          .filter((x) => x.role === "candidate")
          .map((x) => candidateData(state, x.id))
          .filter(
            (x) =>
              x.profile_visible &&
              (!q ||
                `${x.first_name} ${x.last_name} ${x.professional_title} ${x.skills_json}`
                  .toLowerCase()
                  .includes(q)) &&
              (!city || String(x.city).toLowerCase().includes(city)),
          ),
        matchingScore: null,
      };
    }
    const recruiterCandidate = path.match(
      /^\/api\/recruiter\/candidates\/([^/]+)$/,
    );
    if (recruiterCandidate && method === "GET") {
      const candidate = candidateData(state, recruiterCandidate[1]);
      if (!candidate) fail("Candidat introuvable.", 404);
      return {
        candidate,
        documents: state.documents.filter(
          (x) => x.user_id === candidate.user_id,
        ),
        matching: { score: null, breakdown: [] },
      };
    }
    if (path === "/api/recruiter/interviews" && method === "GET")
      return {
        items: state.interviews
          .filter((x) => x.recruiter_user_id === account.id)
          .map((interview) => {
            const app = state.applications.find(
              (x) => x.id === interview.application_id,
            );
            return { ...interview, ...enrichApplication(state, app || {}) };
          }),
      };
    if (path === "/api/recruiter/interviews" && method === "POST") {
      const application = state.applications.find(
          (x) => x.id === body.applicationId,
        ),
        job =
          application &&
          state.jobs.find(
            (x) =>
              x.id === application.job_offer_id &&
              x.recruiter_user_id === account.id,
          );
      if (
        !job ||
        !["onsite", "phone", "video"].includes(body.type) ||
        !body.startsAt
      )
        fail("Informations d’entretien invalides.");
      const interview = {
        id: id(),
        application_id: application.id,
        candidate_user_id: application.candidate_user_id,
        recruiter_user_id: account.id,
        starts_at: body.startsAt,
        duration_minutes: Number(body.duration) || 60,
        interview_type: body.type,
        location: body.location || "",
        meeting_url: body.meetingUrl || "",
        status: "scheduled",
        created_at: new Date().toISOString(),
      };
      state.interviews.unshift(interview);
      application.status = "interview";
      state.applicationHistory.push({
        application_id: application.id,
        status: "interview",
        created_at: new Date().toISOString(),
      });
      write(state);
      return { interview };
    }
    const recruiterInterview = path.match(
      /^\/api\/recruiter\/interviews\/([^/]+)$/,
    );
    if (recruiterInterview && method === "PATCH") {
      const interview = state.interviews.find(
        (x) =>
          x.id === recruiterInterview[1] && x.recruiter_user_id === account.id,
      );
      if (!interview) fail("Entretien introuvable.", 404);
      Object.assign(interview, {
        status: body.status || interview.status,
        starts_at: body.startsAt || interview.starts_at,
        interview_type: body.type || interview.interview_type,
        location: body.location ?? interview.location,
        meeting_url: body.meetingUrl ?? interview.meeting_url,
      });
      write(state);
      return { ok: true };
    }
    if (path === "/api/recruiter/company" && method === "GET")
      return {
        company: { ...profile, ...(state.companies[account.id] || {}) },
      };
    if (path === "/api/recruiter/company" && method === "PATCH") {
      state.companies[account.id] = {
        ...(state.companies[account.id] || {}),
        name: body.name,
        sector: body.sector || "",
        company_size: body.companySize || "",
        city: body.city || "",
        website: body.website || "",
        job_title: body.jobTitle || "",
        description: body.description || "",
        logo_url: body.logoUrl || "",
      };
      account.companyName = body.name;
      write(state);
      return { company: state.companies[account.id] };
    }
    if (path === "/api/recruiter/settings" && method === "GET")
      return {
        settings: {
          language: profile.preferred_language || "fr",
          emailEnabled: true,
          applicationAlerts: true,
          interviewAlerts: true,
          weeklyReport: false,
          ...(state.settings[account.id] || {}),
        },
      };
    if (path === "/api/recruiter/settings" && method === "PATCH") {
      state.settings[account.id] = body;
      account.profile = {
        ...(account.profile || {}),
        preferred_language: body.language || "fr",
      };
      write(state);
      return { ok: true };
    }
    fail("Cette action n’est pas disponible.", 405);
  }
  async function uploadDocument(form) {
    const state = read(),
      account = currentUser(state),
      file = form.get("file"),
      kind = String(form.get("kind") || "cv");
    if (!file?.size) fail("Document vide.");
    if (file.size > 8 * 1024 * 1024 || !/\.(pdf|docx?)$/i.test(file.name))
      fail("Document invalide.");
    const firstCv =
        kind === "cv" &&
        !state.documents.some(
          (x) => x.user_id === account.id && x.kind === "cv",
        ),
      buffer = await file.arrayBuffer(),
      bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    state.documents.unshift({
      id: id(),
      user_id: account.id,
      kind,
      original_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      is_default: firstCv ? 1 : 0,
      created_at: new Date().toISOString(),
      download_url: `data:${file.type};base64,${btoa(binary)}`,
    });
    write(state);
    return { ok: true };
  }
  window.workcruteLocalApi = { request, uploadDocument };
})();
