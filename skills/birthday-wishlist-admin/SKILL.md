---
name: birthday-wishlist-admin
description: "Safely create, export, or synchronize Birthday Wishlist content through the local Supabase administration scripts. Use for private wishlist JSON and content changes, not frontend work."
---

# Birthday Wishlist Admin

Use this skill for trusted local administration of wishlist definitions: creating a list, exporting its current definition, or previewing and applying content synchronization.

Read `docs/wishlist-importer.md` before an unfamiliar operation. Work only with ignored files in `wishlists/private/`; do not print their contents or credentials.

## Create a wishlist

1. Start from `examples/wishlist.example.json` in `wishlists/private/`.
2. Run `npm run wishlist:validate -- <definition>`.
3. Run `npm run wishlist:preflight -- <definition>` and review its creation plan.
4. Run `npm run wishlist:import -- <definition> --confirm` only when the user has explicitly authorized creating that wishlist.

## Update an existing wishlist

1. Export with `npm run wishlist:export -- <slug>`; use `--force` only when the user wants to replace the local definition.
2. Validate the definition, then run `npm run wishlist:sync -- <definition>` without `--confirm`.
3. Present the exact preview categories—add, update, reorder, hide, and restore—and wait for explicit approval before running with `--confirm`.
4. If the preview hides a reserved gift, stop unless the user explicitly authorizes `--allow-hide-reserved` as well. Hiding is reversible; it does not delete the gift or reservation data.

Preserve each gift's `key` when editing or renaming it. A changed key creates a different gift; removing a key from the file hides that gift. Keep `isFeatured: false` for unlisted lists.

The scripts require `.env.wishlist-importer` with a service-role key. Never display the file, key, private JSON, or remote response bodies containing private data. Do not use this skill for schema migrations or browser-facing reservation behavior.
