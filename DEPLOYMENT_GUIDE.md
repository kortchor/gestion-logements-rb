# 🚀 Guide de déploiement Vercel

## Étapes de déploiement

### 1. Push du code sur GitHub (main)
```bash
git add .
git commit -m "feat: Ajout des champs de dates et auto-création des lits pour logements"
git push origin main
```

### 2. Attendre le déploiement Vercel
- Vercel déploiera automatiquement la dernière version de `main`
- Vérifier le statut sur: https://vercel.com/dashboard

### 3. Exécuter les migrations de base de données 🔴 **IMPORTANT**

Après le déploiement, il faut exécuter l'endpoint de migration pour ajouter les colonnes manquantes à la base de données de production :

```bash
# Obtenir la clé secrète depuis les variables d'environnement Vercel
# Ensuite exécuter:
curl -X POST https://gestion-logements-rb.vercel.app/api/init/migrate \
  -H "Authorization: Bearer YOUR_INIT_SECRET_KEY" \
  -H "Content-Type: application/json"
```

### 4. Vérifier le déploiement
```bash
# Tester la création d'un nouveau logement avec dates
curl -X POST https://gestion-logements-rb.vercel.app/api/logements \
  -H "Content-Type: application/json" \
  -d '{
    "nom_logement": "Test Déploiement",
    "adresse": "123 Test Street",
    "ville": "Test City",
    "prix_loyer": 1000,
    "date_debut_contrat": "2025-01-01",
    "date_fin_contrat": "2026-12-31",
    "chambres": []
  }'

# Tester les coûts mensuels
curl https://gestion-logements-rb.vercel.app/api/logements/monthly-cost?year=2025&month=1
```

## Changements déployés

✅ Ajout des champs `date_debut_contrat` et `date_fin_contrat` au formulaire
✅ Auto-création des chambres et lits lors de la création d'un logement
✅ Endpoint monthly-cost corrigé pour afficher tous les logements actifs
✅ Documentation complète dans CORRECTIONS_APPLIQUEES.md

## Variables d'environnement requises

Vérifier que ces variables existent dans Vercel :
- `DATABASE_URL` - Chaîne de connexion PostgreSQL
- `INIT_SECRET_KEY` - Clé secrète pour les endpoints d'initialisation

## Notes importantes

⚠️ La migration de base de données doit être exécutée **après** le déploiement initial
⚠️ L'endpoint `/api/init/migrate` est protégé par `INIT_SECRET_KEY`
⚠️ Assurez-vous que la clé secrète est définie dans les variables d'environnement Vercel

## En cas de problème

1. Vérifier les logs Vercel: https://vercel.com/dashboard
2. Vérifier la base de données de production
3. S'assurer que `INIT_SECRET_KEY` est correctement définie
4. Relancer la migration si nécessaire
