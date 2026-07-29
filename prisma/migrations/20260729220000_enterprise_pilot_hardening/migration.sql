-- Adopted migration for the existing Supabase pilot database.
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'WORKER');
CREATE TYPE "ActivitySource" AS ENUM ('WEB', 'SCAN', 'IMPORT', 'SYSTEM');

ALTER TYPE "ActivityType" ADD VALUE 'PROJECT_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'PROJECT_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'PROJECT_DELETED';
ALTER TYPE "ActivityType" ADD VALUE 'INVENTORY_IMPORTED';
ALTER TYPE "ActivityType" ADD VALUE 'INVENTORY_EXPORTED';
ALTER TYPE "ActivityType" ADD VALUE 'USER_INVITED';
ALTER TYPE "ActivityType" ADD VALUE 'USER_ROLE_CHANGED';

ALTER TABLE "Activity"
  ADD COLUMN "actorId" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "source" "ActivitySource" NOT NULL DEFAULT 'WEB';

CREATE TABLE "AppUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'WORKER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScanUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScanUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");
CREATE INDEX "ScanUsage_day_idx" ON "ScanUsage"("day");
CREATE UNIQUE INDEX "ScanUsage_userId_day_key" ON "ScanUsage"("userId", "day");
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");
CREATE INDEX "Activity_actorId_createdAt_idx" ON "Activity"("actorId", "createdAt");
CREATE INDEX "Activity_partId_createdAt_idx" ON "Activity"("partId", "createdAt");
CREATE INDEX "Activity_projectId_createdAt_idx" ON "Activity"("projectId", "createdAt");
CREATE INDEX "Part_manufacturer_idx" ON "Part"("manufacturer");
CREATE INDEX "Part_modelNumber_idx" ON "Part"("modelNumber");
CREATE INDEX "Part_location_aisle_shelf_bin_idx" ON "Part"("location", "aisle", "shelf", "bin");
CREATE INDEX "Part_updatedAt_idx" ON "Part"("updatedAt");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Reservation_partId_status_idx" ON "Reservation"("partId", "status");
CREATE INDEX "Reservation_projectId_status_idx" ON "Reservation"("projectId", "status");
CREATE INDEX "Reservation_createdAt_idx" ON "Reservation"("createdAt");

ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "AppUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScanUsage"
  ADD CONSTRAINT "ScanUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "AppUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Part"
  ADD CONSTRAINT "Part_quantities_valid"
  CHECK ("totalQuantity" >= 0 AND "reservedQuantity" >= 0 AND "reservedQuantity" <= "totalQuantity");
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "Part"
  ADD CONSTRAINT "Part_condition_valid"
  CHECK ("condition" IN ('New', 'Used', 'Refurbished', 'Damaged'));
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_status_valid"
  CHECK ("status" IN ('Reserved', 'Ready for Pickup', 'Picked Up', 'Returned', 'Cancelled'));
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_status_valid"
  CHECK ("status" IN ('Active', 'Planned', 'On Hold', 'Completed'));
