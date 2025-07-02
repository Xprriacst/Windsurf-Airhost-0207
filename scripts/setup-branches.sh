#!/bin/bash

# Configuration initiale des branches Git pour Airhost
# Ce script configure la structure de branches recommandée

echo "Configuration des branches Git pour Airhost"

# Vérifier si Git est initialisé
if [ ! -d .git ]; then
    echo "Initialisation du repository Git..."
    git init
    git add .
    git commit -m "Initial commit - Airhost application with WhatsApp integration"
fi

# Sauvegarder la branche actuelle
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
echo "Branche actuelle: $CURRENT_BRANCH"

# Créer et configurer la branche develop
echo "Configuration de la branche develop..."
if ! git show-ref --verify --quiet refs/heads/develop; then
    git checkout -b develop
    echo "Branche develop créée"
else
    git checkout develop
    echo "Branche develop existe déjà"
fi

# Merger les changements actuels dans develop si nécessaire
if [ "$CURRENT_BRANCH" != "develop" ]; then
    git merge $CURRENT_BRANCH --no-edit 2>/dev/null || true
fi

# Créer la branche staging depuis develop
echo "Configuration de la branche staging..."
if ! git show-ref --verify --quiet refs/heads/staging; then
    git checkout -b staging
    echo "Branche staging créée depuis develop"
else
    git checkout staging
    git merge develop --no-edit 2>/dev/null || true
    echo "Branche staging mise à jour"
fi

# Créer la branche main depuis staging
echo "Configuration de la branche main..."
if ! git show-ref --verify --quiet refs/heads/main; then
    git checkout -b main
    echo "Branche main créée depuis staging"
else
    git checkout main
    git merge staging --no-edit 2>/dev/null || true
    echo "Branche main mise à jour"
fi

# Retourner à develop pour le développement
git checkout develop

echo "✅ Structure des branches configurée:"
echo "  - main (production)"
echo "  - staging (pré-production)"
echo "  - develop (développement actuel)"
echo ""
echo "Branche active: develop"
echo ""
echo "Prochaines étapes:"
echo "1. Configurer les environnements: ./scripts/environment-setup.sh"
echo "2. Tester le déploiement développement"
echo "3. Configurer les instances Supabase par environnement"