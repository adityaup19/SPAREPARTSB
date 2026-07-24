# Spare Parts Tracker

A modern internal warehouse spare parts inventory management system built with Next.js, TypeScript, Tailwind CSS, and Prisma.

## Features

### Warehouse Worker Features
- **Scan flow** (`/scan`): capture/upload a label photo, extract details (simulated
  prototype OCR — no provider connected yet), review editable fields, detect duplicates,
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
- **Database**: SQLite (via Prisma) - easily swappable to PostgreSQL
- **Icons**: Lucide React
- **Validation**: Zod

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client and create database:
```bash
npm run db:push
```

3. Seed the database with sample data:
```bash
npm run db:seed
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed with sample data |
| `npm run db:reset` | Reset and reseed database |
| `npm run db:studio` | Open Prisma Studio |

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

## Future Enhancements

The codebase is structured to easily add:
- **PostgreSQL**: Change datasource in `prisma/schema.prisma`
- **Google Vision OCR**: Add to `/api/ocr` endpoint
- **Microsoft Authentication**: Add NextAuth.js with Microsoft provider
- **Azure Integration**: Add Azure SDK for cloud services

## Deployment to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables (if using PostgreSQL):
   - `DATABASE_URL`: Your database connection string
4. Deploy

For SQLite (development only), the database will be created automatically.

## License

MIT
