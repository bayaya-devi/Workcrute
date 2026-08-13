PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO admin_template_questions(id,template_id,label_json,description_json,help_json,placeholder_json,question_type,options_json,is_required,weight,is_eliminatory,validation_json,condition_json,sort_order) VALUES
('general-experience','template-general','{"fr":"Combien d’années d’expérience avez-vous ?","en":"How many years of experience do you have?","ar":"كم عدد سنوات الخبرة لديك؟"}','{}','{}','{}','number','[]',1,40,0,'{"min":0,"max":60}','{}',10),
('general-availability','template-general','{"fr":"Êtes-vous disponible à la date prévue ?","en":"Are you available on the planned date?","ar":"هل أنت متاح في التاريخ المحدد؟"}','{}','{}','{}','boolean','[]',1,60,1,'{"expectedValue":true}','{}',20),
('sales-crm','template-sales','{"fr":"Avez-vous déjà utilisé un CRM ?","en":"Have you used a CRM before?","ar":"هل سبق لك استخدام نظام إدارة علاقات العملاء؟"}','{}','{}','{}','boolean','[]',1,100,0,'{"expectedValue":true}','{}',10),
('it-stack','template-it','{"fr":"Quelles technologies maîtrisez-vous ?","en":"Which technologies are you proficient in?","ar":"ما التقنيات التي تتقنها؟"}','{}','{}','{}','long_text','[]',1,0,0,'{"minLength":2}','{}',10),
('logistics-license','template-logistics','{"fr":"Possédez-vous le permis requis pour le poste ?","en":"Do you hold the licence required for the role?","ar":"هل لديك الرخصة المطلوبة للوظيفة؟"}','{}','{}','{}','boolean','[]',1,100,1,'{"expectedValue":true}','{}',10),
('management-team','template-management','{"fr":"Quelle taille d’équipe avez-vous déjà encadrée ?","en":"What team size have you managed before?","ar":"ما حجم الفريق الذي سبق لك إدارته؟"}','{}','{}','{}','number','[]',1,100,0,'{"min":0}','{}',10);
