# Inventaire technique Workcrute

Ce document complète le [guide technique](TECHNICAL_GUIDE.md). Il décrit l’état du dépôt au moment de la livraison documentaire.

## Stack active

- Frontend : HTML, CSS et JavaScript natifs dans `public/`.
- Backend : Cloudflare Worker dans `src/index.js`.
- Base : Cloudflare D1, avec migrations versionnées dans `migrations/`.
- Documents : stockage privé en fragments D1 (`documents` et `document_chunks`) ; un binding objet `DOCUMENTS` peut être utilisé si la configuration de déploiement le prévoit.
- Authentification : sessions serveur opaques et cookies `HttpOnly`, `Secure` en production et `SameSite`.
- Emails : binding serveur `EMAIL.send` ou fournisseur compatible configuré avec `EMAIL_PROVIDER_API_KEY` et `EMAIL_FROM`.
- Langues : français, anglais et arabe, avec direction RTL pour l’arabe.
- Déploiement : Wrangler pour le Worker et Cloudflare Pages pour le contenu de `public/`.

## Zones fonctionnelles

- Public : accueil, offres, détail d’offre, candidats, recruteurs, aide/FAQ, authentification et inscriptions.
- Candidat : tableau de bord, profil, documents, offres, favoris, alertes, candidatures, entretiens, notifications et paramètres.
- Recruteur : tableau de bord, entreprise, offres, questionnaires, candidatures, pipeline, candidats, entretiens, notifications et paramètres.
- Administration : authentification à deux niveaux, contrôle système, activité, gestion métier, questionnaires, FAQ, emails, erreurs, sécurité et paramètres.

## Données principales

Les migrations couvrent notamment les utilisateurs, profils, entreprises, offres, candidatures, entretiens, documents, alertes, favoris, notifications, questionnaires, FAQ, paramètres, erreurs, sessions et journaux d’audit.

## Principes de sécurité

- Aucun secret n’est versionné dans le dépôt.
- Les droits sont contrôlés côté serveur selon le rôle.
- Les documents privés ne sont pas publiés dans `public/`.
- Les erreurs de production utilisent une référence de requête et n’exposent pas de stacktrace au navigateur.
- Les actions administratives sensibles sont auditées.

## Points à vérifier à chaque environnement

- les bindings D1, Pages et Worker ;
- les secrets d’authentification et d’email ;
- l’adresse administrative principale ;
- les migrations appliquées ;
- les règles de domaine et HTTPS ;
- les sauvegardes D1 et la restauration testée ;
- le fonctionnement du bouton d’email de test.

Les valeurs et procédures sont détaillées dans [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md) et [HANDOVER.md](HANDOVER.md).
