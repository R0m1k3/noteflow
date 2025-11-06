#!/bin/bash

# Créer les répertoires nécessaires
mkdir -p data
mkdir -p public/uploads

# Définir les permissions (1000:1000 est l'UID:GID standard pour le premier utilisateur)
chown -R 1000:1000 data
chown -R 1000:1000 public/uploads
chmod -R 755 data
chmod -R 755 public/uploads