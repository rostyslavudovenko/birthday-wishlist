# Supabase Backup Procedure

The production database uses Supabase Free and requires regular manual logical backups.

## Backup schedule

- Create one backup every month.
- Create an additional backup before database migrations.
- Create an additional backup before bulk updates or deletions.
- Store at least one encrypted copy outside the development laptop.

## Prerequisites

The local machine requires:

- Supabase CLI
- Access to the production Supabase project
- The Session pooler connection string
- Private storage for the encrypted archive

Verify the Supabase CLI:

```bash
supabase --version
```

## Create a backup

1. Open the Supabase Dashboard.
2. Open the production project.
3. Open the Connect dialog.
4. Copy the Session pooler connection string.
5. Set it for the current terminal session:

```bash
read -s SUPABASE_DB_URL
export SUPABASE_DB_URL
```

6. Paste the connection string when prompted and press Enter.
7. Run the backup script:

```bash
./scripts/backup-supabase.sh
```

8. Confirm that the following files were created:

```text
roles.sql
schema.sql
data.sql
README.txt
```

9. Confirm that the backup directory is ignored by Git.
10. Create an encrypted archive.
11. Copy the encrypted archive to private off-site storage.

## Backup contents

- `roles.sql` contains database role definitions.
- `schema.sql` contains tables, functions, views, triggers, grants, and policies.
- `data.sql` contains database records.
- `README.txt` describes the backup and its privacy requirements.

The data file may contain:

- Private family wishlist metadata
- Unlisted wishlist slugs
- Gift names and descriptions
- Store links
- Guest names
- Reservation tokens
- Reservation timestamps

Treat every database backup as private.

## Verify generated files

List the generated files:

```bash
find backups \
-maxdepth 2 \
-type f \
-exec ls -lh {} \;
```

Confirm that Git ignores the backup directory:

```bash
git status --ignored --short backups
```

The expected ignored status begins with:

```text
!! backups/
```

Check a generated data file directly:

```bash
find backups \
-name "data.sql" \
-print0 |
xargs -0 git check-ignore
```

## Verify the schema

Inspect expected database object definitions without printing private records:

```bash
grep -E \
"CREATE TABLE|CREATE FUNCTION|CREATE VIEW" \
backups/*/schema.sql
```

The schema should contain objects related to:

```text
wishlists
gifts
featured_wishlists
get_wishlist
get_wishlist_gifts
reserve_gift
release_gift
create_wishlist_with_gifts
sync_wishlist_with_gifts
```

## Verify the data structure

Confirm that the logical data dump contains the expected tables:

```bash
grep -c "COPY public.wishlists" backups/*/data.sql
grep -c "COPY public.gifts" backups/*/data.sql
```

Do not print the complete `data.sql` file in chat, GitHub issues, pull requests, or public documentation.

## Create an encrypted archive

Find the newest backup directory:

```bash
latest_backup="$(
find backups \
-mindepth 1 \
-maxdepth 1 \
-type d |
sort |
tail -n 1
)"
```

Create an encrypted archive:

```bash
archive_name="backups/supabase-backup-$(date -u '+%Y-%m-%d').zip"

zip -er "$archive_name" "$latest_backup"
```

Use a strong archive password stored in a password manager.

Do not reuse the Supabase database password as the archive password.

Test the encrypted archive:

```bash
unzip -t "$archive_name"
```

Copy the verified encrypted archive to private off-site storage.

## Restore preparation

Do not restore a backup directly over production without testing it first.

1. Create a separate Supabase test project.
2. Obtain the test project's database connection string.
3. Restore roles into the test project.
4. Restore the schema into the test project.
5. Restore the data into the test project.
6. Verify wishlist and gift record counts.
7. Verify public wishlist behavior.
8. Verify unlisted wishlist behavior.
9. Verify reservation and release functions.
10. Verify that private fields are not exposed by public API responses.
11. Test the React application against the restored database.
12. Restore to production only after the test restore succeeds.

## Privacy rules

- Never commit database exports.
- Never commit the database connection string.
- Never upload raw exports to a public location.
- Never publish unlisted wishlist slugs.
- Never print production records in GitHub Actions logs.
- Never share an unencrypted backup.
- Keep archive passwords in a password manager.
- Keep at least one encrypted copy outside the development laptop.

## Related project files

```text
scripts/backup-supabase.sh
skills/birthday-wishlist-backup/SKILL.md
docs/wishlist-importer.md
.github/workflows/supabase-health-check.yml
.gitignore
```
