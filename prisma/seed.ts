import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Statuses that still hold units in the warehouse (i.e. count against
 * availability). Mirrors ACTIVE_RESERVATION_STATUSES in src/lib/inventory.ts.
 */
const ACTIVE_STATUSES = ["Reserved", "Ready for Pickup"];

/**
 * Build a lightweight, self-contained catalog "photo" for a part as an inline
 * SVG data URL. Using a data URL means the seed needs no external files or
 * network access — every record renders an image reliably, even offline during
 * the demo. Each category gets its own colour + glyph so the inventory grid
 * looks like a real digital record of the warehouse.
 */
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

const CATEGORY_STYLE: Record<Category, { from: string; to: string; glyph: string }> = {
  // glyph is a small piece of SVG drawn centered in the card.
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

function partImage(category: Category, partNumber: string, manufacturer: string): string {
  const { from, to, glyph } = CATEGORY_STYLE[category];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#g)"/>
<rect x="16" y="16" width="368" height="268" rx="14" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
${glyph}
<text x="200" y="210" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${partNumber}</text>
<text x="200" y="242" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">${manufacturer}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.activity.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.part.deleteMany();
  await prisma.project.deleteMany();

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "HVAC System Upgrade",
        description: "Upgrading the main building HVAC system",
        status: "Active",
      },
    }),
    prisma.project.create({
      data: {
        name: "Assembly Line Maintenance",
        description: "Quarterly maintenance for production line A",
        status: "Active",
      },
    }),
    prisma.project.create({
      data: {
        name: "Emergency Pump Repair",
        description: "Critical repair for cooling pump station",
        status: "Active",
      },
    }),
    prisma.project.create({
      data: {
        name: "Electrical Panel Replacement",
        description: "Replacing outdated electrical panels in Section C",
        status: "Planned",
      },
    }),
    prisma.project.create({
      data: {
        name: "Conveyor Belt Overhaul",
        description: "Complete overhaul of warehouse conveyor system",
        status: "Completed",
      },
    }),
  ]);

  // Create parts with realistic data.
  // Quantities are chosen so the warehouse holds exactly 15 unique parts and
  // 295 total units for the demo dashboard.
  const parts = await Promise.all([
    // ── Hero part for the demo script ───────────────────────────────────────
    // Johnson Controls M9208-GGA-3 Actuator: 12 total, 3 reserved (created
    // below) -> 9 available, in Warehouse A / Aisle 3 / Shelf B / Bin 12.
    prisma.part.create({
      data: {
        name: "M9208-GGA-3 Actuator",
        partNumber: "M9208-GGA-3",
        manufacturer: "Johnson Controls",
        modelNumber: "M9208-GGA-3",
        serialNumber: "JC24-0098821",
        totalQuantity: 12,
        location: "Warehouse A",
        aisle: "3",
        shelf: "B",
        bin: "12",
        warrantyExpiration: new Date("2027-09-30"),
        condition: "New",
        notes: "Non-spring-return electric actuator, 24 VAC, 200 lb-in torque",
        imageUrl: partImage("actuator", "M9208-GGA-3", "Johnson Controls"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Industrial Ball Bearing",
        partNumber: "SKF-6205-2RS",
        manufacturer: "SKF",
        modelNumber: "6205-2RS1",
        serialNumber: "SKF2024001234",
        totalQuantity: 48,
        location: "Warehouse A",
        aisle: "A",
        shelf: "12",
        bin: "3",
        warrantyExpiration: new Date("2026-12-31"),
        condition: "New",
        notes: "Deep groove ball bearing, sealed",
        imageUrl: partImage("bearing", "SKF-6205-2RS", "SKF"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Hydraulic Pump Motor",
        partNumber: "PARKER-PGP505",
        manufacturer: "Parker Hannifin",
        modelNumber: "PGP505A0080",
        serialNumber: "PH2024567890",
        totalQuantity: 5,
        location: "Warehouse B",
        aisle: "B",
        shelf: "05",
        bin: "1",
        warrantyExpiration: new Date("2027-06-15"),
        condition: "New",
        notes: "5HP, 3-phase motor for hydraulic systems",
        imageUrl: partImage("motor", "PARKER-PGP505", "Parker Hannifin"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Pneumatic Cylinder",
        partNumber: "SMC-CQ2B32-50D",
        manufacturer: "SMC Corporation",
        modelNumber: "CQ2B32-50DZ",
        serialNumber: "SMC2024112233",
        totalQuantity: 15,
        location: "Warehouse A",
        aisle: "A",
        shelf: "08",
        bin: "2",
        warrantyExpiration: new Date("2026-09-30"),
        condition: "New",
        notes: "Compact cylinder, 32mm bore, 50mm stroke",
        imageUrl: partImage("cylinder", "SMC-CQ2B32-50D", "SMC Corporation"),
      },
    }),
    prisma.part.create({
      data: {
        name: "PLC Controller Module",
        partNumber: "SIEMENS-6ES7214",
        manufacturer: "Siemens",
        modelNumber: "6ES7214-1AG40-0XB0",
        serialNumber: "SIE2024998877",
        totalQuantity: 3,
        location: "Warehouse C",
        aisle: "C",
        shelf: "01",
        bin: "1",
        warrantyExpiration: new Date("2028-03-20"),
        condition: "New",
        notes: "SIMATIC S7-1200 CPU module",
        imageUrl: partImage("controller", "SIEMENS-6ES7214", "Siemens"),
      },
    }),
    prisma.part.create({
      data: {
        name: "V-Belt Drive",
        partNumber: "GATES-8V1400",
        manufacturer: "Gates Corporation",
        modelNumber: "8V1400",
        serialNumber: null,
        totalQuantity: 30,
        location: "Warehouse A",
        aisle: "A",
        shelf: "15",
        bin: "4",
        warrantyExpiration: new Date("2026-08-10"),
        condition: "New",
        notes: "Industrial V-belt, 140 inch length",
        imageUrl: partImage("belt", "GATES-8V1400", "Gates Corporation"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Contactor Relay",
        partNumber: "ABB-AF09-30-10",
        manufacturer: "ABB",
        modelNumber: "AF09-30-10-13",
        serialNumber: "ABB2024445566",
        totalQuantity: 15,
        location: "Warehouse C",
        aisle: "C",
        shelf: "03",
        bin: "2",
        warrantyExpiration: new Date("2027-01-15"),
        condition: "New",
        notes: "3-pole contactor, 9A, 100-250V AC/DC",
        imageUrl: partImage("relay", "ABB-AF09-30-10", "ABB"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Pressure Transducer",
        partNumber: "HONEYWELL-PX3AN2",
        manufacturer: "Honeywell",
        modelNumber: "PX3AN2BS100PSAAX",
        serialNumber: "HW2024778899",
        totalQuantity: 8,
        location: "Warehouse B",
        aisle: "B",
        shelf: "02",
        bin: "3",
        warrantyExpiration: new Date("2027-04-30"),
        condition: "New",
        notes: "0-100 PSI, 4-20mA output",
        imageUrl: partImage("sensor", "HONEYWELL-PX3AN2", "Honeywell"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Servo Motor",
        partNumber: "FANUC-A06B-0227",
        manufacturer: "FANUC",
        modelNumber: "A06B-0227-B100",
        serialNumber: "FAN2024334455",
        totalQuantity: 2,
        location: "Warehouse C",
        aisle: "C",
        shelf: "02",
        bin: "1",
        warrantyExpiration: new Date("2028-01-10"),
        condition: "New",
        notes: "AC servo motor, 2.5kW, high precision",
        imageUrl: partImage("motor", "FANUC-A06B-0227", "FANUC"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Heat Exchanger Gasket",
        partNumber: "ALFA-LAVAL-M10B",
        manufacturer: "Alfa Laval",
        modelNumber: "M10-BFG",
        serialNumber: null,
        totalQuantity: 97,
        location: "Warehouse A",
        aisle: "A",
        shelf: "20",
        bin: "1",
        warrantyExpiration: new Date("2026-06-20"),
        condition: "New",
        notes: "NBR gasket for M10 heat exchanger",
        imageUrl: partImage("gasket", "ALFA-LAVAL-M10B", "Alfa Laval"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Industrial Filter Element",
        partNumber: "DONALDSON-P551000",
        manufacturer: "Donaldson",
        modelNumber: "P551000",
        serialNumber: null,
        totalQuantity: 25,
        location: "Warehouse A",
        aisle: "A",
        shelf: "18",
        bin: "3",
        warrantyExpiration: new Date("2026-11-05"),
        condition: "New",
        notes: "Hydraulic filter, 10 micron",
        imageUrl: partImage("filter", "DONALDSON-P551000", "Donaldson"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Coupling Assembly",
        partNumber: "LOVEJOY-L150",
        manufacturer: "Lovejoy",
        modelNumber: "L-150",
        serialNumber: null,
        totalQuantity: 12,
        location: "Warehouse B",
        aisle: "B",
        shelf: "08",
        bin: "2",
        warrantyExpiration: new Date("2027-02-28"),
        condition: "New",
        notes: "Jaw coupling, complete assembly",
        imageUrl: partImage("coupling", "LOVEJOY-L150", "Lovejoy"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Temperature Sensor",
        partNumber: "OMEGA-KMQSS-125",
        manufacturer: "Omega Engineering",
        modelNumber: "KMQSS-125U-6",
        serialNumber: "OMG2024556677",
        totalQuantity: 18,
        location: "Warehouse B",
        aisle: "B",
        shelf: "04",
        bin: "1",
        warrantyExpiration: new Date("2026-10-15"),
        condition: "New",
        notes: 'Type K thermocouple, 1/8" dia, 6" length',
        imageUrl: partImage("sensor", "OMEGA-KMQSS-125", "Omega Engineering"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Used VFD Drive",
        partNumber: "ABB-ACS550-01",
        manufacturer: "ABB",
        modelNumber: "ACS550-01-08A8-4",
        serialNumber: "ABB2022112244",
        totalQuantity: 1,
        location: "Warehouse C",
        aisle: "C",
        shelf: "04",
        bin: "2",
        warrantyExpiration: null,
        condition: "Used",
        notes: "Variable frequency drive, 7.5HP, tested working",
        imageUrl: partImage("drive", "ABB-ACS550-01", "ABB"),
      },
    }),
    prisma.part.create({
      data: {
        name: "Gearbox Assembly",
        partNumber: "SEW-R57DRE90",
        manufacturer: "SEW-Eurodrive",
        modelNumber: "R57DRE90M4",
        serialNumber: "SEW2024667788",
        totalQuantity: 4,
        location: "Warehouse B",
        aisle: "B",
        shelf: "12",
        bin: "1",
        warrantyExpiration: new Date("2028-05-20"),
        condition: "New",
        notes: "Helical gear unit with motor, ratio 28.31:1",
        imageUrl: partImage("gearbox", "SEW-R57DRE90", "SEW-Eurodrive"),
      },
    }),
  ]);

  // Index parts by part number so reservations/activities are easy to read.
  const byNumber = Object.fromEntries(parts.map((p) => [p.partNumber, p]));

  // Create reservations. The actuator's 3-unit reservation is what makes the
  // hero part read "12 total / 3 reserved / 9 available" for the demo.
  await Promise.all([
    prisma.reservation.create({
      data: {
        partId: byNumber["M9208-GGA-3"].id,
        projectId: projects[0].id, // HVAC System Upgrade
        quantity: 3,
        status: "Reserved",
        notes: "Damper actuators for rooftop unit RTU-2",
      },
    }),
    prisma.reservation.create({
      data: {
        partId: byNumber["SKF-6205-2RS"].id,
        projectId: projects[1].id, // Assembly Line Maintenance
        quantity: 10,
        status: "Reserved",
        notes: "For conveyor roller replacement",
      },
    }),
    prisma.reservation.create({
      data: {
        partId: byNumber["PARKER-PGP505"].id,
        projectId: projects[2].id, // Emergency Pump Repair
        quantity: 1,
        status: "Ready for Pickup",
        notes: "Critical replacement for pump station",
      },
    }),
    prisma.reservation.create({
      data: {
        partId: byNumber["ABB-AF09-30-10"].id,
        projectId: projects[3].id, // Electrical Panel Replacement
        quantity: 8,
        status: "Reserved",
        notes: "For new electrical panel installation",
      },
    }),
    prisma.reservation.create({
      data: {
        partId: byNumber["GATES-8V1400"].id,
        projectId: projects[0].id, // HVAC System Upgrade
        quantity: 6,
        status: "Reserved",
        notes: "For blower motor assembly",
      },
    }),
  ]);

  // Recompute reservedQuantity for every part based on active reservations so
  // the denormalized field matches the app's business logic.
  for (const part of parts) {
    const active = await prisma.reservation.findMany({
      where: { partId: part.id, status: { in: ACTIVE_STATUSES } },
      select: { quantity: true },
    });
    const reservedQuantity = active.reduce((sum, r) => sum + r.quantity, 0);
    await prisma.part.update({
      where: { id: part.id },
      data: { reservedQuantity },
    });
  }

  // Create activity logs
  const activities: {
    type:
      | "PART_CREATED"
      | "QUANTITY_ADDED"
      | "PART_MOVED"
      | "RESERVATION_CREATED"
      | "RESERVATION_READY"
      | "PART_PICKED_UP";
    details: string;
    partId?: string;
    projectId?: string;
  }[] = [
    { type: "PART_CREATED", details: "Added 12 units of M9208-GGA-3 Actuator", partId: byNumber["M9208-GGA-3"].id },
    { type: "PART_CREATED", details: "Added 48 units of Industrial Ball Bearing", partId: byNumber["SKF-6205-2RS"].id },
    { type: "PART_CREATED", details: "Added 5 units of Hydraulic Pump Motor", partId: byNumber["PARKER-PGP505"].id },
    { type: "RESERVATION_CREATED", details: "Reserved 3 M9208-GGA-3 Actuators for HVAC System Upgrade", partId: byNumber["M9208-GGA-3"].id, projectId: projects[0].id },
    { type: "RESERVATION_CREATED", details: "Reserved 10 Ball Bearings for Assembly Line Maintenance", partId: byNumber["SKF-6205-2RS"].id, projectId: projects[1].id },
    { type: "RESERVATION_CREATED", details: "Reserved 1 Hydraulic Pump Motor for Emergency Pump Repair", partId: byNumber["PARKER-PGP505"].id, projectId: projects[2].id },
    { type: "RESERVATION_READY", details: "Hydraulic Pump Motor staged for Emergency Pump Repair", partId: byNumber["PARKER-PGP505"].id, projectId: projects[2].id },
    { type: "PART_MOVED", details: "Moved Industrial Filter Element to Warehouse A, Aisle A, Shelf 18", partId: byNumber["DONALDSON-P551000"].id },
    { type: "RESERVATION_CREATED", details: "Reserved 8 Contactor Relays for Electrical Panel Replacement", partId: byNumber["ABB-AF09-30-10"].id, projectId: projects[3].id },
    { type: "PART_CREATED", details: "Added 4 units of Gearbox Assembly", partId: byNumber["SEW-R57DRE90"].id },
  ];

  for (let i = 0; i < activities.length; i++) {
    await prisma.activity.create({
      data: {
        ...activities[i],
        createdAt: new Date(Date.now() - (activities.length - i) * 3600000),
      },
    });
  }

  const totalUnits = parts.reduce((sum, p) => sum + p.totalQuantity, 0);

  console.log("Database seeded successfully!");
  console.log(`Created ${projects.length} projects`);
  console.log(`Created ${parts.length} parts (${totalUnits} total units)`);
  console.log(`Created 5 reservations`);
  console.log(`Created ${activities.length} activity logs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
