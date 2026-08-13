# Document de livraison Workcrute

## Accès et URL

- Site public principal : [https://workcrute.pages.dev](https://workcrute.pages.dev)
- API et déploiement Worker : [https://workcrute.aetbconseil.workers.dev](https://workcrute.aetbconseil.workers.dev)
- Administration : [https://workcrute.pages.dev/admin/connexion/](https://workcrute.pages.dev/admin/connexion/)
- Dépôt GitHub : [https://github.com/bayaya-devi/Workcrute](https://github.com/bayaya-devi/Workcrute)

## Hébergement

- Cloudflare Pages pour la publication statique du répertoire `public/`.
- Cloudflare Workers pour l’API, la sécurité et les traitements serveur.
- Cloudflare D1 pour les données relationnelles et le stockage documentaire actif.
- Observabilité Cloudflare activée pour le Worker.

## Domaine

Le domaine actuellement livré est `workcrute.pages.dev`. Aucun domaine personnalisé n’est déclaré dans le dépôt. Si un domaine métier est ajouté, conserver :

- la zone DNS Cloudflare ;
- le certificat TLS automatique ;
- la redirection vers une seule URL canonique ;
- la mise à jour de `APP_ORIGIN`, des liens publics, du sitemap et des règles CORS/origine.

## Stockage

La base D1 `workcrute` contient les comptes, profils, offres, candidatures, événements, paramètres et documents fragmentés. Un binding objet `DOCUMENTS` peut être raccordé ultérieurement pour faire évoluer le stockage sans publier les fichiers.

Les documents doivent rester privés et être servis uniquement après contrôle d’autorisation.

## Email

Le système possède une file d’envoi, des retries, des journaux et un bouton de test. Pour la production, conserver :

- un expéditeur vérifié `EMAIL_FROM` ;
- la clé fournisseur dans les secrets Cloudflare ;
- l’adresse administrative principale vérifiée dans Admin > Paramètres > Emails ;
- les événements et formats de pièces jointes choisis par le client.

Le fournisseur API actuellement pris en charge est Resend ; un binding `EMAIL` peut également être utilisé.

## Fonctionnalités livrées

- site public responsive FR/EN/AR et RTL ;
- comptes candidat et recruteur ;
- profils, documents, offres, favoris, alertes et candidatures ;
- questionnaires, scoring déterministe et logique conditionnelle ;
- pipeline recruteur liste/Kanban et entretiens ;
- intermédiation administrateur : transmission sélective de profils et documents aux recruteurs, historique, notifications et email avec retry ;
- Control Center admin avec double authentification ;
- gestion candidats, recruteurs, entreprises, offres, candidatures et entretiens ;
- dashboard et activité incrémentale ;
- Questionnaire Builder administrable ;
- chatbot basé sur plus de 100 FAQ trilingues ;
- emails administratifs PDF/CSV ;
- gestion centralisée des erreurs et Request IDs ;
- paramètres métier et mode maintenance ;
- audit des actions sensibles.

## Opérations régulières

Chaque semaine :

- consulter les erreurs nouvelles et critiques ;
- contrôler les échecs d’emails ;
- vérifier les alertes de sécurité ;
- traiter les questions chatbot non comprises.

Chaque mois :

- vérifier les comptes suspendus et offres expirées ;
- contrôler les paramètres métier ;
- exporter une sauvegarde D1 ;
- vérifier les accès GitHub et Cloudflare.

Avant chaque déploiement : sauvegarde, tests, dry-run Wrangler, migrations, déploiement Worker puis Pages, et contrôle HTTP des deux URL.

## Maintenance

Le mode maintenance se gère depuis **Admin > Paramètres > Maintenance**. Préparer les messages dans les trois langues avant activation. L’administration reste disponible. Désactiver le mode dès la fin de l’intervention.

Pour une maintenance technique importante : sauvegarder D1, annoncer la fenêtre, activer la maintenance, déployer, tester, surveiller les erreurs puis rouvrir.

## Sauvegarde

Commande de référence :

```powershell
pnpm exec wrangler d1 export workcrute --remote --output tmp/workcrute-backup.sql
```

Le fichier exporté ne doit pas être ajouté à Git. Le placer dans un stockage chiffré avec une politique de conservation définie par le client.

Conserver aussi : dépôt Git, paramètres DNS, configuration Cloudflare, identité de l’expéditeur email et inventaire des secrets. L’inventaire doit contenir les noms des secrets, jamais leurs valeurs.

## Configuration à conserver

- accès propriétaire au compte Cloudflare ;
- accès administrateur au dépôt GitHub ;
- identifiant de la base D1 et projet Pages ;
- secrets `SESSION_PEPPER`, `ADMIN_AUTH_SECRET_1`, `ADMIN_AUTH_SECRET_2` ;
- configuration email et adresse principale vérifiée ;
- branche de production et historique des déploiements ;
- procédure de rotation des secrets ;
- copies chiffrées des sauvegardes ;
- coordonnées du responsable habilité à valider une opération sensible.

Ne jamais placer une valeur secrète dans ce document, un ticket, un commit, une capture d’écran ou un e-mail non chiffré.

## Validation de livraison

- [ ] Le client possède les accès Cloudflare et GitHub.
- [ ] L’adresse email administrative est vérifiée et le test réussit.
- [ ] Les deux secrets admin ont été transmis séparément et changés par le client.
- [ ] Une sauvegarde D1 initiale est archivée.
- [ ] Les inscriptions candidat et recruteur sont configurées.
- [ ] Les règles de documents, offres et candidatures sont validées.
- [ ] Le chatbot, les emails et le centre d’erreurs sont contrôlés.
- [ ] Le client a lu le guide utilisateur et le démarrage rapide admin.
