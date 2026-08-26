# Wishlist Importer

The wishlist importer provides a secure local workflow for creating, exporting, and synchronizing birthday wishlists and their gifts.

It is intended for trusted local administration only. Import, export, and synchronization commands use a Supabase secret key and must never run in browser code or expose credentials through Vite.

## Capabilities

The wishlist management workflow supports:

- creating a wishlist and all of its gifts from one private JSON file;
- validating wishlist definitions locally;
- checking slug availability through a read-only preflight;
- exporting existing wishlists into private JSON files;
- previewing changes before synchronization;
- updating wishlist metadata;
- adding new gifts;
- updating existing gifts;
- changing gift order;
- hiding gifts removed from the JSON;
- restoring previously hidden gifts;
- protecting reserved gifts from accidental hiding;
- applying all database changes atomically.

## Workflow

### Creating a New Wishlist

```text
Private JSON definition
↓
Local validation
↓
Read-only Supabase preflight
↓
Explicit --confirm flag
↓
Atomic wishlist and gift creation
```

### Updating an Existing Wishlist

```text
Export current wishlist
↓
Edit private JSON
↓
Local validation
↓
Read-only sync preview
↓
Review exact changes
↓
Explicit --confirm flag
↓
Atomic synchronization
```

If any database operation fails, PostgreSQL rolls back the complete import or synchronization.

## Repository Files

```text
examples/wishlist.example.json
schemas/wishlist.schema.json
scripts/wishlist-importer/validate-wishlist.mjs
scripts/wishlist-importer/preflight-wishlist.mjs
scripts/wishlist-importer/import-wishlist.mjs
scripts/wishlist-importer/export-wishlist.mjs
scripts/wishlist-importer/sync-wishlist.mjs
supabase/migrations/20260818120000_create_wishlist_import_rpc.sql
supabase/migrations/20260824120000_add_stable_gift_keys.sql
supabase/migrations/20260824130000_update_wishlist_import_rpc_for_gift_keys.sql
supabase/migrations/20260824150000_add_atomic_wishlist_sync_rpc.sql
.env.wishlist-importer.example
```

Private wishlist definitions belong in:

```text
wishlists/private/
```

This directory is excluded by `.gitignore`.

## Configure Local Credentials

Create the local importer environment file:

```bash
cp .env.wishlist-importer.example .env.wishlist-importer
```

Fill in:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
WISHLIST_SITE_URL=https://your-production-domain.example
```

### Security Requirements

- Never prefix the Supabase secret key with `VITE_`.
- Never put the secret key in `.env.local`.
- Never expose the secret key through frontend code.
- Never add the secret key to Cloudflare Pages frontend variables.
- Never commit `.env.wishlist-importer`.
- Never include the key in logs, screenshots, issues, pull requests, or documentation.
- Never grant importer or synchronization RPC access to browser roles.

Verify that Git ignores the local credentials:

```bash
git check-ignore -v .env.wishlist-importer
```

Expected output should reference the `.gitignore` rule for:

```text
.env.wishlist-importer
```

## Wishlist Definition Format

A wishlist definition contains wishlist metadata and an ordered array of gifts.

Example:

```json
{
"slug": "sample-birthday-list",
"title": "Sample Birthday Wishlist",
"ownerName": "Sample Person",
"description": "A synthetic wishlist used to demonstrate the importer format.",
"icon": "🎂",
"visibility": "unlisted",
"isFeatured": false,
"displayOrder": 100,
"gifts": [
{
"key": "mechanical-keyboard",
"name": "Mechanical Keyboard",
"description": "A compact wireless keyboard for everyday work.",
"price": "Around €100",
"image": "⌨",
"storeUrl": null
},
{
"key": "coffee-grinder",
"name": "Coffee Grinder",
"description": "A small manual grinder for fresh coffee.",
"price": "Around €45",
"image": "https://example.com/images/coffee-grinder.webp",
"storeUrl": "https://example.com/products/coffee-grinder"
}
]
}
```

## Wishlist Fields

### `slug`

Unique URL identifier for the wishlist.

Example:

```json
"slug": "maryna"
```

The public URL becomes:

```text
/w/maryna
```

The slug must:

- contain lowercase letters and numbers;
- use single hyphens as separators;
- remain unique across all wishlists.

Valid examples:

```text
rostyslav
maryna
family-k8x2m7q4
birthday-list-2026
```

Invalid examples:

```text
Maryna
birthday_list
birthday--list
-birthday-list
```

### `title`

Visible wishlist title.

```json
"title": "Maryna's Birthday Wishlist"
```

### `ownerName`

Name displayed in the public wishlist directory.

```json
"ownerName": "Maryna"
```

### `description`

Short public description of the wishlist.

```json
"description": "A few thoughtful things Maryna would be happy to receive."
```

### `icon`

Emoji or short text icon displayed in the interface.

```json
"icon": "🎂"
```

### `theme`

Controls the wishlist's visual presentation. Supported values are:

```text
classic
bubblegum
```

Use `classic` to preserve the original retro-Mac appearance.

### `visibility`

Supported values:

```text
public
unlisted
```

Public wishlists may appear in the public directory.

Unlisted wishlists are accessible only through their exact URL and do not appear in the public directory.

### `isFeatured`

Controls whether a public wishlist appears in the directory.

```json
"isFeatured": true
```

Only public wishlists can be featured.

The following combination is invalid:

```json
{
"visibility": "unlisted",
"isFeatured": true
}
```

### `displayOrder`

Controls the wishlist position in the public directory.

```json
"displayOrder": 20
```

## Gift Fields

Each gift contains:

```text
key
name
description
price
image
storeUrl
```

### `key`

Stable identifier used by import and synchronization.

```json
"key": "mechanical-keyboard"
```

The key identifies the gift independently of its visible name.

For example, the following name can change:

```json
"name": "Mechanical Keyboard"
```

to:

```json
"name": "Wireless Mechanical Keyboard"
```

without creating a new gift, as long as the key remains:

```json
"key": "mechanical-keyboard"
```

Gift keys must:

- contain lowercase letters and numbers;
- use single hyphens as separators;
- remain unique within a wishlist;
- remain unchanged after a gift has been created.

Valid keys:

```text
mechanical-keyboard
tea-set
lego-set-2026
```

Invalid keys:

```text
Mechanical Keyboard
mechanical_keyboard
mechanical--keyboard
-mechanical-keyboard
```

The same key may exist in different wishlists.

For example:

```text
maryna / tea-set
family / tea-set
```

This is valid because gift key uniqueness is enforced within each wishlist.

### `name`

Visible gift name.

```json
"name": "Mechanical Keyboard"
```

### `description`

Short description displayed in the gift card.

```json
"description": "A compact wireless keyboard for everyday work."
```

### `price`

Human-readable price information.

```json
"price": "Around €100"
```

The value is stored as text so it can represent ranges, approximate prices, or notes.

### `image`

The image field supports an emoji or direct HTTP or HTTPS image URL.

Emoji example:

```json
"image": "⌨"
```

Image URL example:

```json
"image": "https://example.com/images/keyboard.webp"
```

If an external image cannot be loaded, the frontend displays a fallback gift icon.

### `storeUrl`

Optional product page URL.

```json
"storeUrl": "https://example.com/products/keyboard"
```

If no product page is available:

```json
"storeUrl": null
```

When a URL is present, the gift card displays:

```text
View product ↗
```

The product page opens in a new browser tab.

## Gift Ordering

Gift position in the JSON array determines the database `display_order`.

```text
First gift 10
Second gift 20
Third gift 30
Fourth gift 40
```

To reorder gifts, reorder the objects in the JSON array.

Do not add a separate gift `displayOrder` field manually.

## Creating a Private Wishlist Definition

Copy the synthetic example:

```bash
cp examples/wishlist.example.json wishlists/private/new-wishlist.json
```

Edit only the private copy:

```text
wishlists/private/new-wishlist.json
```

Verify that Git ignores the file:

```bash
git check-ignore -v wishlists/private/new-wishlist.json
```

## Validating a Wishlist Definition

Run:

```bash
npm run wishlist:validate -- wishlists/private/new-wishlist.json
```

Validation checks:

- required wishlist fields;
- required gift fields;
- value types;
- slug format;
- gift key format;
- duplicate gift keys;
- supported visibility;
- field lengths;
- image values;
- product URLs;
- unknown properties;
- presence of at least one gift.

Example successful output:

```text
Wishlist definition is valid.
Slug: sample-birthday-list
Visibility: unlisted
Gifts: 2
```

### Duplicate Key Example

The following definition is invalid:

```json
{
"gifts": [
{
"key": "tea-set",
"name": "Tea Set"
},
{
"key": "tea-set",
"name": "Another Tea Set"
}
]
}
```

Validation reports:

```text
gifts[1].key: duplicates gifts[0].key "tea-set".
```

## Running a New Wishlist Preflight

Run:

```bash
npm run wishlist:preflight -- wishlists/private/new-wishlist.json
```

The preflight:

- validates the JSON again;
- checks Supabase availability;
- verifies that the wishlist slug is available;
- displays the planned wishlist;
- displays future gift ordering;
- does not write data.

Example:

```text
Checking Supabase...
Slug "sample-birthday-list" is available.

Creation plan
-------------
Slug: sample-birthday-list
Title: Sample Birthday Wishlist
Visibility: unlisted
Featured: no
Wishlist display order: 100
Gifts: 2

10: Mechanical Keyboard
20: Coffee Grinder

Preflight passed. No data was written to Supabase.
```

## Importing a New Wishlist

Run the import only after validation and preflight succeed:

```bash
npm run wishlist:import -- \
wishlists/private/new-wishlist.json \
--confirm
```

The `--confirm` flag is required because this command writes data.

The importer repeats validation and preflight before writing anything.

On success:

```text
Wishlist created successfully.
Wishlist ID: 123
Created gifts: 4
URL: https://your-domain.example/w/new-wishlist
```

The wishlist and all gifts are created in one PostgreSQL transaction.

If any insert fails, PostgreSQL rolls back the complete import.

## Duplicate Slug Protection

The preflight refuses to continue when the slug already exists.

The database RPC performs the same check again during creation.

This protects against:

- accidental duplicate wishlists;
- stale preflight results;
- simultaneous creation attempts;
- overwriting an existing wishlist.

The importer never updates or overwrites an existing wishlist.

Use the synchronization workflow for existing wishlists.

## Exporting Existing Wishlists

Existing wishlists can be exported into private JSON definitions.

Run:

```bash
npm run wishlist:export -- rostyslav
```

The exported file is saved to:

```text
wishlists/private/rostyslav.json
```

Successful output:

```text
Wishlist exported successfully.
Slug: rostyslav
Gifts: 4
File: /path/to/wishlists/private/rostyslav.json

Reservation names and tokens were not exported.
```

### Exported Data

The export includes:

- wishlist slug;
- title;
- owner name;
- description;
- icon;
- public or unlisted visibility;
- featured state;
- wishlist display order;
- visible gifts;
- stable gift keys;
- gift names;
- gift descriptions;
- prices;
- emoji or image URLs;
- store URLs;
- current gift order.

### Excluded Data

The export intentionally excludes:

- reservation names;
- reservation tokens;
- reservation timestamps;
- browser ownership information;
- reservation status;
- hidden gifts.

The export can therefore be used for content administration without exposing private reservation data.

## Export Overwrite Protection

The exporter does not overwrite an existing private file by default.

If this file already exists:

```text
wishlists/private/rostyslav.json
```

the command stops with an error.

To intentionally replace the local definition with the current database state:

```bash
npm run wishlist:export -- rostyslav --force
```

Use `--force` only when the database state should replace the local file.

## Validating an Export

Run:

```bash
npm run wishlist:validate -- wishlists/private/rostyslav.json
```

The exported definition must pass the same validation as a newly created wishlist definition.

## Privacy Verification for Exports

To verify that private reservation fields were not exported:

```bash
grep -R -n -Ei \
"reserved_by|reservedBy|reservation_token|reservationToken|reserved_at|reservedAt" \
wishlists/private \
--include="*.json"
```

The command should return no results.

## Previewing Wishlist Synchronization

Edit the private JSON and run:

```bash
npm run wishlist:sync -- wishlists/private/rostyslav.json
```

Without `--confirm`, synchronization is always read-only.

The preview compares the private JSON with the current Supabase state.

Supported change categories:

```text
ADD
UPDATE
REORDER
HIDE
RESTORE
```

Example:

```text
Sync preview for "rostyslav"

Wishlist changes
----------------
~ Description: "Old description" -> "New description"

Gift changes
------------
+ ADD [new-gift] New Gift
~ UPDATE [mechanical-keyboard] Wireless Mechanical Keyboard
REORDER [coffee-grinder] Coffee Grinder: 20 -> 30
- HIDE [old-gift] Old Gift
RESTORE [returning-gift] Returning Gift

Unchanged gifts: 1
Planned changes: 5
Read-only preview complete. No data was written to Supabase.
```

Review the complete preview before applying any synchronization.

## No-Change Preview

If the private JSON matches the database:

```text
Wishlist changes
----------------
No metadata changes.

Gift changes
------------

Unchanged gifts: 4
Planned changes: 0
Read-only preview complete. No data was written to Supabase.
```

## Applying Wishlist Synchronization

After reviewing the preview, apply changes with:

```bash
npm run wishlist:sync -- \
wishlists/private/rostyslav.json \
--confirm
```

Synchronization supports:

- updating wishlist title;
- updating owner name;
- updating description;
- updating icon;
- changing visibility;
- changing featured state;
- changing wishlist display order;
- adding new gifts;
- updating existing gifts;
- renaming gifts without changing identity;
- changing gift descriptions;
- changing prices;
- changing emoji or image URLs;
- changing store URLs;
- changing gift order;
- hiding removed gifts;
- restoring hidden gifts.

The synchronization executes in one PostgreSQL transaction.

If any operation fails, PostgreSQL rolls back the complete synchronization.

Example successful output:

```text
Applying atomic synchronization...
Wishlist synchronized successfully.
Added: 1
Updated: 4
Hidden: 1
Restored: 0
```

## No-Change Synchronization

If `--confirm` is provided but the preview contains no changes:

```bash
npm run wishlist:sync -- \
wishlists/private/rostyslav.json \
--confirm
```

the command stops without calling the database synchronization RPC:

```text
Nothing to synchronize.
```

## Gift Removal Policy

A gift removed from the private JSON is not physically deleted.

Instead:

```text
is_visible = false
```

This preserves:

- the database ID;
- the stable gift key;
- reservation information;
- reservation ownership;
- the ability to restore the gift;
- protection from accidental permanent deletion.

If the same gift key is later returned to the private JSON, synchronization restores the gift:

```text
is_visible = true
```

The gift keeps the same database ID and stable key.

## Reserved Gift Protection

The synchronization preview clearly identifies a reserved gift that would be hidden:

```text
- HIDE [warm-blanket] Warm Blanket (currently reserved)
```

Synchronization refuses to hide reserved gifts by default.

The following command is blocked:

```bash
npm run wishlist:sync -- \
wishlists/private/family-k8x2m7q4.json \
--confirm
```

when the JSON would hide a reserved gift.

To intentionally allow this operation:

```bash
npm run wishlist:sync -- \
wishlists/private/family-k8x2m7q4.json \
--confirm \
--allow-hide-reserved
```

Use `--allow-hide-reserved` only after:

1. Reviewing the preview.
2. Confirming the gift is currently reserved.
3. Confirming that hiding the gift is intentional.
4. Understanding that reservation data remains stored.

The synchronization process does not clear or modify:

- reservation names;
- reservation ownership tokens;
- reservation timestamps.

## Updating Wishlist Visibility

A wishlist can be changed from unlisted to public:

```json
{
"visibility": "public",
"isFeatured": true
}
```

A public wishlist can be changed to unlisted:

```json
{
"visibility": "unlisted",
"isFeatured": false
}
```

An unlisted wishlist cannot be featured.

The validator and database RPC both enforce this rule.

## Renaming a Gift

Keep the same stable key:

```json
{
"key": "mechanical-keyboard",
"name": "Wireless Mechanical Keyboard"
}
```

The sync preview reports:

```text
~ UPDATE [mechanical-keyboard] Wireless Mechanical Keyboard
```

The existing database gift is updated. A duplicate gift is not created.

## Reordering Gifts

Reorder gift objects in the JSON array.

Before:

```text
Mechanical Keyboard
Coffee Grinder
LEGO Architecture Set
```

After:

```text
LEGO Architecture Set
Mechanical Keyboard
Coffee Grinder
```

The sync preview reports the affected order changes.

Synchronization updates database values to:

```text
10
20
30
```

## Restoring a Hidden Gift

Return the gift object to the JSON using the same stable key.

Example:

```json
{
"key": "warm-blanket",
"name": "Warm Blanket",
"description": "A warm blanket for quiet evenings.",
"price": "Around €50",
"image": "🛏",
"storeUrl": null
}
```

The preview reports:

```text
RESTORE [warm-blanket] Warm Blanket
```

Synchronization sets:

```text
is_visible = true
```

## Database Migrations

The wishlist administration workflow uses these migrations:

```text
supabase/migrations/
├── 20260818120000_create_wishlist_import_rpc.sql
├── 20260824120000_add_stable_gift_keys.sql
├── 20260824130000_update_wishlist_import_rpc_for_gift_keys.sql
└── 20260824150000_add_atomic_wishlist_sync_rpc.sql
```

### Stable Gift Key Migration

The gift key migration:

- adds `gifts.gift_key`;
- assigns stable keys to existing gifts;
- requires every gift to have a key;
- validates the key format;
- enforces uniqueness within each wishlist.

Database constraint:

```text
gift_key_is_valid
```

Unique constraint:

```text
gifts_wishlist_id_gift_key_key
```

The unique constraint covers:

```text
wishlist_id + gift_key
```

### Import RPC

The import RPC:

```text
create_wishlist_with_gifts
```

- uses `SECURITY DEFINER`;
- is executable only by `service_role`;
- is not executable by `PUBLIC`, `anon`, or `authenticated`;
- validates wishlist configuration;
- validates gift keys;
- rejects duplicate gift keys;
- creates a wishlist and all gifts atomically.

### Synchronization RPC

The synchronization RPC:

```text
sync_wishlist_with_gifts
```

- uses `SECURITY DEFINER`;
- is executable only by `service_role`;
- is not executable by browser roles;
- locks the target wishlist during synchronization;
- validates all incoming gifts;
- updates metadata;
- adds, updates, reorders, hides, and restores gifts;
- protects reserved gifts;
- executes atomically.

## Database Backup

Before applying database migrations or significant synchronization changes, create a fresh Supabase backup:

```bash
./scripts/backup-supabase.sh
```

Verify the generated backup:

```bash
find backups -maxdepth 2 -type f | sort | tail -n 10
```

Generated backups are excluded from Git.

See:

```text
docs/supabase-backup.md
```

for complete backup and restoration guidance.

## Recommended Administration Workflow

### Create a New Wishlist

```bash
cp examples/wishlist.example.json wishlists/private/new-wishlist.json

npm run wishlist:validate -- \
wishlists/private/new-wishlist.json

npm run wishlist:preflight -- \
wishlists/private/new-wishlist.json

npm run wishlist:import -- \
wishlists/private/new-wishlist.json \
--confirm
```

### Update an Existing Wishlist

```bash
npm run wishlist:export -- rostyslav

npm run wishlist:validate -- \
wishlists/private/rostyslav.json

npm run wishlist:sync -- \
wishlists/private/rostyslav.json

npm run wishlist:sync -- \
wishlists/private/rostyslav.json \
--confirm
```

### Refresh a Local Definition

```bash
npm run wishlist:export -- rostyslav --force
```

This replaces the local definition with the current database state.

## Troubleshooting

### Missing Environment File

Error:

```text
.env.wishlist-importer was not found
```

Create it from the example:

```bash
cp .env.wishlist-importer.example .env.wishlist-importer
```

### Missing Credentials

Error:

```text
SUPABASE_URL and SUPABASE_SECRET_KEY are required
```

Check:

```text
.env.wishlist-importer
```

Required names:

```dotenv
SUPABASE_URL=
SUPABASE_SECRET_KEY=
WISHLIST_SITE_URL=
```

Do not use `VITE_` prefixes.

### Invalid Supabase URL

Error:

```text
SUPABASE_URL must be a valid absolute URL
```

Use:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
```

Do not include:

- HTML markup;
- placeholder text;
- trailing comments;
- Markdown;
- an incomplete hostname.

### Wishlist Slug Already Exists

Error:

```text
wishlist slug "..." already exists
```

Use synchronization for an existing wishlist.

The importer intentionally never overwrites existing data.

### Wishlist Does Not Exist During Sync

Error:

```text
Wishlist "..." was not found. Use wishlist:import to create it.
```

Confirm the slug or create the wishlist through the import workflow.

### Duplicate Gift Key

Error:

```text
Gift keys must be unique within a wishlist.
```

Assign each gift a unique stable key.

### Invalid Gift Key

Error:

```text
Every gift must have a valid stable key.
```

Use lowercase letters, numbers, and single hyphens.

### Export File Already Exists

Error:

```text
Export stopped: ... already exists.
```

Review the local file first.

If the database should replace it:

```bash
npm run wishlist:export -- rostyslav --force
```

### Reserved Gift Cannot Be Hidden

Error:

```text
Sync would hide a reserved gift.
```

Review the preview.

If hiding the reserved gift is intentional:

```bash
npm run wishlist:sync -- \
wishlists/private/family.json \
--confirm \
--allow-hide-reserved
```

### Unauthorized or Forbidden Response

Confirm that:

- `.env.wishlist-importer` contains a Supabase secret key;
- the key is not a publishable frontend key;
- importer and sync RPCs are granted only to `service_role`;
- RPC permissions were applied successfully.

Do not weaken Row Level Security or grant admin RPC execution to browser roles as a workaround.

### Unexpected Sync Differences

Refresh the local definition:

```bash
npm run wishlist:export -- rostyslav --force
```

Then run the preview again:

```bash
npm run wishlist:sync -- wishlists/private/rostyslav.json
```

Do not use `--confirm` until the preview matches the intended changes.

## Security Checklist

Before importing or synchronizing:

- `.env.wishlist-importer` is ignored by Git;
- private wishlist JSON files are ignored by Git;
- the secret key is not present in frontend environment variables;
- the secret key is not present in Cloudflare Pages;
- the JSON passes validation;
- the complete preview has been reviewed;
- reserved gift warnings have been reviewed;
- a recent database backup exists for significant changes.

Verify ignored files:

```bash
git check-ignore -v .env.wishlist-importer
git check-ignore -v wishlists/private/rostyslav.json
```

Search tracked files for accidental secrets:

```bash
git grep -n "sb_secret_" -- ':!*.example'
```

The command should return no results.

## Pre-Commit Checks

Run:

```bash
node --check scripts/wishlist-importer/validate-wishlist.mjs
node --check scripts/wishlist-importer/preflight-wishlist.mjs
node --check scripts/wishlist-importer/import-wishlist.mjs
node --check scripts/wishlist-importer/export-wishlist.mjs
node --check scripts/wishlist-importer/sync-wishlist.mjs

npm run wishlist:validate -- examples/wishlist.example.json
npm run wishlist:preflight -- examples/wishlist.example.json

npm run lint
npm run build
git diff --check
git status
```

Private JSON files and `.env.wishlist-importer` must not appear in `git status`.
