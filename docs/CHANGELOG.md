# Changelog Workcrute

## 2026-08 — Livraison de la plateforme complète

### Public

- Refonte du design system, de l’accueil, des offres, des fiches offre et des parcours d’authentification.
- Interface responsive de 320 à 1920 px.
- Traductions FR/EN/AR et prise en charge RTL.
- Centre d’aide et chatbot sans réponse inventée.
- États loading, vide, erreur, hors ligne et session expirée.

### Candidat

- Nouveau layout desktop, tablette et mobile.
- Tableau de bord avec statistiques réelles et complétude du profil.
- Profil, disponibilité détaillée, compétences, expérience, formation et langues.
- Gestion de plusieurs documents et du CV principal.
- Recherche, favoris, alertes, candidatures, timeline, notifications et entretiens.
- Matching déterministe affiché uniquement avec des données comparables suffisantes.

### Recruteur

- Espace professionnel distinct du candidat.
- Dashboard, entreprise, offres et wizard de publication en six étapes.
- Brouillons, autosave, aperçu, modification et duplication d’offres.
- Questionnaires, recherche candidats, profils détaillés et notes internes.
- Pipeline liste/Kanban avec mise à jour réelle du statut.
- Création, modification, confirmation et annulation d’entretiens.

### Administration

- Workcrute Control Center avec layout responsive et recherche globale.
- Authentification successive à deux secrets, sessions sécurisées, expiration et rate limiting.
- Rotation des secrets et confirmation de l’email administratif.
- Dashboard système, statistiques du jour et activité incrémentale.
- CRUD candidats, recruteurs, entreprises, offres, candidatures et entretiens.
- Journal d’audit avant/après pour les actions sensibles.
- Questionnaire Builder trilingue avec choix, validation, poids, conditions et modèles.
- Administration de plus de 100 FAQ, analytics et questions non comprises.
- Paramètres généraux, inscriptions, documents, offres, candidatures, entretiens, matching, chatbot, emails et maintenance.

### Emails, erreurs et stockage

- File d’emails administratifs avec retries et alertes d’échec.
- Récapitulatifs PDF/CSV sans secrets ni CV original.
- Centre d’erreurs avec Request ID, sévérité, service, statut et notes.
- Contrat d’erreur backend centralisé sans stacktrace en production.
- Stockage privé des documents dans D1 par morceaux, avec binding objet optionnel.

### Qualité et livraison

- Tests d’intégration de la sécurité, du monitoring, des CRUD, des questionnaires, du chatbot, des emails, des erreurs, des paramètres et des documents.
- Passe finale sur les routes publiques et les traductions.
- Déploiements Cloudflare Worker et Pages.
- Guides utilisateur, administrateur, technique et de livraison ajoutés.

## 2026-08 — Fondation publique

- Mise en place du design system Workcrute.
- Première couche i18n FR/EN/AR et RTL.
- Refonte des pages publiques et authentification.
- Routage `/api/*` prioritaire vers le Worker.
