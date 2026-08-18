# Wishlist Importer

The wishlist importer creates a wishlist and all of its gifts from one private JSON file. It is intended for trusted local administration only.

## Workflow

1. Validate the local JSON definition.
2. Run a read-only Supabase preflight.
3. Confirm that the slug does not exist.
4. Display the planned wishlist and gift order.
5. Require the explicit `--confirm` flag.
6. Call the admin-only `create_wishlist_with_gifts` RPC.
7. Create the wishlist and all gifts in one transaction.

If any database operation fails, PostgreSQL rolls back the complete import.

## Files

```text
examples/wishlist.example.json
schemas/wishlist.schema.json
scripts/wishlist-importer/validate-wishlist.mjs
scripts/wishlist-importer/preflight-wishlist.mjs
scripts/wishlist-importer/import-wishlist.mjs
supabase/migrations/20260818120000_create_wishlist_import_rpc.sql
.env.wishlist-importer.example
```

Private definitions belong in `wishlists/private/`, which is excluded by `.gitignore`.

## Configure credentials

```bash
cp .env.wishlist-importer.example .env.wishlist-importer
```

Fill in:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
WISHLIST_SITE_URL=https://your-production-domain.example
```

Never prefix the secret key with `VITE_`, put it in frontend variables, commit it, or share it in logs and screenshots.

Verify that Git ignores it:

```bash
git check-ignore -v .env.wishlist-importer
```

## Create a private definition

```bash
cp examples/wishlist.example.json wishlists/private/new-wishlist.json
```

Edit only the private copy. Gift array order becomes database order `10, 20, 30...`.

The `image` field accepts an emoji or direct HTTP(S) image URL. `storeUrl` accepts an HTTP(S) URL or `null`.

## Validate

```bash
npm run wishlist:validate -- wishlists/private/new-wishlist.json
```

## Run read-only preflight

```bash
npm run wishlist:preflight -- wishlists/private/new-wishlist.json
```

Preflight checks Supabase availability and slug uniqueness. It does not write data.

## Import

```bash
npm run wishlist:import -- wishlists/private/new-wishlist.json --confirm
```

The importer repeats validation and preflight before writing data.

## Verify

Check the printed URL for:

- title, description, icon, and visibility;
- complete gift list and ordering;
- emoji and photo rendering;
- reservation, release, refresh ownership, and Realtime;
- absence from the public directory when visibility is `unlisted`.

## Duplicate protection

The local preflight and database RPC both reject an existing slug. The importer never overwrites or synchronizes an existing wishlist.

## Database installation

The RPC is stored in:

```text
supabase/migrations/20260818120000_create_wishlist_import_rpc.sql
```

It uses `SECURITY DEFINER`, is executable only by `service_role`, and creates the wishlist and gifts atomically. Run the documented Supabase backup procedure before database changes.

## Troubleshooting

- Missing `.env.wishlist-importer`: create it from the example.
- Missing credentials: verify `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
- Existing slug: choose a new slug.
- Unauthorized response: verify the secret key and RPC grants. Do not weaken RLS or grant access to browser roles.

## Pre-commit checks

```bash
npm run wishlist:validate -- examples/wishlist.example.json
npm run wishlist:preflight -- examples/wishlist.example.json
npm run lint
npm run build
git diff --check
git status
```
