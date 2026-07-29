# Spare Parts Tracker

A modern internal warehouse spare parts inventory management system built with Next.js, TypeScript, Tailwind CSS, and Prisma.

## Features

### Warehouse Worker Features
- **Scan flow** (`/scan`): capture/upload a label photo, extract details with **AI vision
  (OpenAI)** securely on the server, review editable fields, detect duplicates,
  and either add received quantity to an existing part or create a new one
- Duplicate detection by part number, and by manufacturer + model number
- Adjust quantity (receive/remove) and move a part to a new location — all activity logged
- Manual add-part page with a prompt to use the scan flow instead

### Project Manager Features
- Search by part name, number, manufacturer, model, serial number, or location
- Filter by availability (available / reserved / low stock / out of stock), condition, and warranty status
- Reserve parts for projects with over-reservation prevention
- Track total, reserved, and available quantities

### Reservation lifecycle
`Reserved -> Ready for Pickup -> Picked Up -> Returned` (and `Cancelled`). Picking up a
reservation removes the units from physical stock; returning adds them back.

### Pages
- **Dashboard** - Prominent "Scan a Part" action, metrics, and recent activity
- **Scan** - Camera/photo capture -> review -> duplicate check -> confirmation
- **Inventory** - Searchable/filterable parts list (responsive table + mobile cards)
- **Add Part** - Manual entry (secondary to scanning)
- **Part Details** - View/edit, adjust quantity, move location, reserve, activity log
- **Projects** - Manage projects
- **Reservations** - Track reservations with worker status actions

### Mobile
A bottom navigation bar with a prominent center Scan button appears on small screens,
single-column forms with large tap targets, a sticky Continue/Save bar in the scan flow,
and card layouts instead of wide tables.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase PostgreSQL via Prisma
- **Authentication**: Supabase Auth with Admin, Manager, and Worker roles
- **File storage**: Supabase Storage for scanned part images
- **Icons**: Lucide React
- **Validation**: Zod
- **Testing**: Vitest and GitHub Actions

## Getting Started

### Prerequisites
- Node.js 22+
- A Supabase project, an OpenAI API key, and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure all environment variables:
```bash
# copy the template, then edit .env
cp .env.example .env
```
Set both database URLs, the Supabase URL/keys, and `OPENAI_API_KEY`, plus
`ADMIN_EMAILS` until the first administrator has signed in. Service-role and
OpenAI keys are server-only.

3. Generate Prisma and deploy versioned migrations:
```bash
npm run db:generate
npm run db:migrate:deploy
```

4. Optional local demo seed (destructive and blocked in production):
```bash
ALLOW_DEMO_SEED=yes npm run db:seed:demo
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:migrate:deploy` | Apply reviewed production migrations |
| `npm run db:seed:demo` | Destructive demo seed; requires explicit opt-in |
| `npm run db:studio` | Open Prisma Studio |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Run business-rule tests |

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (parts, reservations, projects, checks)
│   ├── scan/             # Scan a Part flow
│   ├── inventory/        # Inventory page
│   ├── parts/            # Parts pages (add, details)
│   ├── projects/         # Projects page
│   ├── reservations/     # Reservations page
│   ├── layout.tsx        # Root layout (sidebar + mobile nav)
│   └── page.tsx          # Dashboard
├── components/
│   ├── layout/           # Sidebar, mobile nav, page header
│   └── ui/               # Reusable UI components
├── lib/
│   ├── db.ts             # Prisma client
│   ├── inventory.ts      # Business logic (availability, reservations, activity)
│   └── utils.ts          # Utility functions
└── types/
    └── index.ts          # TypeScript types
```

## Deployment to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Add every production variable documented in `.env.example` except
   `ALLOW_DEMO_SEED`
4. Disable public sign-up in Supabase Auth; add the production callback URL
5. Run `npm run db:migrate:deploy`
6. Deploy and sign in with an email listed in `ADMIN_EMAILS`

## Users and roles

Supabase Auth only proves identity. Roles live in the `AppUser` table and are
read on every request, so an admin changing someone's role takes effect on their
next action with no redeploy. Admins invite users, change roles, disable or
reactivate accounts, and remove people from **User Admin** in the app. A sign-in
identity with no `AppUser` row has no access, so users cannot be added by editing
Supabase or Vercel. `ADMIN_EMAILS` only creates the first administrator and stops
having any effect once one exists.

See [docs/PILOT.md](docs/PILOT.md) for roles, backup, rollback, and release steps.

## License

MIT
