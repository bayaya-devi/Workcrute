const tr = (fr, en, ar) => ({ fr, en, ar });
const item = (q, a, keywords = []) => ({ q, a, keywords });

const categories = {
  account: [
    item(
      tr(
        "Comment créer un compte ?",
        "How do I create an account?",
        "كيف أنشئ حساباً؟",
      ),
      tr(
        "Choisissez Créer un compte, sélectionnez Candidat ou Recruteur, puis complétez les champs obligatoires.",
        "Choose Create account, select Candidate or Recruiter, then complete the required fields.",
        "اختر إنشاء حساب، ثم حدد مرشحاً أو مسؤول توظيف وأكمل الحقول المطلوبة.",
      ),
    ),
    item(
      tr(
        "Puis-je avoir un compte candidat et recruteur ?",
        "Can I have both a candidate and recruiter account?",
        "هل يمكنني امتلاك حساب مرشح ومسؤول توظيف؟",
      ),
      tr(
        "Chaque adresse e-mail correspond à un rôle. Utilisez une autre adresse si vous avez besoin d’un second rôle.",
        "Each email address is linked to one role. Use another address if you need a second role.",
        "يرتبط كل بريد إلكتروني بدور واحد. استخدم بريداً آخر إذا احتجت إلى دور ثانٍ.",
      ),
    ),
    item(
      tr(
        "Comment modifier mon adresse e-mail ?",
        "How do I change my email address?",
        "كيف أغيّر بريدي الإلكتروني؟",
      ),
      tr(
        "Ouvrez les paramètres de votre espace. Une vérification de sécurité peut être demandée avant le changement.",
        "Open your workspace settings. A security verification may be required before the change.",
        "افتح إعدادات مساحتك. قد يُطلب تحقق أمني قبل التغيير.",
      ),
    ),
    item(
      tr(
        "Comment supprimer mon compte ?",
        "How do I delete my account?",
        "كيف أحذف حسابي؟",
      ),
      tr(
        "Contactez le support depuis l’adresse du compte. La suppression est définitive et soumise aux obligations légales de conservation.",
        "Contact support from the account email. Deletion is permanent and subject to legal retention duties.",
        "تواصل مع الدعم من بريد الحساب. الحذف نهائي ويخضع لالتزامات الاحتفاظ القانونية.",
      ),
    ),
    item(
      tr(
        "Pourquoi mon compte est-il suspendu ?",
        "Why is my account suspended?",
        "لماذا تم تعليق حسابي؟",
      ),
      tr(
        "Un compte peut être suspendu pour sécurité ou non-respect des règles. Contactez le support sans transmettre votre mot de passe.",
        "An account may be suspended for security or rule violations. Contact support without sharing your password.",
        "قد يُعلّق الحساب لأسباب أمنية أو لمخالفة القواعد. تواصل مع الدعم دون إرسال كلمة المرور.",
      ),
    ),
  ],
  login: [
    item(
      tr("Comment me connecter ?", "How do I sign in?", "كيف أسجل الدخول؟"),
      tr(
        "Ouvrez Connexion et saisissez l’e-mail et le mot de passe utilisés lors de l’inscription.",
        "Open Sign in and enter the email and password used during registration.",
        "افتح تسجيل الدخول وأدخل البريد وكلمة المرور المستخدمين عند التسجيل.",
      ),
    ),
    item(
      tr(
        "Mon e-mail est refusé à la connexion, que faire ?",
        "My email is rejected at sign-in. What should I do?",
        "يتم رفض بريدي عند الدخول، ماذا أفعل؟",
      ),
      tr(
        "Vérifiez les espaces, l’orthographe et l’adresse utilisée à l’inscription. Le champ ne tient pas compte des majuscules.",
        "Check spaces, spelling and the address used to register. The field is case-insensitive.",
        "تحقق من المسافات والكتابة والبريد المستخدم في التسجيل. لا يميز الحقل بين الأحرف.",
      ),
    ),
    item(
      tr(
        "Pourquoi suis-je déconnecté automatiquement ?",
        "Why am I signed out automatically?",
        "لماذا يتم تسجيل خروجي تلقائياً؟",
      ),
      tr(
        "Les sessions expirent pour protéger votre compte. Reconnectez-vous et évitez de partager votre session.",
        "Sessions expire to protect your account. Sign in again and do not share your session.",
        "تنتهي الجلسات لحماية حسابك. سجل الدخول مجدداً ولا تشارك جلستك.",
      ),
    ),
    item(
      tr(
        "Puis-je rester connecté sur mon appareil ?",
        "Can I stay signed in on my device?",
        "هل يمكنني البقاء متصلاً على جهازي؟",
      ),
      tr(
        "Utilisez Se souvenir de moi uniquement sur un appareil personnel et verrouillé.",
        "Use Remember me only on a personal, locked device.",
        "استخدم تذكرني فقط على جهاز شخصي ومقفل.",
      ),
    ),
    item(
      tr(
        "Je suis redirigé vers le mauvais espace, pourquoi ?",
        "Why am I redirected to the wrong workspace?",
        "لماذا يتم توجيهي إلى مساحة خاطئة؟",
      ),
      tr(
        "Workcrute ouvre l’espace associé au rôle de votre compte. Vérifiez que vous utilisez la bonne adresse e-mail.",
        "Workcrute opens the workspace linked to your account role. Check that you are using the correct email.",
        "يفتح Workcrute المساحة المرتبطة بدور حسابك. تحقق من استخدام البريد الصحيح.",
      ),
    ),
  ],
  password: [
    item(
      tr(
        "Comment réinitialiser mon mot de passe ?",
        "How do I reset my password?",
        "كيف أعيد تعيين كلمة المرور؟",
      ),
      tr(
        "Depuis Connexion, choisissez Mot de passe oublié et saisissez votre adresse e-mail.",
        "From Sign in, choose Forgot password and enter your email address.",
        "من صفحة الدخول اختر نسيت كلمة المرور وأدخل بريدك.",
      ),
    ),
    item(
      tr(
        "Je ne reçois pas l’e-mail de réinitialisation.",
        "I am not receiving the reset email.",
        "لا تصلني رسالة إعادة التعيين.",
      ),
      tr(
        "Vérifiez les indésirables et l’adresse saisie, puis patientez quelques minutes avant une nouvelle demande.",
        "Check spam and the entered address, then wait a few minutes before requesting again.",
        "تحقق من الرسائل غير المرغوبة والبريد المدخل وانتظر بضع دقائق قبل الطلب مجدداً.",
      ),
    ),
    item(
      tr(
        "Quelles règles doit respecter mon mot de passe ?",
        "What rules must my password follow?",
        "ما قواعد كلمة المرور؟",
      ),
      tr(
        "Utilisez au moins 8 caractères avec majuscule, minuscule, chiffre et symbole, et évitez un mot de passe réutilisé.",
        "Use at least 8 characters with uppercase, lowercase, number and symbol, and avoid reused passwords.",
        "استخدم 8 أحرف على الأقل تشمل كبيراً وصغيراً ورقماً ورمزاً، ولا تعِد استخدام كلمة مرور.",
      ),
    ),
    item(
      tr(
        "Comment changer mon mot de passe connecté ?",
        "How do I change my password while signed in?",
        "كيف أغيّر كلمة المرور بعد الدخول؟",
      ),
      tr(
        "Ouvrez Sécurité, saisissez l’ancien mot de passe puis le nouveau deux fois.",
        "Open Security, enter the current password, then the new one twice.",
        "افتح الأمان وأدخل كلمة المرور الحالية ثم الجديدة مرتين.",
      ),
    ),
    item(
      tr(
        "Mon lien de réinitialisation a expiré.",
        "My reset link has expired.",
        "انتهت صلاحية رابط إعادة التعيين.",
      ),
      tr(
        "Demandez un nouveau lien depuis Mot de passe oublié. Seul le lien le plus récent doit être utilisé.",
        "Request a new link from Forgot password. Only the latest link should be used.",
        "اطلب رابطاً جديداً من نسيت كلمة المرور واستخدم أحدث رابط فقط.",
      ),
    ),
  ],
  candidate: [
    item(
      tr(
        "À quoi sert l’espace candidat ?",
        "What is the candidate workspace for?",
        "ما فائدة مساحة المرشح؟",
      ),
      tr(
        "Il centralise profil, documents, offres, favoris, alertes, candidatures, entretiens et notifications.",
        "It centralises your profile, documents, jobs, favourites, alerts, applications, interviews and notifications.",
        "تجمع ملفك ووثائقك والوظائف والمفضلة والتنبيهات والطلبات والمقابلات والإشعارات.",
      ),
    ),
    item(
      tr(
        "Comment compléter mon profil candidat ?",
        "How do I complete my candidate profile?",
        "كيف أكمل ملف المرشح؟",
      ),
      tr(
        "Ouvrez Profil puis Modifier et renseignez identité, métier, ville, disponibilité, expérience, formation, compétences et langues.",
        "Open Profile then Edit and complete identity, role, city, availability, experience, education, skills and languages.",
        "افتح الملف ثم تعديل وأكمل الهوية والمهنة والمدينة والتوفر والخبرة والتعليم والمهارات واللغات.",
      ),
    ),
    item(
      tr(
        "Que signifie la jauge de complétude ?",
        "What does the profile completion gauge mean?",
        "ماذا يعني مؤشر اكتمال الملف؟",
      ),
      tr(
        "Elle indique les sections utiles déjà remplies. Les éléments manquants sont listés sous la jauge.",
        "It shows which useful sections are complete. Missing items are listed below the gauge.",
        "توضح الأقسام المفيدة المكتملة، وتظهر العناصر الناقصة أسفل المؤشر.",
      ),
    ),
    item(
      tr(
        "Comment indiquer ma disponibilité ?",
        "How do I set my availability?",
        "كيف أحدد وقت توفري؟",
      ),
      tr(
        "Dans le profil, choisissez Immédiatement, Dans 1 mois, Dans 2 mois ou Autre et précisez si nécessaire.",
        "In your profile, choose Immediately, In 1 month, In 2 months or Other and add details if needed.",
        "في الملف اختر فوراً أو خلال شهر أو شهرين أو أخرى وأضف توضيحاً عند الحاجة.",
      ),
    ),
    item(
      tr(
        "Les recruteurs peuvent-ils voir mon profil ?",
        "Can recruiters see my profile?",
        "هل يمكن لمسؤولي التوظيف رؤية ملفي؟",
      ),
      tr(
        "Seulement si la visibilité du profil est activée et selon les autorisations de la plateforme.",
        "Only when profile visibility is enabled and according to platform permissions.",
        "فقط عند تفعيل ظهور الملف ووفق صلاحيات المنصة.",
      ),
    ),
  ],
  recruiter: [
    item(
      tr(
        "À quoi sert l’espace recruteur ?",
        "What is the recruiter workspace for?",
        "ما فائدة مساحة مسؤول التوظيف؟",
      ),
      tr(
        "Il permet de gérer l’entreprise, les offres, questionnaires, candidatures, profils, notes et entretiens.",
        "It manages the company, jobs, questionnaires, applications, profiles, notes and interviews.",
        "يتيح إدارة الشركة والوظائف والاستبيانات والطلبات والملفات والملاحظات والمقابلات.",
      ),
    ),
    item(
      tr(
        "Comment créer un compte recruteur ?",
        "How do I create a recruiter account?",
        "كيف أنشئ حساب مسؤول توظيف؟",
      ),
      tr(
        "Choisissez Créer un compte puis Je recrute et complétez vos coordonnées professionnelles.",
        "Choose Create account, then I’m recruiting, and complete your professional details.",
        "اختر إنشاء حساب ثم أبحث عن موظفين وأكمل بياناتك المهنية.",
      ),
    ),
    item(
      tr(
        "Puis-je inviter un autre recruteur ?",
        "Can I invite another recruiter?",
        "هل يمكنني دعوة مسؤول توظيف آخر؟",
      ),
      tr(
        "La gestion multi-recruteurs dépend des autorisations de l’entreprise. Contactez l’administrateur si l’option n’apparaît pas.",
        "Multi-recruiter management depends on company permissions. Contact the administrator if the option is unavailable.",
        "تعتمد إدارة عدة مسؤولين على صلاحيات الشركة. تواصل مع المشرف إن لم يظهر الخيار.",
      ),
    ),
    item(
      tr(
        "Comment rechercher un candidat ?",
        "How do I search for a candidate?",
        "كيف أبحث عن مرشح؟",
      ),
      tr(
        "Utilisez Recherche candidats et filtrez uniquement sur les profils visibles et les critères professionnels disponibles.",
        "Use Candidate search and filter only visible profiles using available professional criteria.",
        "استخدم البحث عن المرشحين وصفِّ الملفات الظاهرة حسب المعايير المهنية المتاحة.",
      ),
    ),
    item(
      tr(
        "Où voir les candidatures reçues ?",
        "Where can I see received applications?",
        "أين أرى الطلبات المستلمة؟",
      ),
      tr(
        "Ouvrez Candidatures, puis utilisez la vue Liste ou Kanban et les filtres d’offre.",
        "Open Applications, then use List or Kanban view and job filters.",
        "افتح الطلبات ثم استخدم عرض القائمة أو كانبان ومرشحات الوظيفة.",
      ),
    ),
  ],
  company: [
    item(
      tr(
        "Comment créer la fiche entreprise ?",
        "How do I create the company profile?",
        "كيف أنشئ ملف الشركة؟",
      ),
      tr(
        "Depuis l’espace recruteur, ouvrez Entreprise et renseignez le nom, secteur, ville et informations utiles.",
        "From the recruiter workspace, open Company and enter its name, industry, city and useful details.",
        "من مساحة مسؤول التوظيف افتح الشركة وأدخل الاسم والقطاع والمدينة والمعلومات المفيدة.",
      ),
    ),
    item(
      tr(
        "Comment modifier le nom de l’entreprise ?",
        "How do I change the company name?",
        "كيف أغيّر اسم الشركة؟",
      ),
      tr(
        "Modifiez la fiche Entreprise. Une validation administrative peut être nécessaire pour les changements sensibles.",
        "Edit the Company profile. Administrative review may be required for sensitive changes.",
        "عدّل ملف الشركة، وقد تلزم مراجعة إدارية للتغييرات الحساسة.",
      ),
    ),
    item(
      tr(
        "Puis-je ajouter le site web de l’entreprise ?",
        "Can I add the company website?",
        "هل يمكنني إضافة موقع الشركة؟",
      ),
      tr(
        "Oui, saisissez une adresse web complète dans la fiche entreprise.",
        "Yes, enter a complete web address in the company profile.",
        "نعم، أدخل عنوان ويب كاملاً في ملف الشركة.",
      ),
    ),
    item(
      tr(
        "Pourquoi dois-je compléter l’entreprise avant une offre ?",
        "Why must I complete the company before posting a job?",
        "لماذا يجب إكمال الشركة قبل نشر وظيفة؟",
      ),
      tr(
        "Les candidats doivent identifier clairement l’employeur. Les informations minimales sont donc requises avant publication.",
        "Candidates must clearly identify the employer, so minimum company details are required before publishing.",
        "يجب أن يتعرف المرشح بوضوح على صاحب العمل، لذلك تلزم بيانات الشركة الأساسية قبل النشر.",
      ),
    ),
    item(
      tr(
        "Comment suspendre une entreprise ?",
        "How is a company suspended?",
        "كيف يتم تعليق شركة؟",
      ),
      tr(
        "Seule l’administration peut suspendre ou réactiver une entreprise depuis le Control Center.",
        "Only administrators can suspend or reactivate a company from the Control Center.",
        "يمكن للمشرف فقط تعليق الشركة أو إعادة تفعيلها من مركز التحكم.",
      ),
    ),
  ],
  cv: [
    item(
      tr(
        "Comment ajouter mon CV ?",
        "How do I upload my resume?",
        "كيف أضيف سيرتي الذاتية؟",
      ),
      tr(
        "Ouvrez Documents, choisissez CV puis sélectionnez un fichier PDF, DOC ou DOCX de moins de 8 Mo.",
        "Open Documents, choose Resume, then select a PDF, DOC or DOCX file under 8 MB.",
        "افتح الوثائق واختر السيرة ثم حدد ملف PDF أو DOC أو DOCX أقل من 8 ميغابايت.",
      ),
    ),
    item(
      tr(
        "Puis-je ajouter plusieurs CV ?",
        "Can I upload several resumes?",
        "هل يمكنني إضافة عدة سير ذاتية؟",
      ),
      tr(
        "Oui. Vous pouvez conserver plusieurs CV et choisir celui qui devient le CV principal.",
        "Yes. You can keep several resumes and choose the primary one.",
        "نعم، يمكنك الاحتفاظ بعدة سير واختيار السيرة الرئيسية.",
      ),
    ),
    item(
      tr(
        "Comment choisir mon CV principal ?",
        "How do I choose my primary resume?",
        "كيف أختار السيرة الرئيسية؟",
      ),
      tr(
        "Dans Documents, utilisez Définir comme principal sur le CV souhaité.",
        "In Documents, use Set as primary on the desired resume.",
        "في الوثائق استخدم تعيين كرئيسية على السيرة المطلوبة.",
      ),
    ),
    item(
      tr(
        "Quels formats de CV sont acceptés ?",
        "Which resume formats are accepted?",
        "ما صيغ السيرة المقبولة؟",
      ),
      tr(
        "Les formats acceptés sont PDF, DOC et DOCX, avec une taille maximale de 8 Mo.",
        "Accepted formats are PDF, DOC and DOCX, up to 8 MB.",
        "الصيغ المقبولة PDF وDOC وDOCX بحجم أقصى 8 ميغابايت.",
      ),
    ),
    item(
      tr(
        "Pourquoi mon CV ne se téléverse pas ?",
        "Why won’t my resume upload?",
        "لماذا لا يتم رفع سيرتي؟",
      ),
      tr(
        "Vérifiez le format, la taille et votre connexion. Renommez aussi le fichier sans caractères inhabituels si nécessaire.",
        "Check format, size and your connection. Also rename the file without unusual characters if needed.",
        "تحقق من الصيغة والحجم والاتصال، وأعد تسمية الملف دون رموز غير معتادة عند الحاجة.",
      ),
    ),
  ],
  documents: [
    item(
      tr(
        "Quels documents puis-je ajouter ?",
        "Which documents can I add?",
        "ما الوثائق التي يمكنني إضافتها؟",
      ),
      tr(
        "Vous pouvez ajouter CV, lettre, diplôme, certificat, portfolio ou autre document professionnel accepté.",
        "You can add a resume, letter, diploma, certificate, portfolio or another accepted professional document.",
        "يمكنك إضافة سيرة أو رسالة أو شهادة دراسية أو مهنية أو معرض أعمال أو وثيقة مهنية مقبولة.",
      ),
    ),
    item(
      tr(
        "Comment télécharger un document ?",
        "How do I download a document?",
        "كيف أنزّل وثيقة؟",
      ),
      tr(
        "Ouvrez Documents et utilisez Télécharger sur le fichier concerné.",
        "Open Documents and use Download on the relevant file.",
        "افتح الوثائق واستخدم تنزيل على الملف المطلوب.",
      ),
    ),
    item(
      tr(
        "Comment supprimer un document ?",
        "How do I delete a document?",
        "كيف أحذف وثيقة؟",
      ),
      tr(
        "Dans Documents, choisissez Supprimer puis confirmez. Vérifiez d’abord qu’il n’est plus nécessaire.",
        "In Documents, choose Delete and confirm. First check that it is no longer needed.",
        "في الوثائق اختر حذف ثم أكد، وتحقق أولاً من أنك لم تعد تحتاجه.",
      ),
    ),
    item(
      tr(
        "Qui peut consulter mes documents ?",
        "Who can view my documents?",
        "من يمكنه رؤية وثائقي؟",
      ),
      tr(
        "Ils ne sont pas publics. Leur accès est limité aux utilisateurs autorisés dans le cadre du recrutement.",
        "They are not public. Access is limited to authorised users for recruitment purposes.",
        "ليست عامة، ويقتصر الوصول عليها على المستخدمين المصرح لهم لأغراض التوظيف.",
      ),
    ),
    item(
      tr(
        "Puis-je ajouter un portfolio ?",
        "Can I add a portfolio?",
        "هل يمكنني إضافة معرض أعمال؟",
      ),
      tr(
        "Oui, choisissez le type Portfolio. Le fichier doit respecter les formats et limites affichés.",
        "Yes, choose Portfolio. The file must meet the displayed formats and limits.",
        "نعم، اختر نوع معرض أعمال ويجب أن يحترم الملف الصيغ والحدود المعروضة.",
      ),
    ),
  ],
  jobs: [
    item(
      tr(
        "Comment rechercher une offre ?",
        "How do I search for a job?",
        "كيف أبحث عن وظيفة؟",
      ),
      tr(
        "Ouvrez Offres et recherchez par mot-clé, métier, secteur ou ville.",
        "Open Jobs and search by keyword, role, industry or city.",
        "افتح الوظائف وابحث بالكلمة أو المهنة أو القطاع أو المدينة.",
      ),
    ),
    item(
      tr(
        "Comment consulter le détail d’une offre ?",
        "How do I view job details?",
        "كيف أرى تفاصيل الوظيفة؟",
      ),
      tr(
        "Sélectionnez le titre ou Voir l’offre pour afficher description, critères et conditions.",
        "Select the title or View job to display its description, criteria and conditions.",
        "اختر العنوان أو عرض الوظيفة لإظهار الوصف والمعايير والشروط.",
      ),
    ),
    item(
      tr(
        "Pourquoi une offre a disparu ?",
        "Why has a job disappeared?",
        "لماذا اختفت وظيفة؟",
      ),
      tr(
        "Elle peut avoir été fermée, suspendue, archivée ou arrivée à échéance.",
        "It may have been closed, suspended, archived or reached its deadline.",
        "قد تكون أغلقت أو عُلّقت أو أُرشفت أو انتهى أجلها.",
      ),
    ),
    item(
      tr(
        "Comment publier une offre ?",
        "How do I publish a job?",
        "كيف أنشر وظيفة؟",
      ),
      tr(
        "Dans l’espace recruteur, ouvrez Créer une offre, complétez les six étapes, vérifiez l’aperçu puis publiez.",
        "In the recruiter workspace, open Create job, complete all six steps, review the preview, then publish.",
        "في مساحة مسؤول التوظيف افتح إنشاء وظيفة وأكمل المراحل الست وراجع المعاينة ثم انشر.",
      ),
    ),
    item(
      tr(
        "Puis-je modifier une offre publiée ?",
        "Can I edit a published job?",
        "هل يمكنني تعديل وظيفة منشورة؟",
      ),
      tr(
        "Oui, depuis Mes offres. Vérifiez les changements avant d’enregistrer pour ne pas induire les candidats en erreur.",
        "Yes, from My jobs. Review changes before saving to avoid misleading candidates.",
        "نعم من وظائفي. راجع التغييرات قبل الحفظ حتى لا تضلل المرشحين.",
      ),
    ),
  ],
  filters: [
    item(
      tr(
        "Comment filtrer les offres par ville ?",
        "How do I filter jobs by city?",
        "كيف أصفّي الوظائف حسب المدينة؟",
      ),
      tr(
        "Saisissez une ville dans le filtre Ville puis appliquez les filtres.",
        "Enter a city in the City filter, then apply filters.",
        "أدخل مدينة في مرشح المدينة ثم طبّق المرشحات.",
      ),
    ),
    item(
      tr(
        "Comment filtrer par type de contrat ?",
        "How do I filter by contract type?",
        "كيف أصفّي حسب نوع العقد؟",
      ),
      tr(
        "Choisissez CDI, CDD, Stage ou Freelance dans le filtre Contrat.",
        "Choose Permanent, Fixed-term, Internship or Freelance in the Contract filter.",
        "اختر نوع العقد المناسب من مرشح العقد.",
      ),
    ),
    item(
      tr(
        "Comment filtrer le télétravail ?",
        "How do I filter remote work?",
        "كيف أصفّي العمل عن بعد؟",
      ),
      tr(
        "Utilisez Mode de travail et choisissez À distance, Hybride ou Sur place.",
        "Use Work mode and choose Remote, Hybrid or On-site.",
        "استخدم نمط العمل واختر عن بعد أو هجين أو حضوري.",
      ),
    ),
    item(
      tr(
        "Pourquoi mes filtres ne donnent aucun résultat ?",
        "Why do my filters return no results?",
        "لماذا لا تعطي المرشحات نتائج؟",
      ),
      tr(
        "Les critères sont peut-être trop restrictifs. Retirez-en un à la fois ou utilisez Réinitialiser.",
        "Your criteria may be too restrictive. Remove one at a time or use Reset.",
        "قد تكون المعايير ضيقة جداً. احذف معياراً كل مرة أو استخدم إعادة الضبط.",
      ),
    ),
    item(
      tr(
        "Comment réinitialiser la recherche ?",
        "How do I reset my search?",
        "كيف أعيد ضبط البحث؟",
      ),
      tr(
        "Utilisez Réinitialiser pour effacer tous les filtres et revenir aux offres disponibles.",
        "Use Reset to clear every filter and return to available jobs.",
        "استخدم إعادة الضبط لمسح كل المرشحات والعودة إلى الوظائف المتاحة.",
      ),
    ),
  ],
  favorites: [
    item(
      tr(
        "Comment enregistrer une offre en favori ?",
        "How do I save a job as a favourite?",
        "كيف أحفظ وظيفة في المفضلة؟",
      ),
      tr(
        "Connectez-vous comme candidat puis utilisez Enregistrer sur l’offre.",
        "Sign in as a candidate, then use Save on the job.",
        "سجل الدخول كمرشح ثم استخدم حفظ على الوظيفة.",
      ),
    ),
    item(
      tr(
        "Où retrouver mes offres enregistrées ?",
        "Where are my saved jobs?",
        "أين أجد الوظائف المحفوظة؟",
      ),
      tr(
        "Ouvrez Offres enregistrées dans la navigation candidat.",
        "Open Saved jobs in the candidate navigation.",
        "افتح الوظائف المحفوظة في تنقل المرشح.",
      ),
    ),
    item(
      tr(
        "Comment retirer une offre des favoris ?",
        "How do I remove a saved job?",
        "كيف أزيل وظيفة من المفضلة؟",
      ),
      tr(
        "Utilisez de nouveau le bouton Enregistrée ou retirez-la depuis la page des favoris.",
        "Use the Saved button again or remove it from the favourites page.",
        "استخدم زر محفوظة مجدداً أو أزلها من صفحة المفضلة.",
      ),
    ),
    item(
      tr(
        "Les favoris sont-ils visibles par les recruteurs ?",
        "Can recruiters see my favourites?",
        "هل يرى مسؤولو التوظيف مفضلتي؟",
      ),
      tr(
        "Non. Vos favoris servent uniquement à organiser votre recherche personnelle.",
        "No. Favourites are only used to organise your personal search.",
        "لا، المفضلة مخصصة لتنظيم بحثك الشخصي فقط.",
      ),
    ),
    item(
      tr(
        "Une offre fermée reste-t-elle dans mes favoris ?",
        "Does a closed job stay in my favourites?",
        "هل تبقى الوظيفة المغلقة في المفضلة؟",
      ),
      tr(
        "Elle peut ne plus apparaître parmi les offres actives, même si elle avait été enregistrée.",
        "It may no longer appear among active jobs even if it was previously saved.",
        "قد لا تعود تظهر ضمن الوظائف النشطة حتى لو كانت محفوظة سابقاً.",
      ),
    ),
  ],
  alerts: [
    item(
      tr(
        "Comment créer une alerte emploi ?",
        "How do I create a job alert?",
        "كيف أنشئ تنبيه وظائف؟",
      ),
      tr(
        "Dans Alertes, ajoutez au moins un critère puis choisissez la fréquence.",
        "In Alerts, add at least one criterion and choose the frequency.",
        "في التنبيهات أضف معياراً واحداً على الأقل ثم اختر التكرار.",
      ),
    ),
    item(
      tr(
        "Quels critères peut contenir une alerte ?",
        "Which criteria can a job alert contain?",
        "ما المعايير التي يمكن أن يتضمنها التنبيه؟",
      ),
      tr(
        "Métier, secteur, ville, contrat, mode de travail et compétences peuvent être combinés.",
        "Role, industry, city, contract, work mode and skills can be combined.",
        "يمكن جمع المهنة والقطاع والمدينة والعقد ونمط العمل والمهارات.",
      ),
    ),
    item(
      tr(
        "Quelles fréquences d’alerte existent ?",
        "Which alert frequencies are available?",
        "ما تكرارات التنبيه المتاحة؟",
      ),
      tr(
        "Vous pouvez choisir immédiate, quotidienne ou hebdomadaire.",
        "You can choose immediate, daily or weekly.",
        "يمكنك اختيار فوري أو يومي أو أسبوعي.",
      ),
    ),
    item(
      tr(
        "Comment désactiver une alerte ?",
        "How do I disable a job alert?",
        "كيف أعطّل تنبيهاً؟",
      ),
      tr(
        "Ouvrez Alertes et désactivez l’alerte sans la supprimer pour la réutiliser plus tard.",
        "Open Alerts and disable it without deleting it so you can reuse it later.",
        "افتح التنبيهات وعطّل التنبيه دون حذفه لتعيد استخدامه لاحقاً.",
      ),
    ),
    item(
      tr(
        "Pourquoi mon alerte ne trouve rien ?",
        "Why does my alert find nothing?",
        "لماذا لا يجد التنبيه شيئاً؟",
      ),
      tr(
        "Aucune offre active ne correspond peut-être encore. Élargissez un critère ou réduisez le nombre de filtres.",
        "No active job may match yet. Broaden one criterion or reduce the number of filters.",
        "قد لا توجد وظيفة نشطة مطابقة بعد. وسّع معياراً أو قلل عدد المرشحات.",
      ),
    ),
  ],
  applications: [
    item(
      tr(
        "Comment postuler à une offre ?",
        "How do I apply for a job?",
        "كيف أتقدم لوظيفة؟",
      ),
      tr(
        "Ouvrez une offre publiée, complétez le questionnaire éventuel puis utilisez Postuler.",
        "Open a published job, complete any questionnaire, then use Apply.",
        "افتح وظيفة منشورة وأكمل الاستبيان إن وجد ثم استخدم تقديم.",
      ),
    ),
    item(
      tr(
        "Puis-je postuler deux fois à la même offre ?",
        "Can I apply twice to the same job?",
        "هل يمكنني التقدم مرتين لنفس الوظيفة؟",
      ),
      tr(
        "Non. Une seule candidature par compte candidat et par offre est autorisée.",
        "No. Only one application per candidate account and job is allowed.",
        "لا، يسمح بطلب واحد فقط لكل حساب مرشح ولكل وظيفة.",
      ),
    ),
    item(
      tr(
        "Où suivre mes candidatures ?",
        "Where can I track my applications?",
        "أين أتابع طلباتي؟",
      ),
      tr(
        "Ouvrez Candidatures dans votre espace candidat pour voir la liste et la timeline.",
        "Open Applications in your candidate workspace to see the list and timeline.",
        "افتح الطلبات في مساحة المرشح لرؤية القائمة والخط الزمني.",
      ),
    ),
    item(
      tr(
        "Comment retirer une candidature ?",
        "How do I withdraw an application?",
        "كيف أسحب طلباً؟",
      ),
      tr(
        "Si le retrait est disponible pour son statut, ouvrez le détail puis choisissez Retirer.",
        "If withdrawal is available for its status, open the details and choose Withdraw.",
        "إذا كان السحب متاحاً لحالتها فافتح التفاصيل واختر سحب.",
      ),
    ),
    item(
      tr(
        "Le recruteur voit-il ma lettre de motivation ?",
        "Can the recruiter see my cover letter?",
        "هل يرى مسؤول التوظيف رسالة الدافع؟",
      ),
      tr(
        "Oui, lorsqu’elle est jointe à la candidature, elle est accessible au recruteur concerné.",
        "Yes. When attached to the application, it is available to the relevant recruiter.",
        "نعم، عندما ترفق بالطلب يمكن لمسؤول التوظيف المعني رؤيتها.",
      ),
    ),
  ],
  statuses: [
    item(
      tr(
        "Que signifie candidature envoyée ?",
        "What does submitted application mean?",
        "ماذا تعني حالة تم الإرسال؟",
      ),
      tr(
        "Votre candidature a été enregistrée et transmise au recruteur.",
        "Your application was recorded and sent to the recruiter.",
        "تم تسجيل طلبك وإرساله إلى مسؤول التوظيف.",
      ),
    ),
    item(
      tr(
        "Que signifie candidature vue ?",
        "What does reviewed application mean?",
        "ماذا تعني حالة تمت المشاهدة؟",
      ),
      tr(
        "Le recruteur a ouvert ou consulté votre candidature.",
        "The recruiter has opened or reviewed your application.",
        "فتح مسؤول التوظيف طلبك أو راجعه.",
      ),
    ),
    item(
      tr(
        "Que signifie présélectionnée ?",
        "What does shortlisted mean?",
        "ماذا تعني القائمة المختصرة؟",
      ),
      tr(
        "Votre profil a été retenu pour une étape supplémentaire, sans garantie de décision finale.",
        "Your profile was selected for a further step, without guaranteeing a final decision.",
        "تم اختيار ملفك لمرحلة إضافية دون ضمان القرار النهائي.",
      ),
    ),
    item(
      tr(
        "Que signifie entretien ?",
        "What does interview status mean?",
        "ماذا تعني حالة مقابلة؟",
      ),
      tr(
        "Un entretien est prévu ou en cours de planification pour cette candidature.",
        "An interview is planned or being scheduled for this application.",
        "تم التخطيط لمقابلة أو يجري تحديدها لهذا الطلب.",
      ),
    ),
    item(
      tr(
        "Que signifient acceptée, refusée et retirée ?",
        "What do accepted, rejected and withdrawn mean?",
        "ماذا تعني مقبول ومرفوض ومسحوب؟",
      ),
      tr(
        "Acceptée indique une décision positive, Refusée une décision négative et Retirée un retrait par le candidat.",
        "Accepted is a positive decision, Rejected a negative one, and Withdrawn means the candidate withdrew.",
        "مقبول قرار إيجابي، ومرفوض قرار سلبي، ومسحوب يعني أن المرشح سحب طلبه.",
      ),
    ),
  ],
  matching: [
    item(
      tr(
        "Comment fonctionne le matching ?",
        "How does matching work?",
        "كيف تعمل المطابقة؟",
      ),
      tr(
        "Il compare uniquement les données professionnelles disponibles avec les critères réels de l’offre.",
        "It compares only available professional data with the job’s real criteria.",
        "تقارن فقط البيانات المهنية المتاحة بمعايير الوظيفة الفعلية.",
      ),
    ),
    item(
      tr(
        "Le score de matching est-il aléatoire ?",
        "Is the matching score random?",
        "هل نتيجة المطابقة عشوائية؟",
      ),
      tr(
        "Non. Workcrute n’affiche aucun score s’il ne peut pas être calculé à partir de critères réels.",
        "No. Workcrute shows no score unless it can be calculated from real criteria.",
        "لا، لا يعرض Workcrute نتيجة ما لم تُحسب من معايير حقيقية.",
      ),
    ),
    item(
      tr(
        "Quels critères entrent dans le matching ?",
        "Which criteria are used for matching?",
        "ما المعايير المستخدمة في المطابقة؟",
      ),
      tr(
        "Selon les données disponibles : compétences, expérience, formation, localisation, contrat, disponibilité et questionnaire.",
        "Depending on available data: skills, experience, education, location, contract, availability and questionnaire.",
        "بحسب البيانات المتاحة: المهارات والخبرة والتعليم والموقع والعقد والتوفر والاستبيان.",
      ),
    ),
    item(
      tr(
        "Pourquoi mon score n’est-il pas disponible ?",
        "Why is my score unavailable?",
        "لماذا نتيجتي غير متاحة؟",
      ),
      tr(
        "Des critères ou données fiables manquent, ou le moteur de matching n’est pas actif pour cette offre.",
        "Reliable data or criteria are missing, or matching is not active for this job.",
        "تنقص بيانات أو معايير موثوقة، أو أن المطابقة غير مفعلة لهذه الوظيفة.",
      ),
    ),
    item(
      tr(
        "Comment améliorer la pertinence de mon profil ?",
        "How can I improve my profile relevance?",
        "كيف أحسن ملاءمة ملفي؟",
      ),
      tr(
        "Complétez honnêtement compétences, expérience, formation, ville, disponibilité et préférences.",
        "Accurately complete skills, experience, education, city, availability and preferences.",
        "أكمل بصدق المهارات والخبرة والتعليم والمدينة والتوفر والتفضيلات.",
      ),
    ),
  ],
  interviews: [
    item(
      tr(
        "Où voir mes prochains entretiens ?",
        "Where can I see upcoming interviews?",
        "أين أرى مقابلاتي القادمة؟",
      ),
      tr(
        "Ils apparaissent sur le dashboard candidat et dans la rubrique Entretiens.",
        "They appear on the candidate dashboard and in Interviews.",
        "تظهر في لوحة المرشح وقسم المقابلات.",
      ),
    ),
    item(
      tr(
        "Quels types d’entretien sont possibles ?",
        "Which interview types are possible?",
        "ما أنواع المقابلات الممكنة؟",
      ),
      tr(
        "Présentiel, téléphone et visioconférence sont pris en charge.",
        "On-site, phone and video interviews are supported.",
        "تدعم المقابلات الحضورية والهاتفية والمرئية.",
      ),
    ),
    item(
      tr(
        "Comment confirmer un entretien ?",
        "How do I confirm an interview?",
        "كيف أؤكد مقابلة؟",
      ),
      tr(
        "Ouvrez l’entretien à venir et utilisez Confirmer lorsqu’il est en attente.",
        "Open the upcoming interview and use Confirm when it is pending.",
        "افتح المقابلة القادمة واستخدم تأكيد عندما تكون معلقة.",
      ),
    ),
    item(
      tr(
        "Comment demander un autre horaire ?",
        "How do I request another interview time?",
        "كيف أطلب موعداً آخر؟",
      ),
      tr(
        "Utilisez Demander une modification depuis l’entretien puis attendez la mise à jour du recruteur.",
        "Use Request reschedule from the interview, then wait for the recruiter’s update.",
        "استخدم طلب تعديل من المقابلة ثم انتظر تحديث مسؤول التوظيف.",
      ),
    ),
    item(
      tr(
        "Où trouver le lien de visioconférence ?",
        "Where is the video interview link?",
        "أين أجد رابط المقابلة المرئية؟",
      ),
      tr(
        "Il apparaît dans le détail de l’entretien lorsque le recruteur l’a renseigné.",
        "It appears in the interview details once the recruiter has provided it.",
        "يظهر في تفاصيل المقابلة عندما يضيفه مسؤول التوظيف.",
      ),
    ),
  ],
  notifications: [
    item(
      tr(
        "Où consulter mes notifications ?",
        "Where can I view notifications?",
        "أين أرى الإشعارات؟",
      ),
      tr(
        "Utilisez l’icône de notification ou ouvrez la rubrique Notifications de votre espace.",
        "Use the notification icon or open Notifications in your workspace.",
        "استخدم رمز الإشعارات أو افتح قسم الإشعارات في مساحتك.",
      ),
    ),
    item(
      tr(
        "Comment marquer une notification comme lue ?",
        "How do I mark a notification as read?",
        "كيف أعلّم إشعاراً كمقروء؟",
      ),
      tr(
        "Utilisez l’action de lecture sur la notification, ou Marquer tout comme lu.",
        "Use the read action on the notification, or Mark all as read.",
        "استخدم إجراء القراءة على الإشعار أو تعيين الكل كمقروء.",
      ),
    ),
    item(
      tr(
        "Comment supprimer une notification ?",
        "How do I delete a notification?",
        "كيف أحذف إشعاراً؟",
      ),
      tr(
        "Ouvrez Notifications puis utilisez Supprimer sur l’élément concerné.",
        "Open Notifications and use Delete on the relevant item.",
        "افتح الإشعارات واستخدم حذف على العنصر المطلوب.",
      ),
    ),
    item(
      tr(
        "Puis-je désactiver les e-mails ?",
        "Can I disable email notifications?",
        "هل يمكنني تعطيل رسائل البريد؟",
      ),
      tr(
        "Oui, modifiez les préférences de notification dans Paramètres.",
        "Yes, change notification preferences in Settings.",
        "نعم، عدّل تفضيلات الإشعارات في الإعدادات.",
      ),
    ),
    item(
      tr(
        "Pourquoi le badge de notification reste affiché ?",
        "Why does the notification badge remain visible?",
        "لماذا تبقى شارة الإشعارات ظاهرة؟",
      ),
      tr(
        "Une notification est probablement encore non lue. Ouvrez la liste ou actualisez après l’avoir lue.",
        "A notification is probably still unread. Open the list or refresh after reading it.",
        "غالباً يوجد إشعار غير مقروء. افتح القائمة أو حدّث الصفحة بعد قراءته.",
      ),
    ),
  ],
  privacy: [
    item(
      tr(
        "Mes données sont-elles publiques ?",
        "Is my data public?",
        "هل بياناتي عامة؟",
      ),
      tr(
        "Non. L’accès dépend de votre rôle, de vos paramètres et des besoins légitimes du recrutement.",
        "No. Access depends on your role, settings and legitimate recruitment needs.",
        "لا، يعتمد الوصول على دورك وإعداداتك وحاجات التوظيف المشروعة.",
      ),
    ),
    item(
      tr(
        "Mes documents sont-ils indexés sur internet ?",
        "Are my documents indexed online?",
        "هل تتم فهرسة وثائقي على الإنترنت؟",
      ),
      tr(
        "Non. Les documents candidats sont servis par des routes protégées et ne sont pas des fichiers publics.",
        "No. Candidate documents are delivered through protected routes and are not public files.",
        "لا، تُقدَّم وثائق المرشح عبر مسارات محمية وليست ملفات عامة.",
      ),
    ),
    item(
      tr(
        "Qui voit les notes internes du recruteur ?",
        "Who can see recruiter internal notes?",
        "من يرى ملاحظات مسؤول التوظيف الداخلية؟",
      ),
      tr(
        "Elles sont réservées aux utilisateurs recruteurs autorisés et ne sont jamais visibles par le candidat.",
        "They are limited to authorised recruiter users and are never visible to the candidate.",
        "تقتصر على مسؤولي التوظيف المصرح لهم ولا يراها المرشح أبداً.",
      ),
    ),
    item(
      tr(
        "Pourquoi Workcrute conserve certaines données ?",
        "Why does Workcrute retain some data?",
        "لماذا يحتفظ Workcrute ببعض البيانات؟",
      ),
      tr(
        "Pour fournir le service, assurer sa sécurité et respecter les obligations légales applicables.",
        "To provide the service, secure it and meet applicable legal obligations.",
        "لتقديم الخدمة وتأمينها والامتثال للالتزامات القانونية المطبقة.",
      ),
    ),
    item(
      tr(
        "Comment signaler un problème de confidentialité ?",
        "How do I report a privacy issue?",
        "كيف أبلغ عن مشكلة خصوصية؟",
      ),
      tr(
        "Contactez le support avec la page et le type de donnée concerné, sans joindre de secret inutile.",
        "Contact support with the page and type of data involved, without attaching unnecessary secrets.",
        "تواصل مع الدعم موضحاً الصفحة ونوع البيانات دون إرفاق أسرار غير ضرورية.",
      ),
    ),
  ],
  security: [
    item(
      tr(
        "Comment sécuriser mon compte ?",
        "How do I secure my account?",
        "كيف أؤمّن حسابي؟",
      ),
      tr(
        "Utilisez un mot de passe unique, gardez votre appareil à jour et déconnectez-vous des appareils partagés.",
        "Use a unique password, keep your device updated and sign out from shared devices.",
        "استخدم كلمة مرور فريدة وحدّث جهازك وسجل الخروج من الأجهزة المشتركة.",
      ),
    ),
    item(
      tr(
        "Workcrute me demandera-t-il mon mot de passe par message ?",
        "Will Workcrute ask for my password by message?",
        "هل سيطلب Workcrute كلمة مروري برسالة؟",
      ),
      tr(
        "Non. Ne transmettez jamais mot de passe, jeton de session ou code de validation au chatbot ou à un tiers.",
        "No. Never send a password, session token or verification code to the chatbot or a third party.",
        "لا، لا ترسل كلمة المرور أو رمز الجلسة أو التحقق للمساعد أو لطرف آخر.",
      ),
    ),
    item(
      tr(
        "Que faire si je soupçonne une connexion inconnue ?",
        "What should I do if I suspect an unknown sign-in?",
        "ماذا أفعل إذا شككت في دخول مجهول؟",
      ),
      tr(
        "Changez immédiatement votre mot de passe, déconnectez vos sessions et contactez le support.",
        "Immediately change your password, sign out your sessions and contact support.",
        "غيّر كلمة المرور فوراً وسجل خروج الجلسات وتواصل مع الدعم.",
      ),
    ),
    item(
      tr(
        "Pourquoi certaines actions sont limitées ?",
        "Why are some actions rate-limited?",
        "لماذا بعض الإجراءات محدودة؟",
      ),
      tr(
        "Les limites protègent la plateforme contre les abus et les tentatives automatisées.",
        "Limits protect the platform from abuse and automated attempts.",
        "تحمي الحدود المنصة من الإساءة والمحاولات الآلية.",
      ),
    ),
    item(
      tr(
        "Les mots de passe sont-ils stockés en clair ?",
        "Are passwords stored as plain text?",
        "هل تُحفظ كلمات المرور كنص واضح؟",
      ),
      tr(
        "Non. Ils sont traités et vérifiés côté serveur avec un hash sécurisé.",
        "No. They are processed and verified server-side using secure hashing.",
        "لا، تتم معالجتها والتحقق منها على الخادم باستخدام تجزئة آمنة.",
      ),
    ),
  ],
  languages: [
    item(
      tr(
        "Quelles langues sont disponibles ?",
        "Which languages are available?",
        "ما اللغات المتاحة؟",
      ),
      tr(
        "Workcrute prend en charge le français, l’anglais et l’arabe.",
        "Workcrute supports French, English and Arabic.",
        "يدعم Workcrute الفرنسية والإنجليزية والعربية.",
      ),
    ),
    item(
      tr(
        "Comment changer la langue ?",
        "How do I change the language?",
        "كيف أغيّر اللغة؟",
      ),
      tr(
        "Utilisez le sélecteur FR, EN ou AR dans l’en-tête ou les paramètres.",
        "Use the FR, EN or AR selector in the header or settings.",
        "استخدم محدد FR أو EN أو AR في الرأس أو الإعدادات.",
      ),
    ),
    item(
      tr(
        "L’arabe s’affiche-t-il de droite à gauche ?",
        "Does Arabic display right-to-left?",
        "هل تظهر العربية من اليمين إلى اليسار؟",
      ),
      tr(
        "Oui. L’interface passe automatiquement en RTL lorsque l’arabe est sélectionné.",
        "Yes. The interface automatically switches to RTL when Arabic is selected.",
        "نعم، تتحول الواجهة تلقائياً إلى اتجاه من اليمين لليسار عند اختيار العربية.",
      ),
    ),
    item(
      tr(
        "La langue de mon profil peut-elle être différente ?",
        "Can my profile language be different?",
        "هل يمكن أن تختلف لغة ملفي؟",
      ),
      tr(
        "Votre préférence est enregistrée dans les paramètres et peut être modifiée à tout moment.",
        "Your preference is saved in settings and can be changed at any time.",
        "يتم حفظ تفضيلك في الإعدادات ويمكن تغييره في أي وقت.",
      ),
    ),
    item(
      tr(
        "Pourquoi un texte reste dans une autre langue ?",
        "Why is some text still in another language?",
        "لماذا يبقى نص بلغة أخرى؟",
      ),
      tr(
        "Actualisez la page après le changement. Si le problème persiste, signalez la page et le texte au support.",
        "Refresh after changing language. If it persists, report the page and text to support.",
        "حدّث الصفحة بعد تغيير اللغة، وإن استمر فأبلغ الدعم بالصفحة والنص.",
      ),
    ),
  ],
  support: [
    item(
      tr(
        "Comment contacter le support ?",
        "How do I contact support?",
        "كيف أتواصل مع الدعم؟",
      ),
      tr(
        "Consultez d’abord la FAQ puis utilisez le contact de support indiqué par Workcrute.",
        "Check the FAQ first, then use the support contact provided by Workcrute.",
        "راجع الأسئلة أولاً ثم استخدم وسيلة الدعم التي يوفرها Workcrute.",
      ),
    ),
    item(
      tr(
        "Quelles informations envoyer au support ?",
        "What information should I send support?",
        "ما المعلومات التي أرسلها للدعم؟",
      ),
      tr(
        "Indiquez la page, l’action, l’heure, votre rôle et le message d’erreur, sans mot de passe ni document confidentiel.",
        "Provide the page, action, time, role and error message, without passwords or confidential documents.",
        "اذكر الصفحة والإجراء والوقت والدور ورسالة الخطأ دون كلمات مرور أو وثائق سرية.",
      ),
    ),
    item(
      tr(
        "Quel est le délai de réponse du support ?",
        "What is the support response time?",
        "ما مدة رد الدعم؟",
      ),
      tr(
        "Le délai dépend de la priorité et du volume de demandes. Les incidents de sécurité sont traités en priorité.",
        "It depends on priority and request volume. Security incidents are prioritised.",
        "تعتمد المدة على الأولوية وحجم الطلبات، وتعالج الحوادث الأمنية أولاً.",
      ),
    ),
    item(
      tr(
        "Comment signaler une offre suspecte ?",
        "How do I report a suspicious job?",
        "كيف أبلغ عن وظيفة مشبوهة؟",
      ),
      tr(
        "Transmettez au support l’identifiant ou le lien de l’offre et expliquez le motif du signalement.",
        "Send support the job ID or link and explain why it is suspicious.",
        "أرسل للدعم معرف الوظيفة أو رابطها واشرح سبب الاشتباه.",
      ),
    ),
    item(
      tr(
        "Le support peut-il modifier ma candidature ?",
        "Can support edit my application?",
        "هل يمكن للدعم تعديل طلبي؟",
      ),
      tr(
        "Le support ne modifie pas une décision de recrutement. Il peut aider sur un problème technique ou d’accès.",
        "Support does not change recruitment decisions. It can help with technical or access issues.",
        "لا يغيّر الدعم قرارات التوظيف، لكنه يساعد في مشاكل التقنية أو الوصول.",
      ),
    ),
  ],
  technical: [
    item(
      tr(
        "La page ne se charge pas, que faire ?",
        "The page will not load. What should I do?",
        "الصفحة لا تُحمّل، ماذا أفعل؟",
      ),
      tr(
        "Vérifiez votre connexion, actualisez une fois puis réessayez dans une fenêtre privée si nécessaire.",
        "Check your connection, refresh once, then try a private window if needed.",
        "تحقق من الاتصال وحدّث مرة ثم جرّب نافذة خاصة عند الحاجة.",
      ),
    ),
    item(
      tr(
        "Un bouton ne répond pas.",
        "A button is not responding.",
        "زر لا يستجيب.",
      ),
      tr(
        "Attendez la fin du chargement, vérifiez les champs obligatoires et évitez de cliquer plusieurs fois.",
        "Wait for loading to finish, check required fields and avoid repeated clicks.",
        "انتظر انتهاء التحميل وتحقق من الحقول المطلوبة وتجنب النقر المتكرر.",
      ),
    ),
    item(
      tr(
        "Pourquoi vois-je une erreur serveur ?",
        "Why do I see a server error?",
        "لماذا أرى خطأ في الخادم؟",
      ),
      tr(
        "Réessayez plus tard et signalez l’heure, la page et l’action si l’erreur persiste.",
        "Try again later and report the time, page and action if it persists.",
        "أعد المحاولة لاحقاً وأبلغ عن الوقت والصفحة والإجراء إذا استمر الخطأ.",
      ),
    ),
    item(
      tr(
        "Le site déborde horizontalement sur mobile.",
        "The site scrolls horizontally on mobile.",
        "الموقع يتمدد أفقياً على الهاتف.",
      ),
      tr(
        "Actualisez après avoir remis le zoom à 100 %. Si le problème continue, indiquez votre appareil et la page au support.",
        "Reset zoom to 100% and refresh. If it continues, report your device and page to support.",
        "أعد التكبير إلى 100٪ وحدّث، وإن استمر فأبلغ الدعم بالجهاز والصفحة.",
      ),
    ),
    item(
      tr(
        "Quels navigateurs sont recommandés ?",
        "Which browsers are recommended?",
        "ما المتصفحات الموصى بها؟",
      ),
      tr(
        "Utilisez une version récente de Chrome, Edge, Firefox ou Safari avec JavaScript et cookies activés.",
        "Use a recent Chrome, Edge, Firefox or Safari with JavaScript and cookies enabled.",
        "استخدم إصداراً حديثاً من Chrome أو Edge أو Firefox أو Safari مع تفعيل JavaScript وملفات الارتباط.",
      ),
    ),
  ],
};

export const FAQ_CATALOG = Object.entries(categories).flatMap(
  ([category, entries]) =>
    entries.map((entry, index) => ({
      id: `faq-${category}-${index + 1}`,
      category,
      question_fr: entry.q.fr,
      answer_fr: entry.a.fr,
      question_en: entry.q.en,
      answer_en: entry.a.en,
      question_ar: entry.q.ar,
      answer_ar: entry.a.ar,
      keywords_fr: [
        ...entry.keywords,
        ...entry.q.fr
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 3),
      ].slice(0, 12),
      keywords_en: [
        ...entry.keywords,
        ...entry.q.en
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 3),
      ].slice(0, 12),
      keywords_ar: [
        ...entry.keywords,
        ...entry.q.ar.split(/\s+/).filter((word) => word.length > 2),
      ].slice(0, 12),
      priority: 100 - index,
      is_active: true,
    })),
);
