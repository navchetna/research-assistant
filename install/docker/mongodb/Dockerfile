FROM mongo

COPY dumps/mongodb/rag_db.dump /docker-entrypoint-initdb.d/rag_db.dump
COPY install/docker/mongodb/restore.sh /docker-entrypoint-initdb.d/restore.sh

RUN chmod +x /docker-entrypoint-initdb.d/restore.sh
