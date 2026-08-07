# Cahier des charges services externes (version concise)

Date: 2026-08-07  
Projet: gestion-logements-rb  
Objectif: decision claire sur les services a conserver en gratuit/payant et procedure de souscription minimale.

## 1) Contexte d'usage valide

- 53 logements, donnees de base renseignees majoritairement une seule fois.
- Photos d'etat des lieux modifiees ponctuellement.
- 3 super admins maximum (creation/modification).
- 100 utilisateurs maximum, usage limite (consultation + signalement occasionnel).
- Faible flux global, faible concurrence d'ecriture.

Conclusion de charge: profil leger et stable, avec croissance moderee.

---

## 2) Decision memo par service

## 2.1 Vercel (hebergement Next.js)

Decision:
- Court terme: conserver Hobby.
- Moyen terme: passer Pro uniquement si seuils depasses ou usage devenu critique.

Pourquoi:
- Profil trafic faible.
- API deja optimisees (pagination, reduction payloads, endpoint stats agrege).

Seuils de bascule Pro (si observes 2 mois consecutifs):
- hausse continue invocations API,
- hausse continue transfert sortant,
- alertes de quotas ou ralentissements visibles,
- forte augmentation usages admin (exports/operations en lot),
- extension fonctionnelle augmentant la charge.

Statut actuel recommande: GRATUIT.

---

## 2.2 Neon (PostgreSQL)

Decision:
- Service prioritaire a monitorer pour un passage payant.
- Probable premier service a payer si croissance reelle.

Pourquoi:
- Cout sensible au compute/egress.
- Donnees metier centrales et critiques.

Profil 53 logements:
- volume modere,
- mais Neon reste le point de vigilance principal en cas de hausse d'activite.

Statut actuel recommande: GRATUIT au demarrage, PAYANT des que limites free approchent.

---

## 2.3 Cloudinary (photos/documents)

Decision:
- Conserver gratuit au demarrage.

Pourquoi:
- Base logement stable sur l'annee,
- photos modifiees ponctuellement,
- faible probabilite de gros flux media mensuel.

Statut actuel recommande: GRATUIT.

---

## 2.4 SMTP Mailtrap (emails transactionnels)

Decision:
- Conserver Mailtrap avec plan gratuit au demarrage.

Hypothese metier:
- < 1000 emails/mois.

Pourquoi:
- volume attendu faible,
- usage surtout transactionnel ponctuel.

Statut actuel recommande: GRATUIT.

Configuration code:
- Aucune refonte necessaire.
- Le code supporte deja Mailtrap via fallback SMTP dans [lib/email.ts](lib/email.ts).
- Variables a verifier en production: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD.
- Option de securite test deja prevue: FORCE_MAILTRAP et MAILTRAP_TEST_EMAIL.

---

## 2.5 Yousign / Youtrust (signature)

Decision:
- Garder optionnel, activer seulement pour les parcours qui l'exigent.

Pourquoi:
- Evite du cout inutile si usage signature faible.

Statut actuel recommande: A LA DEMANDE.

---

## 2.6 GitHub (code source + CI/CD)

Decision:
- Conserver.

Pourquoi:
- Necessaire pour versionning, historique et deploiement Vercel.

Statut actuel recommande: EXISTANT (pas de changement requis).

---

## 3) Strategie budget cible

Vision simple:
- Vercel: rester gratuit tant que charge faible.
- Neon: service le plus susceptible de devenir payant en premier.
- Cloudinary + Mailtrap: rester gratuits avec votre profil actuel.
- Yousign: depense uniquement si besoin metier actif.

Priorite budget si depense:
1. Neon
2. Vercel Pro (si seuils depasses)
3. Eventuels upgrades Cloudinary/Mailtrap selon usage reel

---

## 4) Processus de souscription (services payants)

Objectif: souscrire proprement uniquement quand les seuils sont atteints.

## Etape 1 - Validation interne (J0)

- Valider les metriques 60 derniers jours:
  - Vercel: invocations, CPU, transfer,
  - Neon: compute hours, egress, stockage,
  - Mailtrap: emails/mois,
  - Cloudinary: stockage/bande passante.
- Decision officielle: quel service passe en payant et pourquoi.

Livrable: compte-rendu de decision (1 page).

## Etape 2 - Souscription service (J0-J1)

Pour Neon (prioritaire):
- selection du plan (souvent Launch),
- ajout moyen de paiement,
- verification region/projet,
- verification retention/restore selon besoin.

Pour Vercel (si necessaire):
- upgrade vers Pro,
- verification membres projet,
- validation plafond cout interne.

## Etape 3 - Verification technique (J1)

- Controler variables d'environnement en production.
- Executer un test fonctionnel complet:
  - login,
  - consultation logements/photos,
  - creation/modification admin,
  - signalement,
  - envoi email.

Livrable: PV de recette technique.

## Etape 4 - Suivi mensuel (recurrent)

- Revue metriques mensuelle (30 min).
- Verification tendance cout/usage.
- Action corrective si derive.

---

## 5) Decision finale (avec vos precisions)

- Version payante immediate: NON obligatoire.
- Service potentiellement payant en premier: OUI, Neon.
- Mailtrap: OUI, conservation plan gratuit pertinente avec objectif < 1000 emails/mois.
- Vercel Hobby: OUI, acceptable actuellement avec surveillance mensuelle.

Position recommandee a presenter:
- "Le dimensionnement actuel permet un demarrage majoritairement en gratuit. La base Neon est le premier poste susceptible d'evoluer vers un plan payant selon la consommation reelle."
