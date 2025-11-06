#!/bin/sh
mkdir -p /app/data
mkdir -p /app/public/uploads
chmod -R 777 /app/data
chmod -R 777 /app/public/uploads
exec node server.js