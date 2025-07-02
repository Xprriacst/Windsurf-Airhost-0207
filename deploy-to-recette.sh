#!/bin/bash

# Script de déploiement sur l'environnement staging (recette)
# Déploie le système d'analyse GPT-4o intégré

set -e  # Arrêter le script en cas d'erreur

echo "🚀 Déploiement sur la branche recette"
echo "======================================"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire racine du projet."
    exit 1
fi

# Vérifier l'état Git
echo "📋 Vérification de l'état Git..."
git status

# Ajouter tous les fichiers modifiés
echo "📦 Ajout des fichiers modifiés..."
git add .

# Créer un commit avec les changements
echo "💾 Création du commit..."
git commit -m "feat: Intégration système d'analyse GPT-4o

- Analyse automatique des messages WhatsApp avec GPT-4o
- 6 tags de conversation: Urgence critique, Client mécontent, IA incertaine, etc.
- Affichage des tags dans l'interface utilisateur
- Système de fallback par mots-clés
- Base de données enrichie avec résultats d'analyse
- Webhook WhatsApp intégré avec analyse en temps réel

Tech:
- OpenAI GPT-4o API directe
- Supabase real-time updates
- React/TypeScript frontend
- Node.js webhook server"

# Créer/changer vers la branche recette
echo "🌿 Création/changement vers la branche recette..."
if git show-ref --verify --quiet refs/heads/recette; then
    echo "La branche recette existe déjà, changement vers celle-ci..."
    git checkout recette
    git merge main
else
    echo "Création de la nouvelle branche recette..."
    git checkout -b recette
fi

# Pousser vers le repository distant
echo "☁️ Push vers le repository distant..."
git push origin recette

echo "✅ Déploiement terminé avec succès!"
echo ""
echo "📊 Résumé des fonctionnalités déployées:"
echo "   • Analyse GPT-4o en temps réel"
echo "   • 6 tags de conversation intelligents"
echo "   • Interface utilisateur avec tags"
echo "   • Webhook WhatsApp intégré"
echo "   • Système de fallback robuste"
echo ""
echo "🔗 La branche recette est maintenant à jour avec le système d'analyse complet."