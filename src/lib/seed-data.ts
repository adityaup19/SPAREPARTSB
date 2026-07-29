import type { PrismaClient } from "@prisma/client";
import jcInventoryRaw from "../data/jc-inventory.json";

/**
 * Demo seed data + a reusable `seedDatabase` function.
 *
 * The dataset is the REAL Johnson Controls warehouse export (cleaned and
 * de-duplicated into src/data/jc-inventory.json) PLUS the M9208-GGA-3 "hero"
 * part that the Scan-a-Part / duplicate-detection demo relies on.
 *
 * Imported by BOTH:
 *  - prisma/seed.ts (the `npm run db:seed` CLI script), and
 *  - src/app/api/demo/reset/route.ts (the in-app "Reset demo data" button),
 * so the deployed demo can be reset to a pristine state from the browser.
 */

const ACTIVE_STATUSES = ["Reserved", "Ready for Pickup"];

type Category =
  | "actuator"
  | "bearing"
  | "motor"
  | "cylinder"
  | "controller"
  | "belt"
  | "relay"
  | "sensor"
  | "gasket"
  | "filter"
  | "coupling"
  | "pump"
  | "drive"
  | "gearbox";

interface JcPart {
  name: string;
  partNumber: string;
  manufacturer: string;
  modelNumber: string | null;
  totalQuantity: number;
  location: string;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  condition: string;
  notes: string | null;
  category: Category;
}

const jcInventory = jcInventoryRaw as unknown as JcPart[];

const CATEGORY_STYLE: Record<Category, { from: string; to: string; glyph: string }> = {
  actuator: { from: "#1d4ed8", to: "#0ea5e9", glyph: `<rect x="150" y="95" width="100" height="60" rx="8" fill="#fff"/><rect x="192" y="70" width="16" height="30" fill="#fff"/><circle cx="200" cy="125" r="14" fill="#1d4ed8"/>` },
  bearing: { from: "#334155", to: "#64748b", glyph: `<circle cx="200" cy="125" r="52" fill="none" stroke="#fff" stroke-width="10"/><circle cx="200" cy="125" r="22" fill="none" stroke="#fff" stroke-width="10"/>` },
  motor: { from: "#7c3aed", to: "#a855f7", glyph: `<rect x="150" y="100" width="80" height="50" rx="6" fill="#fff"/><rect x="230" y="112" width="26" height="26" fill="#fff"/><circle cx="150" cy="125" r="10" fill="#7c3aed"/>` },
  cylinder: { from: "#0891b2", to: "#22d3ee", glyph: `<rect x="150" y="108" width="110" height="34" rx="17" fill="#fff"/><rect x="256" y="118" width="30" height="14" fill="#fff"/>` },
  controller: { from: "#0f766e", to: "#14b8a6", glyph: `<rect x="158" y="92" width="84" height="66" rx="6" fill="#fff"/><rect x="168" y="102" width="64" height="10" fill="#0f766e"/><rect x="168" y="118" width="40" height="8" fill="#14b8a6"/><rect x="168" y="132" width="52" height="8" fill="#14b8a6"/>` },
  belt: { from: "#b45309", to: "#f59e0b", glyph: `<rect x="150" y="105" width="110" height="40" rx="20" fill="none" stroke="#fff" stroke-width="10"/>` },
  relay: { from: "#4338ca", to: "#6366f1", glyph: `<rect x="165" y="95" width="70" height="60" rx="6" fill="#fff"/><rect x="175" y="150" width="8" height="18" fill="#fff"/><rect x="217" y="150" width="8" height="18" fill="#fff"/>` },
  sensor: { from: "#be123c", to: "#f43f5e", glyph: `<circle cx="200" cy="118" r="26" fill="#fff"/><rect x="194" y="140" width="12" height="34" fill="#fff"/>` },
  gasket: { from: "#65a30d", to: "#a3e635", glyph: `<circle cx="200" cy="125" r="48" fill="none" stroke="#fff" stroke-width="14"/>` },
  filter: { from: "#0369a1", to: "#38bdf8", glyph: `<path d="M160 90 h80 l-18 34 v40 h-44 v-40 z" fill="#fff"/>` },
  coupling: { from: "#9333ea", to: "#c084fc", glyph: `<circle cx="182" cy="125" r="30" fill="#fff"/><circle cx="222" cy="125" r="30" fill="#fff" opacity="0.7"/>` },
  pump: { from: "#0d9488", to: "#2dd4bf", glyph: `<circle cx="196" cy="125" r="34" fill="#fff"/><rect x="196" y="86" width="34" height="16" fill="#fff"/>` },
  drive: { from: "#c2410c", to: "#fb923c", glyph: `<rect x="160" y="92" width="80" height="66" rx="6" fill="#fff"/><circle cx="200" cy="125" r="16" fill="#c2410c"/>` },
  gearbox: { from: "#475569", to: "#94a3b8", glyph: `<circle cx="200" cy="125" r="30" fill="none" stroke="#fff" stroke-width="10"/><rect x="194" y="82" width="12" height="16" fill="#fff"/><rect x="194" y="152" width="12" height="16" fill="#fff"/><rect x="240" y="119" width="16" height="12" fill="#fff"/><rect x="144" y="119" width="16" height="12" fill="#fff"/>` },
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function partImage(category: Category, partNumber: string, manufacturer: string): string {
  const { from, to, glyph } = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.controller;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#g)"/>
<rect x="16" y="16" width="368" height="268" rx="14" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
${glyph}
<text x="200" y="210" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(partNumber)}</text>
<text x="200" y="242" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">${esc(manufacturer)}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface SeedResult {
  projects: number;
  parts: number;
  units: number;
  reservations: number;
  activities: number;
}

// The hero part the Scan-a-Part demo depends on (not in the JC export).
const HERO_PART_NUMBER = "M9208-GGA-3";

// Demo reservations. Keyed by part number so they attach to real records.
// The hero reservation of 3 is what makes it read "12 total / 3 reserved / 9 available".
const RESERVATION_PLAN: {
  partNumber: string;
  projectIndex: number;
  quantity: number;
  status: string;
  notes: string;
}[] = [
  { partNumber: HERO_PART_NUMBER, projectIndex: 0, quantity: 3, status: "Reserved", notes: "Damper actuators for rooftop unit RTU-2" },
  { partNumber: "0743276", projectIndex: 1, quantity: 5, status: "Reserved", notes: "MC TrueAlert strobes for line A signaling" },
  { partNumber: "0743260", projectIndex: 3, quantity: 2, status: "Reserved", notes: "Ceiling S/V units for Section C" },
  { partNumber: "07431057", projectIndex: 2, quantity: 1, status: "Ready for Pickup", notes: "Staged for pump station room signaling" },
];

/**
 * Wipe and repopulate the database with the pristine demo dataset:
 * the real Johnson Controls inventory (315 parts) plus the M9208-GGA-3 hero
 * part (12 total / 3 reserved / 9 available).
 */
export async function seedDatabase(prisma: PrismaClient): Promise<SeedResult> {
  // Clear existing data
  await prisma.activity.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.part.deleteMany();
  await prisma.project.deleteMany();

  const projects = await Promise.all([
    prisma.project.create({ data: { name: "HVAC System Upgrade", description: "Upgrading the main building HVAC system", status: "Active" } }),
    prisma.project.create({ data: { name: "Fire Alarm Panel Retrofit", description: "Replacing legacy 4100 panels across the campus", status: "Active" } }),
    prisma.project.create({ data: { name: "Emergency Pump Repair", description: "Critical repair for cooling pump station", status: "Active" } }),
    prisma.project.create({ data: { name: "Section C Notification Upgrade", description: "New strobes and speakers for Section C", status: "Planned" } }),
    prisma.project.create({ data: { name: "Warehouse Recount 2026", description: "Full physical inventory reconciliation", status: "Completed" } }),
  ]);

  // Bulk-insert the real Johnson Controls inventory.
  const jcData = jcInventory.map((p) => ({
    name: p.name,
    partNumber: p.partNumber,
    manufacturer: p.manufacturer,
    modelNumber: p.modelNumber,
    totalQuantity: p.totalQuantity,
    reservedQuantity: 0,
    location: p.location,
    aisle: p.aisle,
    shelf: p.shelf,
    bin: p.bin,
    condition: p.condition,
    notes: p.notes,
    imageUrl: partImage(p.category, p.partNumber, p.manufacturer),
  }));

  // Hero part for the Scan-a-Part / duplicate-detection demo.
  const heroData = {
    name: "M9208-GGA-3 Actuator",
    partNumber: HERO_PART_NUMBER,
    manufacturer: "Johnson Controls",
    modelNumber: "M9208-GGA-3",
    serialNumber: "JC24-0098821",
    totalQuantity: 12,
    reservedQuantity: 0,
    location: "Warehouse A",
    aisle: "3",
    shelf: "B",
    bin: "12",
    warrantyExpiration: new Date("2027-09-30"),
    condition: "New",
    notes: "Non-spring-return electric actuator, 24 VAC, 200 lb-in torque",
    imageUrl: partImage("actuator", HERO_PART_NUMBER, "Johnson Controls"),
  };

  await prisma.part.createMany({ data: [heroData, ...jcData], skipDuplicates: true });

  const totalParts = await prisma.part.count();
  const unitsAgg = await prisma.part.aggregate({ _sum: { totalQuantity: true } });
  const units = unitsAgg._sum.totalQuantity ?? 0;

  // Create the demo reservations against real records.
  const reservedByPartId = new Map<string, number>();
  let reservationCount = 0;
  for (const plan of RESERVATION_PLAN) {
    const part = await prisma.part.findUnique({ where: { partNumber: plan.partNumber } });
    if (!part || part.totalQuantity < plan.quantity) continue;
    await prisma.reservation.create({
      data: {
        partId: part.id,
        projectId: projects[plan.projectIndex].id,
        quantity: plan.quantity,
        status: plan.status,
        notes: plan.notes,
      },
    });
    reservationCount++;
    if (ACTIVE_STATUSES.includes(plan.status)) {
      reservedByPartId.set(part.id, (reservedByPartId.get(part.id) ?? 0) + plan.quantity);
    }
  }

  // Update reservedQuantity only for the affected parts (fast on a hosted DB).
  for (const [partId, reservedQuantity] of reservedByPartId) {
    await prisma.part.update({ where: { id: partId }, data: { reservedQuantity } });
  }

  // A few activity-log entries so the dashboard feels alive.
  const hero = await prisma.part.findUnique({ where: { partNumber: HERO_PART_NUMBER } });
  const activities: {
    type: "PART_CREATED" | "QUANTITY_ADDED" | "PART_MOVED" | "RESERVATION_CREATED" | "RESERVATION_READY" | "PART_PICKED_UP";
    details: string;
    partId?: string | null;
    projectId?: string | null;
  }[] = [
    { type: "PART_CREATED", details: `Imported ${jcInventory.length} parts from Johnson Controls warehouse export`, partId: null },
    { type: "PART_CREATED", details: "Added 12 units of M9208-GGA-3 Actuator", partId: hero?.id ?? null },
    { type: "RESERVATION_CREATED", details: "Reserved 3 M9208-GGA-3 Actuators for HVAC System Upgrade", partId: hero?.id ?? null, projectId: projects[0].id },
    { type: "RESERVATION_CREATED", details: "Reserved 5 MC TrueAlert strobes for Fire Alarm Panel Retrofit", projectId: projects[1].id },
    { type: "RESERVATION_READY", details: "AV Wall Red Fire staged for Emergency Pump Repair", projectId: projects[2].id },
    { type: "PART_MOVED", details: "Recounted Row 5 during Warehouse Recount 2026" },
  ];

  for (let i = 0; i < activities.length; i++) {
    await prisma.activity.create({
      data: { ...activities[i], createdAt: new Date(Date.now() - (activities.length - i) * 3600000) },
    });
  }

  return {
    projects: projects.length,
    parts: totalParts,
    units,
    reservations: reservationCount,
    activities: activities.length,
  };
}
