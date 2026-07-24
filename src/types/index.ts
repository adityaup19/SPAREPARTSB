export type Condition = "New" | "Refurbished" | "Used" | "Damaged";

export type ProjectStatus = "Active" | "Planned" | "Completed" | "On Hold";

export type ReservationStatus =
  | "Reserved"
  | "Ready for Pickup"
  | "Picked Up"
  | "Returned"
  | "Cancelled";

export type ActivityType =
  | "PART_CREATED"
  | "PART_UPDATED"
  | "PART_DELETED"
  | "QUANTITY_ADDED"
  | "QUANTITY_REMOVED"
  | "PART_MOVED"
  | "RESERVATION_CREATED"
  | "RESERVATION_UPDATED"
  | "RESERVATION_READY"
  | "RESERVATION_CANCELLED"
  | "PART_PICKED_UP"
  | "PART_RETURNED";

export interface Part {
  id: string;
  name: string;
  partNumber: string;
  manufacturer: string;
  modelNumber: string | null;
  serialNumber: string | null;
  totalQuantity: number;
  reservedQuantity: number;
  location: string;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  condition: string;
  warrantyExpiration: Date | null;
  notes: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  reservations?: Reservation[];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  reservations?: Reservation[];
}

export interface Reservation {
  id: string;
  partId: string;
  projectId: string;
  quantity: number;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  part?: Part;
  project?: Project;
}

export interface Activity {
  id: string;
  type: ActivityType;
  details: string | null;
  partId: string | null;
  projectId: string | null;
  createdAt: Date;
  part?: Part | null;
  project?: Project | null;
}

export interface DashboardMetrics {
  totalUniqueParts: number;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  warrantiesExpiringSoon: number;
}

export interface PartFormData {
  name: string;
  partNumber: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  quantity: number;
  location: string;
  aisle: string;
  shelf: string;
  bin: string;
  condition: string;
  warrantyExpiration: string;
  notes: string;
  imageUrl: string;
}

export interface ReservationFormData {
  partId: string;
  projectId: string;
  quantity: number;
  notes: string;
}
