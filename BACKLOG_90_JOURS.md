# Backlog 90 jours - Gestion Logements

## Cadrage
- Horizon: 90 jours
- Cadence: 6 sprints de 2 semaines
- Echelle estimation: jours-homme
- Priorite: P0 (critique), P1 (important), P2 (amelioration)

## Sprint 1 (J1-J14) - Securite et socle

### T1 - Rotation complete des secrets
- ID: SEC-001
- Priorite: P0
- Estimation: 1.5 j
- Dependances: aucune
- Description: regenerer DATABASE_URL credentials, JWT_SECRET, SMTP, Cloudinary, Yousign; mettre a jour local + Vercel.
- Critere d'acceptation: toutes les integrations fonctionnent avec nouvelles cles, anciennes cles invalidees.

### T2 - Checklist de securite deploiement
- ID: SEC-002
- Priorite: P0
- Estimation: 1 j
- Dependances: SEC-001
- Description: formaliser une checklist pre-prod et prod (variables, droits, backups, rollback).
- Critere d'acceptation: checklist versionnee, utilisee avant chaque mise en prod.

### T3 - Durcissement sessions admin
- ID: AUTH-001
- Priorite: P1
- Estimation: 2 j
- Dependances: aucune
- Description: durcir expiration session admin, deconnexion explicite, messages d'erreur homogenes.
- Critere d'acceptation: session admin expire selon politique definie, aucun bypass detecte.

### T4 - Monitoring erreurs API
- ID: OPS-001
- Priorite: P1
- Estimation: 2 j
- Dependances: aucune
- Description: centraliser erreurs serveur avec alertes (email ou webhook).
- Critere d'acceptation: alerte recue sur erreur critique simulee.

### T5 - Backup + restauration testee
- ID: OPS-002
- Priorite: P0
- Estimation: 2 j
- Dependances: aucune
- Description: automatiser sauvegarde quotidienne et test de restauration mensuel.
- Critere d'acceptation: restoration de test reussie avec preuve de verification.

## Sprint 2 (J15-J28) - Tests critiques et fiabilite

### T6 - Suite E2E parcours critiques
- ID: QA-001
- Priorite: P0
- Estimation: 4 j
- Dependances: aucune
- Description: tests E2E pour assignation, desassignation, photos, signalement, caution, audit.
- Critere d'acceptation: pipeline passe sur 100 pourcent des scenarios critiques.

### T7 - Garde-fous upload media
- ID: MEDIA-001
- Priorite: P1
- Estimation: 2 j
- Dependances: aucune
- Description: limites claires nombre de photos, poids total, formats, messages utilisateur explicites.
- Critere d'acceptation: blocage propre des cas invalides, aucun crash UI/API.

### T8 - Dashboard de sante applicative
- ID: OPS-003
- Priorite: P2
- Estimation: 1.5 j
- Dependances: OPS-001
- Description: page interne de sante (DB, email, cloudinary, taux erreur recent).
- Critere d'acceptation: page accessible aux admins, statuts coherents en temps reel.

## Sprint 3 (J29-J42) - Gouvernance des acces et audit

### T9 - Matrice de permissions par action
- ID: AUTH-002
- Priorite: P1
- Estimation: 2.5 j
- Dependances: AUTH-001
- Description: definir et appliquer droits CRUD/Export par role sur toutes les pages API.
- Critere d'acceptation: tests d'autorisation passent, aucune route sensible ouverte par erreur.

### T10 - Audit trail enrichi
- ID: AUD-001
- Priorite: P1
- Estimation: 3 j
- Dependances: QA-001
- Description: filtres date/utilisateur/action, export CSV, details avant/apres sur champs cles.
- Critere d'acceptation: export exploitable et filtres performants sur volume reel.

### T11 - Journal des actions documents/photos
- ID: AUD-002
- Priorite: P1
- Estimation: 1.5 j
- Dependances: AUD-001
- Description: tracer upload/suppression docs et photos avec utilisateur et horodatage.
- Critere d'acceptation: chaque suppression/upload est visible dans suivi des actions.

## Sprint 4 (J43-J56) - Qualite des donnees et UX productivite

### T12 - Detecteur d'anomalies de donnees
- ID: DATA-001
- Priorite: P1
- Estimation: 3 j
- Dependances: QA-001
- Description: detecter doublons, dates incoherentes, logements incomplets, affectations invalides.
- Critere d'acceptation: rapport d'anomalies genere et actionnable.

### T13 - Centre de correction des anomalies
- ID: DATA-002
- Priorite: P2
- Estimation: 2.5 j
- Dependances: DATA-001
- Description: ecran admin pour corriger anomalies principales avec validations guidees.
- Critere d'acceptation: correction de bout en bout sans SQL manuel.

### T14 - Recherche globale unifiee
- ID: UX-001
- Priorite: P1
- Estimation: 3 j
- Dependances: aucune
- Description: recherche unique collaborateur/logement/bail/lit avec liens directs.
- Critere d'acceptation: resultats pertinents en moins de 500 ms sur dataset courant.

## Sprint 5 (J57-J70) - Reporting metier

### T15 - KPI occupation et couts
- ID: BI-001
- Priorite: P1
- Estimation: 3 j
- Dependances: DATA-001
- Description: taux d'occupation, cout moyen par collaborateur, cout par centre, tendance mensuelle.
- Critere d'acceptation: KPIs valides avec echantillon controle par finance.

### T16 - Exports direction/compta
- ID: BI-002
- Priorite: P1
- Estimation: 2 j
- Dependances: BI-001
- Description: export CSV/XLSX standardise pour direction et comptabilite.
- Critere d'acceptation: fichiers exploitables sans retouche manuelle.

### T17 - Alertes metier fin de bail
- ID: FLOW-001
- Priorite: P2
- Estimation: 2 j
- Dependances: OPS-001
- Description: rappels automatiques a J-60 J-30 J-7 pour fin de bail.
- Critere d'acceptation: notifications envoyees selon regles et journalisees.

## Sprint 6 (J71-J84) - Performance et finalisation

### T18 - Pagination et optimisation listes
- ID: PERF-001
- Priorite: P1
- Estimation: 2.5 j
- Dependances: UX-001
- Description: pagination uniforme + tri serveur + index DB sur pages volumineuses.
- Critere d'acceptation: temps de reponse stable sous charge cible.

### T19 - Cache intelligent dashboard
- ID: PERF-002
- Priorite: P2
- Estimation: 1.5 j
- Dependances: BI-001
- Description: cache court pour widgets couteux avec invalidation simple.
- Critere d'acceptation: chargement dashboard reduit d'au moins 30 pourcent.

### T20 - Revue finale et plan phase suivante
- ID: GOV-001
- Priorite: P1
- Estimation: 2 j
- Dependances: toutes
- Description: audit final, dette technique restante, plan des 90 jours suivants.
- Critere d'acceptation: rapport final partage et valide en comite projet.

## Buffer (J85-J90)
- Reserve: correction bugs, retards, ajustements metier.
- Regle: prioriser P0 puis P1.

## Definition of Done
- Code review validee
- Tests unitaires et E2E verts
- Build production vert
- Changelog mis a jour
- Documentation utilisateur/admin mise a jour
- Trace audit si action sensible

## KPIs de pilotage mensuel
- Temps moyen pour une operation RH
- Taux d'erreurs de saisie
- Temps de chargement pages critiques
- Incidents critiques en production
- Couverture tests parcours critiques

## Demarrage recommande
- Semaine 1: SEC-001, SEC-002, OPS-002
- Semaine 2: QA-001, AUTH-001
