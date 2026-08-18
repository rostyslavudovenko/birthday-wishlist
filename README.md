## Creating wishlists

New wishlists and their gifts can be created from one private JSON definition with the local wishlist importer.

The importer provides:

- local JSON validation;
- a read-only Supabase preflight;
- duplicate slug protection;
- automatic gift ordering;
- emoji and direct image URL support;
- atomic creation of the wishlist and all gifts;
- an admin-only Supabase RPC;
- explicit confirmation before any data is written.

Private wishlist definitions and importer credentials are excluded from Git.

See docs/wishlist-importer.md for setup, security requirements, commands, and troubleshooting.
