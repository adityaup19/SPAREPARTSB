import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACTIVE_STATUSES = ["Reserved", "Ready for Pickup"];

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

  // Create parts with realistic data
  const parts = await Promise.all([
    prisma.part.create({
      data: {
        name: "Industrial Ball Bearing",
        partNumber: "SKF-6205-2RS",
        manufacturer: "SKF",
        modelNumber: "6205-2RS1",
        serialNumber: "SKF2024001234",
        totalQuantity: 50,
        location: "Warehouse A",
        aisle: "A",
        shelf: "12",
        bin: "3",
        warrantyExpiration: new Date("2026-12-31"),
        condition: "New",
        notes: "Deep groove ball bearing, sealed",
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
      },
    }),
    prisma.part.create({
      data: {
        name: "Pneumatic Cylinder",
        partNumber: "SMC-CQ2B32-50D",
        manufacturer: "SMC Corporation",
        modelNumber: "CQ2B32-50DZ",
        serialNumber: "SMC2024112233",
        totalQuantity: 20,
        location: "Warehouse A",
        aisle: "A",
        shelf: "08",
        bin: "2",
        warrantyExpiration: new Date("2026-09-30"),
        condition: "New",
        notes: "Compact cylinder, 32mm bore, 50mm stroke",
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
      },
    }),
    prisma.part.create({
      data: {
        name: "Heat Exchanger Gasket",
        partNumber: "ALFA-LAVAL-M10B",
        manufacturer: "Alfa Laval",
        modelNumber: "M10-BFG",
        serialNumber: null,
        totalQuantity: 100,
        location: "Warehouse A",
        aisle: "A",
        shelf: "20",
        bin: "1",
        warrantyExpiration: new Date("2026-06-20"),
        condition: "New",
        notes: "NBR gasket for M10 heat exchanger",
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
      },
    }),
    prisma.part.create({
      data: {
        name: "Refurbished Pump Assembly",
        partNumber: "GRUNDFOS-CR10-04",
        manufacturer: "Grundfos",
        modelNumber: "CR10-04",
        serialNumber: "GF2023889900",
        totalQuantity: 2,
        location: "Warehouse B",
        aisle: "B",
        shelf: "10",
        bin: "1",
        warrantyExpiration: new Date("2026-04-01"),
        condition: "Refurbished",
        notes: "Vertical multistage centrifugal pump, factory refurbished",
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
      },
    }),
  ]);

  // Create reservations
  await Promise.all([
    prisma.reservation.create({
      data: {
        partId: parts[0].id, // Ball Bearings
        projectId: projects[1].id, // Assembly Line Maintenance
        quantity: 10,
        status: "Reserved",
        notes: "For conveyor roller replacement",
      },
    }),
    prisma.reservation.create({
      data: {
        partId: parts[1].id, // Hydraulic Pump Motor
        projectId: projects[2].id, // Emergency Pump Repair
        quantity: 1,
        status: "Ready for Pickup",
        notes: "Critical replacement for pump station",
      },
    }),
    prisma.reservation.create({
      data: {
        partId: parts[5].id, // Contactor Relay
        projectId: projects[3].id, // Electrical Panel Replacement
        quantity: 8,
        status: "Reserved",
        notes: "For new electrical panel installation",
      },
    }),
    prisma.reservation.create({
      data: {
        partId: parts[2].id, // Pneumatic Cylinder
        projectId: projects[1].id, // Assembly Line Maintenance
        quantity: 5,
        status: "Picked Up",
        notes: "Already deployed to production line",
      },
    }),
    prisma.reservation.create({
      data: {
        partId: parts[4].id, // V-Belt
        projectId: projects[0].id, // HVAC System Upgrade
        quantity: 6,
        status: "Reserved",
        notes: "For blower motor assembly",
      },
    }),
  ]);

  // "Picked Up" units have physically left the warehouse -> reduce total.
  await prisma.part.update({
    where: { id: parts[2].id },
    data: { totalQuantity: { decrement: 5 } },
  });

  // Recompute reservedQuantity for every part based on active reservations.
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
    { type: "PART_CREATED", details: "Added 50 units of Industrial Ball Bearing", partId: parts[0].id },
    { type: "PART_CREATED", details: "Added 5 units of Hydraulic Pump Motor", partId: parts[1].id },
    { type: "RESERVATION_CREATED", details: "Reserved 10 Ball Bearings for Assembly Line Maintenance", partId: parts[0].id, projectId: projects[1].id },
    { type: "RESERVATION_CREATED", details: "Reserved 1 Hydraulic Pump Motor for Emergency Pump Repair", partId: parts[1].id, projectId: projects[2].id },
    { type: "RESERVATION_READY", details: "Hydraulic Pump Motor staged for Emergency Pump Repair", partId: parts[1].id, projectId: projects[2].id },
    { type: "PART_CREATED", details: "Added 20 units of Pneumatic Cylinder", partId: parts[2].id },
    { type: "PART_PICKED_UP", details: "5 Pneumatic Cylinders picked up for Assembly Line Maintenance", partId: parts[2].id, projectId: projects[1].id },
    { type: "PART_MOVED", details: "Moved Industrial Filter Element to Warehouse A, Aisle A, Shelf 18", partId: parts[9].id },
    { type: "RESERVATION_CREATED", details: "Reserved 8 Contactor Relays for Electrical Panel Replacement", partId: parts[5].id, projectId: projects[3].id },
    { type: "PART_CREATED", details: "Added 4 units of Gearbox Assembly", partId: parts[14].id },
  ];

  for (let i = 0; i < activities.length; i++) {
    await prisma.activity.create({
      data: {
        ...activities[i],
        createdAt: new Date(Date.now() - (activities.length - i) * 3600000),
      },
    });
  }

  console.log("Database seeded successfully!");
  console.log(`Created ${projects.length} projects`);
  console.log(`Created ${parts.length} parts`);
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
