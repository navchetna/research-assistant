#!/bin/bash
# Runs on first MongoDB init (when data dir is empty) via docker-entrypoint-initdb.d.
# Restores the research-assistant rag_db dump.

set -e

echo "Restoring research-assistant MongoDB dump (rag_db)..."
mongorestore \
  --username "${MONGO_INITDB_ROOT_USERNAME}" \
  --password "${MONGO_INITDB_ROOT_PASSWORD}" \
  --authenticationDatabase admin \
  --archive=/docker-entrypoint-initdb.d/rag_db.dump \
  --gzip \
  --drop
echo "MongoDB restore completed."
