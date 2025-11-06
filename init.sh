#!/bin/sh

# Create necessary directories if they don't exist
mkdir -p data
mkdir -p public/uploads

# Set permissions
chmod -R 777 data
chmod -R 777 public/uploads

echo "Directories created and permissions set"