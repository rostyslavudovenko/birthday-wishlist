# Birthday Wishlist

![GitHub License](https://img.shields.io/github/license/rostyslavudovenko/birthday-wishlist)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/rostyslavudovenko/birthday-wishlist)
[![Supabase Health Check](https://github.com/rostyslavudovenko/birthday-wishlist/actions/workflows/supabase-health-check.yml/badge.svg)](https://github.com/rostyslavudovenko/birthday-wishlist/actions/workflows/supabase-health-check.yml)

A retro Mac-inspired birthday wishlist for choosing gifts without duplicates or unnecessary coordination.

Visitors can open a wishlist, reserve an available gift, and release their own reservation later. Changes are synchronized between active browser sessions in real time.

## How It Works

Each wishlist has its own URL:

```text
/w/rostyslav
/w/example-unlisted-slug
```

A visitor can:

- Open a public or unlisted wishlist
- Review available and reserved gifts
- Reserve an available gift using a name
- See the gift marked as reserved for other visitors
- Release the reservation from the same browser
- Receive live updates when another visitor makes a change

Reservation names and ownership tokens remain private. Other visitors only see whether a gift is available or reserved.

## Features

- **Retro Mac Interface:** Responsive interface inspired by classic Macintosh windows
- **Presentation Themes:** Supports classic retro-Mac and celebratory bubblegum themes
- **Wishlist Directory:** Public wishlists are available from the homepage
- **Public and Unlisted Lists:** Unlisted wishlists are accessible only through their exact URL
- **Gift Reservations:** Visitors can reserve available gifts without creating an account
- **Reservation Ownership:** Only the browser that created a reservation can release it
- **Duplicate Protection:** Conditional database updates prevent simultaneous reservations
- **Realtime Updates:** Gift availability is synchronized between active browser sessions
- **Refresh Synchronization:** Wishlist data refreshes on page focus and visibility changes
- **Gift Images:** Gifts support both emoji icons and direct image URLs
- **Store Links:** Gifts can include an optional link to an external store
- **Wishlist Administration:** Wishlists and gifts can be created, exported, and synchronized from private JSON definitions
- **Availability Monitoring:** A scheduled GitHub Actions workflow checks Supabase availability
- **Backup Procedure:** Supabase roles, schema, and data can be exported with the included script
- **Cloudflare Deployment:** The frontend is deployed through Cloudflare Pages

## Technology

- **Frontend:** React, TypeScript, Vite
- **Routing:** React Router
- **Backend:** Supabase
- **Database:** PostgreSQL
- **Live Updates:** Supabase Realtime Broadcast
- **Hosting:** Cloudflare Pages
- **Automation:** GitHub Actions
- **Validation and Import:** Node.js scripts

## Application Routes

```text
/                    Public wishlist directory
/w/:slug             Public or unlisted wishlist
/*                    Not-found page
```

Public and featured wishlists appear in the directory.

Unlisted wishlists do not appear in the directory and are available only through their exact URL.

## Reservation Model

Each browser receives a private visitor token that is stored locally.

When a gift is reserved:

1. The visitor enters a name.
2. The browser sends the visitor token to Supabase.
3. A conditional database update reserves the gift only if it is still available.
4. The browser stores ownership of the reservation locally.
5. Other active visitors receive a Realtime update.

A reservation can be released only when the supplied visitor token matches the token stored with the reservation.

Public wishlist responses do not expose:

- Reservation names
- Reservation tokens
- Private browser ownership information

Other visitors receive only the public reservation state:

```text
Available
Reserved
```

## Gift Images

The `image` field supports either an emoji or a direct image URL.

Emoji example:

```json
{
  "image": "⌨"
}
```

Image URL example:

```json
{
  "image": "https://example.com/images/keyboard.webp"
}
```

If an external image cannot be loaded, the interface displays a gift fallback icon.

## Getting Started

### Prerequisites

The following tools are required for local development:

- Node.js
- npm
- A Supabase project

### Installation

1. Clone the repository:

```bash
git clone https://github.com/rostyslavudovenko/birthday-wishlist.git
cd birthday-wishlist
```

2. Install dependencies:

```bash
npm install
```

3. Create the frontend environment file:

```bash
cp .env.example .env.local
```

4. Add the Supabase frontend configuration:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

5. Start the development server:

```bash
npm run dev
```

The application will be available at the local URL printed by Vite.

### Development Commands

- `npm run dev` - Start the development server with hot reload
- `npm run lint` - Run ESLint
- `npm run build` - Run TypeScript checks and create a production build
- `npm run preview` - Preview the production build locally
- `npm run wishlist:validate` - Validate a wishlist JSON definition
- `npm run wishlist:preflight` - Run a read-only Supabase import preflight
- `npm run wishlist:import` - Create a wishlist and its gifts
- `npm run wishlist:export` - Export an existing wishlist to a private JSON definition
- `npm run wishlist:sync` - Preview and atomically synchronize wishlist and gift changes

Before committing changes, run:

```bash
npm run lint
npm run build
git diff --check
git status
```

## Creating Wishlists

New wishlists and their gifts can be created from one private JSON definition with the local wishlist importer.

The importer provides:

- Local JSON validation
- A read-only Supabase preflight
- Duplicate slug protection
- Automatic gift ordering
- Emoji and direct image URL support
- Atomic creation of the wishlist and all gifts
- An admin-only Supabase RPC
- Explicit confirmation before any data is written

### Configure the Importer

Create the local importer environment file:

```bash
cp .env.wishlist-importer.example .env.wishlist-importer
```

Fill in the local values:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
WISHLIST_SITE_URL=https://your-production-domain.example
```

The Supabase secret key is used only by the local Node.js importer.

The secret key must never be:

- Prefixed with `VITE_`
- Added to `.env.local`
- Exposed through frontend code
- Added to Cloudflare Pages frontend variables
- Committed to Git
- Included in logs, screenshots, issues, or pull requests

Verify that Git ignores the local credentials:

```bash
git check-ignore -v .env.wishlist-importer
```

### Create a Wishlist Definition

Copy the synthetic example:

```bash
cp examples/wishlist.example.json wishlists/private/new-wishlist.json
```

Edit only the private copy.

Private wishlist definitions belong in:

```text
wishlists/private/
```

The directory is excluded from Git.

### Wishlist Format

A wishlist definition contains the wishlist metadata and all gifts:

```json
{
  "slug": "sample-birthday-list",
  "title": "Sample Birthday Wishlist",
  "ownerName": "Sample Person",
  "description": "A synthetic example wishlist.",
  "icon": "🎂",
  "theme": "classic",
  "visibility": "unlisted",
  "isFeatured": false,
  "displayOrder": 100,
  "gifts": [
    {
      "key": "mechanical-keyboard",
      "name": "Mechanical Keyboard",
      "description": "A compact wireless keyboard.",
      "price": "Around €100",
      "image": "⌨",
      "storeUrl": null
    }
  ]
}
```

Gift position in the JSON array determines the database `display_order`:

```text
First gift     10
Second gift    20
Third gift     30
```

### Validate the Definition

```bash
npm run wishlist:validate -- wishlists/private/new-wishlist.json
```

Validation checks:

- Required fields
- Field types
- Slug format
- Stable gift keys
- Supported themes
- Supported visibility
- Field lengths
- Gift definitions
- Image values
- Store URLs
- Unknown properties

### Run the Preflight

```bash
npm run wishlist:preflight -- wishlists/private/new-wishlist.json
```

The preflight:

- Validates the JSON again
- Checks Supabase availability
- Confirms that the slug is not already used
- Displays the planned gift order
- Does not write data

### Import the Wishlist

```bash
npm run wishlist:import -- wishlists/private/new-wishlist.json --confirm
```

The importer repeats validation and preflight before writing data.

The wishlist and all gifts are created in one PostgreSQL transaction. If any operation fails, the complete import is rolled back.

### Export and Synchronize Wishlists

Existing wishlists can be exported to private JSON definitions, edited, and synchronized atomically:

1. Export an existing wishlist:

```bash
npm run wishlist:export -- sample-birthday-list
```

2. Validate and preview the planned changes:

```bash
npm run wishlist:sync -- wishlists/private/sample-birthday-list.json
```

3. Apply changes atomically after reviewing the preview:

```bash
npm run wishlist:sync -- wishlists/private/sample-birthday-list.json --confirm
```

For detailed setup, security requirements, commands, and troubleshooting, see [docs/wishlist-importer.md](docs/wishlist-importer.md).

## Supabase Backup

The project includes a script for creating a logical backup of the Supabase project:

```bash
./scripts/backup-supabase.sh
```

Each backup contains:

```text
backups/<timestamp>/
├── roles.sql
├── schema.sql
├── data.sql
└── README.txt
```

Generated backups are private and excluded from Git.

Before making database schema changes, create and verify a fresh backup.

For configuration, verification, storage, and restoration guidance, see [docs/supabase-backup.md](docs/supabase-backup.md).

## Availability Monitoring

The repository includes a scheduled GitHub Actions workflow:

```text
.github/workflows/supabase-health-check.yml
```

The workflow:

- Runs automatically on a schedule
- Supports manual execution
- Performs a minimal read-only Supabase request
- Uses GitHub Actions secrets
- Does not query reservation names or ownership tokens
- Does not query unlisted wishlist content

## Deployment

The frontend is deployed through Cloudflare Pages.

Recommended production configuration:

```text
Production branch: main
Build command: npm run build
Build output directory: dist
```

Required frontend environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

The Supabase secret key must never be added to Cloudflare Pages.

## File Structure

```text
birthday-wishlist/
├── .github/
│   └── workflows/
│       └── supabase-health-check.yml        # Scheduled Supabase availability check
├── docs/
│   ├── supabase-backup.md                   # Backup and restoration guidance
│   └── wishlist-importer.md                 # Importer setup and usage
├── examples/
│   └── wishlist.example.json                # Synthetic wishlist definition example
├── public/                                  # Static public assets
├── schemas/
│   └── wishlist.schema.json                 # Wishlist JSON schema
├── scripts/
│   ├── wishlist-importer/
│   │   ├── export-wishlist.mjs              # Wishlist definition exporter
│   │   ├── import-wishlist.mjs              # Atomic wishlist importer
│   │   ├── preflight-wishlist.mjs           # Read-only Supabase preflight
│   │   ├── sync-wishlist.mjs                # Atomic wishlist synchronizer
│   │   └── validate-wishlist.mjs            # Local JSON validator
│   └── backup-supabase.sh                   # Supabase backup script
├── skills/
│   ├── birthday-wishlist-admin/             # Admin workflow skill
│   └── birthday-wishlist-backup/            # Backup workflow skill
├── src/
│   ├── assets/                              # Local font assets
│   ├── components/                          # Reusable interface components
│   ├── lib/                                 # Supabase client configuration
│   ├── pages/                               # Application pages
│   ├── services/                            # Supabase and Realtime services
│   ├── types/                               # TypeScript data types
│   ├── utils/                               # Local storage utilities
│   ├── App.css                              # Application styles
│   ├── App.tsx                              # Application routing
│   ├── index.css                            # Base stylesheet and font definitions
│   └── main.tsx                             # Frontend entry point
├── supabase/
│   └── migrations/
│       ├── 20260818120000_create_wishlist_import_rpc.sql
│       ├── 20260824120000_add_stable_gift_keys.sql
│       ├── 20260824130000_update_wishlist_import_rpc_for_gift_keys.sql
│       ├── 20260824150000_add_atomic_wishlist_sync_rpc.sql
│       └── 20260826120000_add_wishlist_theme.sql
├── .env.example                             # Frontend environment example
├── .env.wishlist-importer.example           # Local importer environment example
├── AGENTS.md                                # Project AI agent guidelines
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Privacy and Security

- Reservation names are not returned by public wishlist APIs
- Reservation ownership tokens remain private
- Unlisted wishlists are excluded from the public directory
- Conditional updates prevent duplicate reservations
- The importer and synchronizer RPCs are restricted to trusted server-side credentials
- Reservation data is excluded when exporting wishlists
- Reserved gifts are protected from accidental hiding during sync
- Private wishlist definitions are excluded from Git
- Importer credentials are stored only in a local ignored environment file
- Supabase secret keys are never exposed through Vite
- Wishlist imports and synchronizations are executed atomically

## Third-party Assets

- **Typography:** [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) v0.2.0 by [IBM](https://www.ibm.com/plex/), used under the [SIL Open Font License](https://scripts.sil.org/OFL).
- **Icon:** [Tabler Icons](https://github.com/tabler/tabler-icons), used under the [MIT License](https://github.com/tabler/tabler-icons/blob/main/LICENSE).

## Contributing

Contributions are welcome! If you have an idea, improvement, or found a bug, please create a new [GitHub Issue](https://github.com/rostyslavudovenko/birthday-wishlist).

Please check the [existing issues](https://github.com/rostyslavudovenko/birthday-wishlist) before creating a new one to avoid duplicates.

Before submitting a pull request:

```bash
npm run lint
npm run build
git diff --check
```

## License

Licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Rostyslav Udovenko](mailto:rostyslavudovenko@icloud.com)