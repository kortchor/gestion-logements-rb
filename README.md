# Gestion Logements RB

Application Next.js de gestion de logements collaborateurs (logements, lits, baux, signalements, notifications, administration).

## Stack technique

- Next.js 16 (App Router) + React + TypeScript
- PostgreSQL (Neon en cible) via `pg`
- Cloudinary (photos / fichiers)
- SMTP (Mailtrap compatible)
- Signature electronique optionnelle (Yousign)

## Prerequis

- Node.js 20+
- Base PostgreSQL accessible
- Variables d'environnement configurees (voir `.env.example`)

## Lancement local

```bash
npm install
npm run dev
```

## Verification qualite

```bash
npm run lint
npm run build
```

## Scripts metier utiles

```bash
npm run verify:monthly-cost
npm run test:dashboard-monthly-cost
npm run test:logements-disponibles
npm run lits:reconcile
```

## Deploiement

- Guide operationnel: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Cadrage services externes: [CAHIER_DES_CHARGES_SERVICES_EXTERNES.md](CAHIER_DES_CHARGES_SERVICES_EXTERNES.md)
- Documentation technique + notice: [DOCUMENTATION_TECHNIQUE_ET_NOTICE_UTILISATION.md](DOCUMENTATION_TECHNIQUE_ET_NOTICE_UTILISATION.md)

## Notes d'exploitation

- Profil de charge cible: faible a modere (3 super admins, 100 utilisateurs lecture majoritaire).
- Surveillance prioritaire des couts: Neon (compute/egress), puis Vercel.
- Mailtrap gratuit possible si volume email < 1000/mois.
