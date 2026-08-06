"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Modal,
  Select,
  Alert,
  EmptyState,
  TableLoading,
} from "@/components/ui";
import { ClipboardList, Trash2, PackageCheck, Truck, RotateCcw, Package } from "lucide-react";
import Link from "next/link";
import { getStatusColor, formatDate } from "@/lib/utils";
import type { Reservation, Part, Project } from "@/types";
import { useCurrentUser } from "@/components/auth-provider";

interface ReservationWithDetails extends Reservation {
  part: Part;
  project: Project;
}

const statusFilterOptions = [
  { value: "", label: "All Statuses" },
  { value: "Reserved", label: "Reserved" },
  { value: "Ready for Pickup", label: "Ready for Pickup" },
  { value: "Picked Up", label: "Picked Up" },
  { value: "Returned", label: "Returned" },
  { value: "Cancelled", label: "Cancelled" },
];

const statusChangeOptions = [
  { value: "Reserved", label: "Reserved" },
  { value: "Ready for Pickup", label: "Ready for Pickup" },
  { value: "Picked Up", label: "Picked Up" },
  { value: "Returned", label: "Returned" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function ReservationsPage() {
  const currentUser = useCurrentUser();
  const canManage = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch("/api/reservations");
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = statusFilter
    ? reservations.filter((r) => r.status === statusFilter)
    : reservations;

  const setStatus = async (reservation: ReservationWithDetails, status: string) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }
      setSuccess(`Reservation marked "${status}"`);
      setShowStatusModal(false);
      fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update reservation status");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    try {
      const response = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to cancel reservation");
      setSuccess("Reservation cancelled successfully");
      fetchReservations();
    } catch {
      setError("Failed to cancel reservation");
    }
  };

  const openStatusModal = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation);
    setNewStatus(reservation.status);
    setError("");
    setShowStatusModal(true);
  };

  const count = (status: string) => reservations.filter((r) => r.status === status).length;

  const renderQuickActions = (r: ReservationWithDetails) => (
    <div className="flex flex-wrap gap-1">
      {!canManage ? <span className="text-xs text-gray-400">View only</span> : <>
      {r.status === "Reserved" && (
        <Button variant="ghost" size="sm" onClick={() => setStatus(r, "Ready for Pickup")} title="Mark Ready for Pickup">
          <PackageCheck className="w-4 h-4 text-indigo-500" />
        </Button>
      )}
      {r.status === "Ready for Pickup" && (
        <Button variant="ghost" size="sm" onClick={() => setStatus(r, "Picked Up")} title="Mark Picked Up">
          <Truck className="w-4 h-4 text-purple-500" />
        </Button>
      )}
      {r.status === "Picked Up" && (
        <Button variant="ghost" size="sm" onClick={() => setStatus(r, "Returned")} title="Mark Returned">
          <RotateCcw className="w-4 h-4 text-teal-500" />
        </Button>
      )}
      {(r.status === "Reserved" || r.status === "Ready for Pickup") && (
        <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} title="Cancel Reservation">
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => openStatusModal(r)} title="Change Status">
        Edit
      </Button>
      </>}
    </div>
  );

  return (
    <div>
      <PageHeader title="Reservations" description="Track part reservations across all projects" />

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <span className="text-sm text-gray-500">Filter by status:</span>
            <Select
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-56"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table (desktop) / cards (mobile) */}
      {loading ? (
        <Card><CardContent className="p-6"><TableLoading columns={7} /></CardContent></Card>
      ) : filteredReservations.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ClipboardList}
              title="No reservations found"
              description={statusFilter ? "No reservations match the selected filter" : "Create reservations from a part's detail page"}
              action={<Link href="/inventory"><Button><Package className="w-4 h-4 mr-2" />View Inventory</Button></Link>}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/parts/${r.part.id}`} className="hover:text-primary-600">
                          <p className="font-medium">{r.part.name}</p>
                          <p className="text-xs text-gray-500">{r.part.partNumber}</p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/projects?project=${r.project.id}`}
                          className="inline-block rounded-sm hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          aria-label={`View ${r.project.name}`}
                        >
                          <p className="font-medium hover:underline">{r.project.name}</p>
                          <Badge className={`${getStatusColor(r.project.status)} text-xs mt-1`}>{r.project.status}</Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{r.quantity} units</TableCell>
                      <TableCell><Badge className={getStatusColor(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell className="text-gray-500">{formatDate(r.createdAt)}</TableCell>
                      <TableCell>{renderQuickActions(r)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="md:hidden space-y-3">
            {filteredReservations.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/parts/${r.part.id}`} className="hover:text-primary-600">
                        <p className="font-medium text-gray-900 truncate">{r.part.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{r.part.partNumber}</p>
                      </Link>
                      <Link
                        href={`/projects?project=${r.project.id}`}
                        className="mt-1 block text-sm font-medium text-primary-600 hover:underline"
                      >
                        {r.project.name}
                      </Link>
                    </div>
                    <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium">{r.quantity} units</span>
                    {renderQuickActions(r)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
        <SummaryCard label="Reserved" value={count("Reserved")} className="text-orange-600" />
        <SummaryCard label="Ready" value={count("Ready for Pickup")} className="text-indigo-600" />
        <SummaryCard label="Picked Up" value={count("Picked Up")} className="text-purple-600" />
        <SummaryCard label="Returned" value={count("Returned")} className="text-teal-600" />
        <SummaryCard label="Cancelled" value={count("Cancelled")} className="text-gray-600" />
      </div>

      {/* Status Update Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Reservation Status" size="sm">
        {selectedReservation && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium">{selectedReservation.part.name}</p>
              <p className="text-sm text-gray-500">
                {selectedReservation.quantity} units for {selectedReservation.project.name}
              </p>
            </div>
            <Select label="New Status" options={statusChangeOptions} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowStatusModal(false)}>Cancel</Button>
              <Button onClick={() => setStatus(selectedReservation, newStatus)} disabled={saving}>
                {saving ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 text-center">
        <p className={`text-2xl font-bold ${className}`}>{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}
