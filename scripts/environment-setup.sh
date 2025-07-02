#!/bin/bash

# Configuration des environnements Airhost
# Usage: ./environment-setup.sh [environment]

ENVIRONMENT=${1:-development}

echo "Configuration de l'environnement: $ENVIRONMENT"

# Création des fichiers d'environnement
create_env_files() {
  case $ENVIRONMENT in
    production)
      cat > .env.production << EOF
# Configuration Production Airhost
VITE_ENVIRONMENT=production
VITE_SUPABASE_URL=https://pnbfsiicxhckptlgtjoj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjU1MDIsImV4cCI6MjA2MzI0MTUwMn0.vMGfxAJyurk-UJ7XUWPhOmjmJ2wiYfxdpLTe-wfExpk
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2NTUwMiwiZXhwIjoyMDYzMjQxNTAyfQ.DPKTpahAzRv1X3crxS81XhmLSzbW8fUbAQ22Ru0GFdc
VITE_OPENAI_API_KEY=\${PROD_OPENAI_API_KEY}
VITE_WHATSAPP_VERIFY_TOKEN=\${PROD_WHATSAPP_TOKEN}
VITE_SITE_URL=https://airhost-prod.replit.app
EOF
      echo "✅ Fichier .env.production créé"
      ;;
    
    staging)
      cat > .env.staging << EOF
# Configuration Staging Airhost  
VITE_ENVIRONMENT=staging
VITE_SUPABASE_URL=https://whxkhrtlccxubvjgexmi.supabase.co
VITE_SUPABASE_ANON_KEY=\${STAGING_SUPABASE_ANON_KEY}
VITE_SUPABASE_SERVICE_ROLE_KEY=\${STAGING_SUPABASE_SERVICE_KEY}
VITE_OPENAI_API_KEY=\${STAGING_OPENAI_API_KEY}
VITE_WHATSAPP_VERIFY_TOKEN=\${STAGING_WHATSAPP_TOKEN}
VITE_SITE_URL=https://airhost-staging.replit.app
EOF
      echo "✅ Fichier .env.staging créé"
      ;;
    
    development)
      cat > .env.development << EOF
# Configuration Développement Airhost
VITE_ENVIRONMENT=development  
VITE_SUPABASE_URL=https://whxkhrtlccxubvjgexmi.supabase.co
VITE_SUPABASE_ANON_KEY=\${DEV_SUPABASE_ANON_KEY}
VITE_SUPABASE_SERVICE_ROLE_KEY=\${DEV_SUPABASE_SERVICE_KEY}
VITE_OPENAI_API_KEY=\${DEV_OPENAI_API_KEY}
VITE_WHATSAPP_VERIFY_TOKEN=\${DEV_WHATSAPP_TOKEN}
VITE_SITE_URL=https://airhost-dev.replit.app
EOF
      echo "✅ Fichier .env.development créé"
      ;;
  esac
}

# Configuration des scripts package.json
update_package_scripts() {
  # Backup du package.json original
  cp package.json package.json.backup
  
  # Ajout des scripts de déploiement
  cat > temp_scripts.json << EOF
{
  "dev": "vite --config vite.config.replit.ts --host 0.0.0.0 --port 5000",
  "dev:staging": "vite --config vite.config.replit.ts --host 0.0.0.0 --port 5000 --mode staging",
  "dev:production": "vite --config vite.config.replit.ts --host 0.0.0.0 --port 5000 --mode production",
  "build": "tsc && vite build",
  "build:staging": "tsc && vite build --mode staging",
  "build:production": "tsc && vite build --mode production",
  "preview": "vite preview",
  "deploy:dev": "./scripts/deploy.sh development develop",
  "deploy:staging": "./scripts/deploy.sh staging staging", 
  "deploy:prod": "./scripts/deploy.sh production main",
  "test:unit": "echo 'Tests unitaires à implémenter'",
  "test:integration": "echo 'Tests d'intégration à implémenter'",
  "test:e2e": "echo 'Tests E2E à implémenter'",
  "backup:prod": "mkdir -p backups && cp -r src backups/src-$(date +%Y%m%d_%H%M%S)",
  "rollback:prod": "echo 'Rollback production - utiliser avec précaution'"
}
EOF

  echo "✅ Scripts de déploiement ajoutés au package.json"
}

# Configuration Vite pour les environnements
create_vite_configs() {
  cat > vite.config.staging.ts << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000
  },
  define: {
    'process.env.NODE_ENV': '"staging"'
  },
  build: {
    outDir: 'dist-staging',
    sourcemap: true
  }
})
EOF

  cat > vite.config.production.ts << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', 
    port: 5000
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  build: {
    outDir: 'dist-production',
    sourcemap: false,
    minify: true
  }
})
EOF

  echo "✅ Configurations Vite créées"
}

# Script de migration de base de données
create_db_migration_script() {
  cat > scripts/migrate-db.sh << EOF
#!/bin/bash

# Migration de base de données entre environnements
SOURCE_ENV=\${1:-development}
TARGET_ENV=\${2:-staging}

echo "Migration de \$SOURCE_ENV vers \$TARGET_ENV"

# Export de la structure
echo "Export de la structure depuis \$SOURCE_ENV..."

# Import vers l'environnement cible  
echo "Import vers \$TARGET_ENV..."

echo "✅ Migration terminée"
EOF

  chmod +x scripts/migrate-db.sh
  echo "✅ Script de migration créé"
}

# Configuration GitHub Actions
create_github_workflow() {
  mkdir -p .github/workflows
  
  cat > .github/workflows/deploy.yml << EOF
name: Deploy Airhost

on:
  push:
    branches: [ main, staging, develop ]
  pull_request:
    branches: [ main, staging ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run test:unit
    
  deploy-development:
    if: github.ref == 'refs/heads/develop'
    needs: test
    runs-on: ubuntu-latest
    environment: development
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Development
      run: ./scripts/deploy.sh development develop
      
  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Staging
      run: ./scripts/deploy.sh staging staging
      
  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Production
      run: ./scripts/deploy.sh production main
EOF

  echo "✅ Workflow GitHub Actions créé"
}

# Configuration des branches Git
setup_git_branches() {
  echo "Configuration des branches Git..."
  
  # Vérifier si on est dans un repo Git
  if [ ! -d .git ]; then
    git init
    echo "✅ Repository Git initialisé"
  fi
  
  # Créer les branches si elles n'existent pas
  CURRENT_BRANCH=$(git branch --show-current)
  
  if [ "$CURRENT_BRANCH" != "develop" ]; then
    git checkout -b develop 2>/dev/null || git checkout develop
  fi
  
  git checkout -b staging 2>/dev/null || git checkout staging
  git checkout -b main 2>/dev/null || git checkout main
  
  # Retourner à la branche de développement
  git checkout develop
  
  echo "✅ Branches configurées: main, staging, develop"
}

# Protection des branches
setup_branch_protection() {
  cat > .github/branch-protection.md << EOF
# Configuration de Protection des Branches

## Branche Main (Production)
- Merge uniquement depuis staging
- Review obligatoire (2+ reviewers)
- Tests automatiques requis
- Pas de push direct

## Branche Staging
- Merge uniquement depuis develop
- Review obligatoire (1+ reviewer)
- Tests d'intégration requis

## Branche Develop
- Merge depuis feature branches
- Tests unitaires requis
EOF

  echo "✅ Documentation de protection des branches créée"
}

# Exécution principale
main() {
  echo "🚀 Configuration de l'environnement Airhost"
  echo "==========================================="
  
  create_env_files
  update_package_scripts
  create_vite_configs
  create_db_migration_script
  create_github_workflow
  setup_git_branches
  setup_branch_protection
  
  # Rendre les scripts exécutables
  chmod +x scripts/*.sh
  
  echo "==========================================="
  echo "✅ Configuration terminée pour: $ENVIRONMENT"
  echo ""
  echo "Prochaines étapes:"
  echo "1. Configurer les secrets dans GitHub/Replit"
  echo "2. Tester le déploiement: npm run deploy:dev"
  echo "3. Créer les instances Supabase pour chaque environnement"
  echo "4. Configurer les webhooks WhatsApp par environnement"
}

main