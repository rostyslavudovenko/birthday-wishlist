---
name: birthday-wishlist-backup
description: "Create and verify a private Supabase logical backup before Birthday Wishlist migrations or significant data changes. Use for backup preparation, not routine frontend work."
---

# Birthday Wishlist Backup

Use this skill when a production database backup is due, or before a schema migration or significant bulk administration change. Read `docs/supabase-backup.md` for restoration or off-site archival work.

1. Confirm the user intends to back up the production project and that the Supabase CLI is available.
2. Have the user set `SUPABASE_DB_URL` from the Supabase Session pooler in their current terminal. Do not request, print, store, or log the connection string.
3. Run `./scripts/backup-supabase.sh`. It creates timestamped `roles.sql`, `schema.sql`, `data.sql`, and `README.txt` under ignored `backups/` and removes incomplete output on failure.
4. Verify that all four files exist and are non-empty, and that `backups/` is ignored. Inspect schema/data structure only through the targeted checks in `docs/supabase-backup.md`; never print raw `data.sql`.
5. Tell the user that the raw backup contains private reservation data. Encryption and off-site copying require their explicit direction and destination; do not upload or restore anything automatically.

Treat backups, database URLs, reservation names, ownership tokens, and unlisted slugs as private. This skill does not authorize database mutation, migration application, or restoration.
