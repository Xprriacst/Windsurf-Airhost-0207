#!/usr/bin/env python3
"""
Point d'entrée principal pour le déploiement Replit
Lance le serveur web Vite pour l'application Airhost
"""
import subprocess
import sys
import os

def main():
    """Lance l'application web Airhost"""
    try:
        # Changer vers le répertoire du projet
        os.chdir('/home/runner/workspace')
        
        # Lancer le serveur Vite
        cmd = ['npx', 'vite', '--config', 'vite.config.replit.ts', '--host', '0.0.0.0', '--port', '5000']
        
        print("Démarrage de l'application Airhost...")
        print(f"Commande: {' '.join(cmd)}")
        
        # Exécuter la commande
        subprocess.run(cmd, check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"Erreur lors du démarrage de l'application: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Erreur inattendue: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()