# Documentation technique et notice d'utilisation

Date: 2026-08-07  
Projet: gestion-logements-rb

## 1. Objet du document

Ce document regroupe:
- la documentation technique de l'application,
- la notice d'utilisation pour les profils metier.

Il remplace les documents de suivi historiques et sert de reference unique d'exploitation.

---

## 2. Vue technique

## 2.1 Architecture

- Frontend: Next.js App Router (React + TypeScript)
- Backend: routes API Next.js (Node runtime)
- Base de donnees: PostgreSQL (Neon en cible)
- Fichiers/media: Cloudinary
- Email transactionnel: SMTP (Mailtrap compatible)
- Signature electronique: Yousign (optionnel)

Flux principal:
1. L'utilisateur se connecte a l'application.
2. Le frontend appelle les routes API.
3. Les API lisent/ecrivent en PostgreSQL.
4. Les photos sont stockees/servies via Cloudinary.
5. Les emails transactionnels partent via SMTP.

## 2.2 Structure fonctionnelle (dossiers)

- app: pages et routes API
- lib: utilitaires metier (db, auth, email, validation, logs)
- scripts: scripts de verification/migration/maintenance
- public: assets statiques
- types: types de donnees partages

## 2.3 Securite et acces

- Authentification via token/cookie
- Autorisations par role (super_admin, admin, user, admin_readonly)
- Protection CSRF sur routes d'ecriture
- Journalisation applicative cote serveur

## 2.4 Performance (etat actuel)

- Pagination active sur endpoints volumineux
- Reduction des payloads et suppression des `SELECT *` cote API
- Endpoint dashboard agrege pour limiter les appels
- Optimisations SQL et index sur routes critiques

## 2.5 Variables d'environnement critiques

- DATABASE_URL
- JWT_SECRET
- NEXTAUTH_URL
- INIT_SECRET_KEY
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_USER
- EMAIL_PASSWORD
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- (optionnel) YOUSIGN_API_KEY, YOUSIGN_WORKSPACE_ID, YOUSIGN_ENVIRONMENT

## 2.6 Commandes d'exploitation

```bash
npm run dev
npm run lint
npm run build
npm run verify:monthly-cost
npm run lits:reconcile
```

---

## 3. Notice d'utilisation (metier)

## 3.1 Profils et droits

- Super admin:
  - creation/modification de donnees,
  - administration globale,
  - acces aux ecrans de pilotage.
- Utilisateur:
  - consultation des logements,
  - consultation photos et dates de contrat,
  - creation de signalement (selon habilitation).

## 3.2 Parcours principal super admin

1. Se connecter.
2. Creer/mettre a jour logements, chambres, lits.
3. Assigner les collaborateurs.
4. Verifier baux et notifications.
5. Suivre les indicateurs dashboard.

## 3.3 Parcours principal utilisateur

1. Se connecter.
2. Consulter l'adresse du logement.
3. Consulter les photos d'etat des lieux.
4. Consulter les dates de contrat.
5. Soumettre un signalement si necessaire.

## 3.4 Regles de donnees (votre contexte)

- 53 logements: base de reference stable sur l'annee.
- Donnees assurances/baux: saisies initiales puis mises a jour ponctuelles.
- Photos etat des lieux: modifications occasionnelles.

---

## 4. Exploitation et services externes

## 4.1 Decision de service (profil faible flux)

- Vercel: Hobby acceptable a court terme avec suivi mensuel.
- Neon: premier service susceptible de devenir payant selon compute/egress.
- Cloudinary: gratuit possible au demarrage (usage photo modere).
- Mailtrap: gratuit possible si volume < 1000 emails/mois.
- Yousign: activation a la demande metier.

## 4.2 Check mensuel recommande

- Vercel: invocations, CPU, transfer
- Neon: compute, egress, stockage
- SMTP: volume email reel
- Qualite applicative: erreurs runtime / latence

---

## 5. Procedure incidents (condensee)

1. Identifier l'impact (auth, API, DB, media, email).
2. Verifier logs serveur et route concernee.
3. Tester endpoint API en isolation.
4. Verifier connectivite DB et quotas service externe.
5. Appliquer rollback ou correction ciblee.
6. Documenter incident et action corrective.

---

## 6. Maintenance et gouvernance

- Revue mensuelle des couts et performances.
- Revue trimestrielle des acces et roles.
- Revue semestrielle des dependances npm et securite.
- Conservation d'un document unique (celui-ci) pour limiter la dispersion.

---

## 7. Annexes documentaires

- Cadrage services externes: [CAHIER_DES_CHARGES_SERVICES_EXTERNES.md](CAHIER_DES_CHARGES_SERVICES_EXTERNES.md)
- Deploiement: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Integration Yousign: [YOUSIGN_SETUP.md](YOUSIGN_SETUP.md)
