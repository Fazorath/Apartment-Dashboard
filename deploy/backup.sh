#!/bin/sh
# One dump of the whole database into /backups, then prune dumps older than 7 days.
# The mongo-backup service runs it every night; run it by hand with
#   docker compose exec mongo-backup sh /backup.sh
set -eu
out="/backups/dump-$(date -u +%Y%m%d-%H%M%S).archive.gz"
mongodump --host mongo --archive="$out.tmp" --gzip
mv "$out.tmp" "$out"
# Pruned only after a good dump, so a broken night never costs the last good ones
find /backups -name 'dump-*.archive.gz' -mtime +6 -delete
echo "backup written: $out"
