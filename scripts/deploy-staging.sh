#!/bin/bash

# Script de déploiement pour l'environnement staging
# Corrige la structure de base de données et démarre les services

set -e

echo "🚀 Déploiement Staging - Airhost"
echo "=================================="

# 1. Vérifier que les variables d'environnement staging sont disponibles
if [ ! -f ".env.staging" ]; then
    echo "❌ Fichier .env.staging manquant"
    exit 1
fi

echo "✅ Configuration staging trouvée"

# 2. Copier les variables d'environnement staging
cp .env.staging .env
echo "📋 Variables d'environnement staging activées"

# 3. Exécuter le script de correction de schéma sur staging
echo "🔧 Correction du schéma de base de données staging..."
echo "Veuillez exécuter ce SQL dans l'éditeur Supabase staging:"
echo ""
echo "=========== SQL À EXÉCUTER ==========="
cat scripts/fix-staging-schema.sql
echo "======================================"
echo ""

# 4. Vérifier la structure après correction
echo "🔍 Vérification de la structure staging..."
node scripts/check-staging-tables.js

echo ""
echo "📋 Prochaines étapes manuelles:"
echo "1. Copier le SQL ci-dessus dans l'éditeur SQL de votre instance staging"
echo "2. Exécuter le script SQL"
echo "3. Vérifier que la migration s'est bien passée"
echo "4. Redémarrer les services staging avec: npm run staging"
echo ""
echo "URL staging: https://tornfqtvnzkgnwfudxdb.supabase.co"
echo "✅ Script de déploiement staging terminé"