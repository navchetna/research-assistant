FROM redis/redis-stack:7.2.0-v9

# Bake the pre-populated vector DB snapshot into the image. On first start
# (when /data is empty) redis-stack will load this RDB and serve the data.
COPY dumps/redis/dump.rdb /data/dump.rdb
