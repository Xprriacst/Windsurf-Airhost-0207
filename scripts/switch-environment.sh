#!/bin/bash

# Script pour basculer entre les environnements
# Usage: ./switch-environment.sh [staging|production|development]

ENVIRONMENT=${1:-development}

echo "🔄 Basculement vers l'environnement: $ENVIRONMENT"

case $ENVIRONMENT in
  "staging")
    if [ -f ".env.staging" ]; then
      cp .env.staging .env
      echo "✅ Configuration staging activée"
      echo "📡 URL: https://tornfqtvnzkgnwfudxdb.supabase.co"
      echo "🔧 N'oubliez pas d'exécuter la correction SQL pour host_id"
    else
      echo "❌ Fichier .env.staging manquant"
      exit 1
    fi
    ;;
    
  "production")
    if [ -f ".env.production" ]; then
      cp .env.production .env
      echo "✅ Configuration production activée"
      echo "📡 URL: https://pnbfsiicxhckptlgtjoj.supabase.co"
      echo "⚠️  Attention: Environnement de production"
    else
      echo "❌ Fichier .env.production manquant"
      exit 1
    fi
    ;;
    
  "development")
    # Utiliser la configuration par défaut existante
    if [ -f ".env.example" ]; then
      cp .env.example .env
    fi
    echo "✅ Configuration développement activée"
    echo "💻 Mode développement local"
    ;;
    
  *)
    echo "❌ Environnement non reconnu: $ENVIRONMENT"
    echo "Utilisation: $0 [staging|production|development]"
    exit 1
    ;;
esac

echo "🚀 Redémarrez l'application pour appliquer les changements"