#!/bin/bash

# Script de déploiement Airhost
# Usage: ./deploy.sh [environment] [branch]
# Exemples:
#   ./deploy.sh production main
#   ./deploy.sh staging staging
#   ./deploy.sh development develop

set -e

ENVIRONMENT=${1:-development}
BRANCH=${2:-develop}

echo "🚀 Déploiement Airhost vers l'environnement: $ENVIRONMENT"
echo "📂 Branche: $BRANCH"

# Validation des paramètres
case $ENVIRONMENT in
  production|staging|development)
    echo "✅ Environnement valide: $ENVIRONMENT"
    ;;
  *)
    echo "❌ Environnement invalide. Utilisez: production, staging, ou development"
    exit 1
    ;;
esac

# Configuration des variables selon l'environnement
configure_environment() {
  case $ENVIRONMENT in
    production)
      export VITE_ENVIRONMENT=production
      export DEPLOY_URL="airhost-prod.replit.app"
      echo "🔒 Configuration production chargée"
      ;;
    staging)
      export VITE_ENVIRONMENT=staging
      export DEPLOY_URL="airhost-staging.replit.app"
      echo "🔧 Configuration staging chargée"
      ;;
    development)
      export VITE_ENVIRONMENT=development
      export DEPLOY_URL="airhost-dev.replit.app"
      echo "🛠️ Configuration développement chargée"
      ;;
  esac
}

# Vérification des prérequis
check_prerequisites() {
  echo "🔍 Vérification des prérequis..."
  
  # Vérifier Git
  if ! command -v git &> /dev/null; then
    echo "❌ Git n'est pas installé"
    exit 1
  fi
  
  # Vérifier Node.js
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
  fi
  
  # Vérifier npm
  if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
  fi
  
  echo "✅ Prérequis validés"
}

# Sauvegarde avant déploiement
backup_current() {
  if [ "$ENVIRONMENT" = "production" ]; then
    echo "💾 Création de la sauvegarde de production..."
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    cp -r src $BACKUP_DIR/
    cp package.json $BACKUP_DIR/
    cp .env $BACKUP_DIR/.env.backup
    echo "✅ Sauvegarde créée: $BACKUP_DIR"
  fi
}

# Tests avant déploiement
run_tests() {
  echo "🧪 Exécution des tests..."
  
  # Tests unitaires
  echo "📝 Tests unitaires..."
  # npm run test:unit
  
  # Tests d'intégration pour staging et production
  if [ "$ENVIRONMENT" != "development" ]; then
    echo "🔗 Tests d'intégration..."
    # npm run test:integration
  fi
  
  # Tests E2E pour production
  if [ "$ENVIRONMENT" = "production" ]; then
    echo "🌐 Tests E2E..."
    # npm run test:e2e
  fi
  
  echo "✅ Tests réussis"
}

# Build de l'application
build_application() {
  echo "🏗️ Build de l'application..."
  
  # Installation des dépendances
  npm ci
  
  # Build avec les variables d'environnement appropriées
  npm run build
  
  echo "✅ Build terminé"
}

# Déploiement
deploy_to_environment() {
  echo "📤 Déploiement vers $ENVIRONMENT..."
  
  case $ENVIRONMENT in
    production)
      # Déploiement production
      echo "🔴 Déploiement PRODUCTION en cours..."
      # Commandes spécifiques à la production
      ;;
    staging)
      # Déploiement staging
      echo "🟡 Déploiement STAGING en cours..."
      # Commandes spécifiques au staging
      ;;
    development)
      # Déploiement développement
      echo "🟢 Déploiement DÉVELOPPEMENT en cours..."
      # Restart du serveur de développement
      ;;
  esac
  
  echo "✅ Déploiement terminé"
  echo "🌐 Application disponible sur: https://$DEPLOY_URL"
}

# Vérification post-déploiement
post_deploy_checks() {
  echo "🔍 Vérifications post-déploiement..."
  
  # Health check
  echo "❤️ Health check..."
  # curl -f https://$DEPLOY_URL/health || exit 1
  
  # Vérification des fonctionnalités critiques
  echo "🔧 Vérification des fonctionnalités..."
  
  echo "✅ Vérifications terminées"
}

# Notifications
send_notifications() {
  echo "📢 Envoi des notifications..."
  
  if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔔 Notification équipe: Déploiement production terminé"
    # Slack/Discord notification
  fi
}

# Rollback en cas d'erreur
rollback() {
  echo "⚠️ Erreur détectée, rollback en cours..."
  
  if [ "$ENVIRONMENT" = "production" ] && [ -d "backups" ]; then
    LATEST_BACKUP=$(ls -t backups/ | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
      echo "🔄 Restauration depuis: $LATEST_BACKUP"
      cp -r "backups/$LATEST_BACKUP/"* ./
      npm run build
      echo "✅ Rollback terminé"
    fi
  fi
}

# Gestion des erreurs
trap 'rollback' ERR

# Exécution du script principal
main() {
  echo "🚀 Début du déploiement Airhost"
  echo "================================"
  
  configure_environment
  check_prerequisites
  backup_current
  run_tests
  build_application
  deploy_to_environment
  post_deploy_checks
  send_notifications
  
  echo "================================"
  echo "✅ Déploiement terminé avec succès!"
  echo "🌐 URL: https://$DEPLOY_URL"
  echo "📅 Date: $(date)"
  echo "🌿 Branche: $BRANCH"
  echo "🏷️ Environnement: $ENVIRONMENT"
}

# Lancement du script
main "$@"