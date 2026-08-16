#!/usr/bin/env bash

set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
    echo "Error: Supabase CLI is not installed."
    echo
    echo "Install it and run the backup again."
    exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo "Error: SUPABASE_DB_URL is not set."
    echo
    echo "Copy the Session pooler connection string from:"
    echo "Supabase Dashboard -> Connect -> Session pooler"
    echo
    echo "Then set it for the current terminal session:"
    echo
    echo "read -s SUPABASE_DB_URL"
    echo "export SUPABASE_DB_URL"
    exit 1
fi

timestamp="$(date -u '+%Y-%m-%dT%H-%M-%SZ')"
backup_dir="backups/$timestamp"

mkdir -p "$backup_dir"

cleanup_failed_backup() {
    local exit_code=$?

    if [ "$exit_code" -ne 0 ]; then
        echo
        echo "Backup failed."

        if [ -d "$backup_dir" ]; then
            rm -rf "$backup_dir"
            echo "Removed incomplete backup directory."
        fi
    fi

    exit "$exit_code"
}

trap cleanup_failed_backup EXIT

echo "Creating Supabase backup"
echo "Destination: $backup_dir"
echo

echo "Exporting database roles..."

supabase db dump \
    --db-url "$SUPABASE_DB_URL" \
    -f "$backup_dir/roles.sql" \
    --role-only

echo "Exporting database schema..."

supabase db dump \
    --db-url "$SUPABASE_DB_URL" \
    -f "$backup_dir/schema.sql"

echo "Exporting database data..."

supabase db dump \
    --db-url "$SUPABASE_DB_URL" \
    -f "$backup_dir/data.sql" \
    --use-copy \
    --data-only \
    -x "storage.buckets_vectors" \
    -x "storage.vector_indexes"

cat > "$backup_dir/README.txt" <<EOF
Supabase logical backup

Created:
$timestamp

Files:
- roles.sql
- schema.sql
- data.sql

Privacy:
This directory may contain private wishlist data, gift links,
guest names, reservation tokens, and reservation timestamps.

Do not commit this directory to Git.
Do not upload the raw files to a public location.
Store an encrypted copy in private off-site storage.
EOF

for required_file in \
    "$backup_dir/roles.sql" \
    "$backup_dir/schema.sql" \
    "$backup_dir/data.sql" \
    "$backup_dir/README.txt"
do
    if [ ! -s "$required_file" ]; then
        echo "Error: Missing or empty backup file: $required_file"
        exit 1
    fi
done

trap - EXIT

echo
echo "Backup completed successfully."
echo
echo "Created files:"
ls -lh "$backup_dir"

echo
echo "Next steps:"
echo "1. Verify the schema and data structure."
echo "2. Create an encrypted archive."
echo "3. Copy the archive to private off-site storage."
echo
echo "Backup directory:"
echo "$backup_dir"