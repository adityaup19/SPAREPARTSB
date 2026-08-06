"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Alert,
  Modal,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  PageLoading,
  EmptyState,
} from "@/components/ui";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  MapPin,
  Calendar,
  ClipboardList,
  Plus,
  Minus,
  Save,
  X,
  Move,
  Search,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime, getConditionColor, getStatusColor, daysUntil } from "@/lib/utils";
import type { Part, Reservation, Activity, Project } from "@/types";
import { useCurrentUser } from "@/components/auth-provider";

interface PartDetails extends Part {
  reservations: (Reservation & { project: Project })[];
  activities: Activity[];
}

const conditionOptions = [
  { value: "New", label: "New" },
  { value: "Refurbished", label: "Refurbished" },
  { value: "Used", label: "Used" },
  { value: "Damaged", label: "Damaged" },
];

const activityLabels: Record<string, string> = {
  PART_CREATED: "Part Added",
  PART_UPDATED: "Part Updated",
  PART_DELETED: "Part Deleted",
  QUANTITY_ADDED: "Quantity Added",
  QUANTITY_REMOVED: "Quantity Removed",
  PART_MOVED: "Part Moved",
  RESERVATION_CREATED: "Reservation Created",
  RESERVATION_UPDATED: "Reservation Updated",
  RESERVATION_READY: "Ready for Pickup",
  RESERVATION_CANCELLED: "Reservation Cancelled",
  PART_PICKED_UP: "Picked Up",
  PART_RETURNED: "Returned",
};

export default function PartDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useCurrentUser();
  const canManage = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const [part, setPart] = useState<PartDetails | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Part>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const [reserveData, setReserveData] = useState({ projectId: "", quantity: 1, notes: "" });
  const [projectSearch, setProjectSearch] = useState("");
  const [adjustData, setAdjustData] = useState({ mode: "add", amount: 1, reason: "" });
  const [moveData, setMoveData] = useState({ location: "", aisle: "", shelf: "", bin: "" });

  const fetchPart = async () => {
    try {
      const response = await fetch(`/api/parts/${id}`);
      if (!response.ok) throw new Error("Part not found");
      const data = await response.json();
      setPart(data);
      setEditData(data);
    } catch {
      setError("Failed to load part details");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      setProjects(
        data.filter((p: Project) => p.status === "Active" || p.status === "Planned")
      );
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(projectSearch.trim().toLowerCase())
  );

  useEffect(() => {
    fetchPart();
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const editable = { ...editData };
      delete editable.totalQuantity;
      delete editable.reservedQuantity;
      const response = await fetch(`/api/parts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editable,
          warrantyExpiration: editData.warrantyExpiration
            ? new Date(editData.warrantyExpiration).toISOString()
            : null,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update part");
      }
      setSuccess("Part updated successfully");
      setEditing(false);
      fetchPart();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update part");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/parts/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete part");
      router.push("/inventory");
    } catch {
      setError("Failed to delete part");
      setShowDeleteModal(false);
    }
  };

  const handleReserve = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId: id, ...reserveData }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to create reservation");
      setSuccess("Reservation created successfully");
      setShowReserveModal(false);
      setReserveData({ projectId: "", quantity: 1, notes: "" });
      fetchPart();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create reservation");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async () => {
    setSaving(true);
    setError("");
    try {
      const delta = adjustData.mode === "add" ? adjustData.amount : -adjustData.amount;
      const response = await fetch(`/api/parts/${id}/adjust-quantity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason: adjustData.reason || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to adjust quantity");
      setSuccess("Quantity updated");
      setShowAdjustModal(false);
      setAdjustData({ mode: "add", amount: 1, reason: "" });
      fetchPart();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to adjust quantity");
    } finally {
      setSaving(false);
    }
  };

  const openMove = () => {
    if (!part) return;
    setMoveData({
      location: part.location,
      aisle: part.aisle || "",
      shelf: part.shelf || "",
      bin: part.bin || "",
    });
    setShowMoveModal(true);
  };

  const handleMove = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/parts/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moveData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to move part");
      setSuccess("Part location updated");
      setShowMoveModal(false);
      fetchPart();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to move part");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!part) {
    return (
      <EmptyState
        icon={Package}
        title="Part not found"
        description="The part you're looking for doesn't exist or has been deleted."
        action={<Link href="/inventory"><Button>Back to Inventory</Button></Link>}
      />
    );
  }

  const availableQuantity = part.totalQuantity - part.reservedQuantity;
  const warrantyDays = daysUntil(part.warrantyExpiration);
  const locationLine = [
    part.location,
    part.aisle && `Aisle ${part.aisle}`,
    part.shelf && `Shelf ${part.shelf}`,
    part.bin && `Bin ${part.bin}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <PageHeader
        title={editing ? "Edit Part" : part.name}
        description={editing ? "Update part details" : `Part #${part.partNumber}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/inventory">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            {!editing && (
              <>
                {canManage && <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>}
                {currentUser.role === "ADMIN" && <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>}
              </>
            )}
          </div>
        }
      />

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Part Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Part Name" value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                    <Input label="Part Number" value={editData.partNumber || ""} onChange={(e) => setEditData({ ...editData, partNumber: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input label="Manufacturer" value={editData.manufacturer || ""} onChange={(e) => setEditData({ ...editData, manufacturer: e.target.value })} />
                    <Input label="Model Number" value={editData.modelNumber || ""} onChange={(e) => setEditData({ ...editData, modelNumber: e.target.value })} />
                    <Input label="Serial Number" value={editData.serialNumber || ""} onChange={(e) => setEditData({ ...editData, serialNumber: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Condition" options={conditionOptions} value={editData.condition || "New"} onChange={(e) => setEditData({ ...editData, condition: e.target.value })} />
                  </div>
                  <Input label="Warranty Expiration" type="date" value={editData.warrantyExpiration ? new Date(editData.warrantyExpiration).toISOString().split("T")[0] : ""} onChange={(e) => setEditData({ ...editData, warrantyExpiration: e.target.value ? new Date(e.target.value) : null })} />
                  <Textarea label="Notes" value={editData.notes || ""} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} />
                  <p className="text-xs text-gray-500">
                    Tip: use &quot;Adjust Quantity&quot; and &quot;Move&quot; for day-to-day changes so activity is logged.
                  </p>
                </div>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Manufacturer</dt>
                    <dd className="text-sm font-medium text-gray-900">{part.manufacturer}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Model Number</dt>
                    <dd className="text-sm font-medium text-gray-900 font-mono">{part.modelNumber || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Serial Number</dt>
                    <dd className="text-sm font-medium text-gray-900 font-mono">{part.serialNumber || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Condition</dt>
                    <dd><Badge className={getConditionColor(part.condition)}>{part.condition}</Badge></dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-gray-500">Location</dt>
                    <dd className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {locationLine}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Warranty Expiration</dt>
                    <dd className="text-sm font-medium text-gray-900 flex items-center gap-1 flex-wrap">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(part.warrantyExpiration)}
                      {warrantyDays !== null && warrantyDays > 0 && warrantyDays <= 90 && (
                        <Badge variant="warning" className="ml-2">{warrantyDays} days left</Badge>
                      )}
                      {warrantyDays !== null && warrantyDays <= 0 && (
                        <Badge variant="danger" className="ml-2">Expired</Badge>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Added</dt>
                    <dd className="text-sm font-medium text-gray-900">{formatDateTime(part.createdAt)}</dd>
                  </div>
                  {part.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-gray-500">Notes</dt>
                      <dd className="text-sm text-gray-900 mt-1">{part.notes}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
            {editing && (
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setEditing(false); setEditData(part); }}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Reservations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Reservations
              </CardTitle>
              {canManage && <Button size="sm" onClick={() => setShowReserveModal(true)} disabled={availableQuantity <= 0}>
                <Plus className="w-4 h-4 mr-1" />
                Reserve
              </Button>}
            </CardHeader>
            <CardContent className="p-0">
              {part.reservations.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-500">No reservations for this part</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {part.reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">{reservation.project.name}</TableCell>
                        <TableCell>{reservation.quantity}</TableCell>
                        <TableCell><Badge className={getStatusColor(reservation.status)}>{reservation.status}</Badge></TableCell>
                        <TableCell className="text-gray-500">{formatDate(reservation.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Part Image */}
          {part.imageUrl && (
            <Card>
              <CardContent className="p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={part.imageUrl}
                  alt={part.name}
                  className="w-full h-48 object-cover rounded-t-xl bg-gray-100"
                />
              </CardContent>
            </Card>
          )}

          {/* Quantity Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{part.totalQuantity}</p>
                <p className="text-sm text-gray-500 mt-1">Total Units</p>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Available</span>
                  <span className="text-sm font-medium text-green-600">{availableQuantity}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${part.totalQuantity > 0 ? (availableQuantity / part.totalQuantity) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Reserved</span>
                  <span className="text-sm font-medium text-orange-600">{part.reservedQuantity}</span>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-2">
                {canManage && <Button variant="outline" onClick={() => setShowAdjustModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adjust Quantity
                </Button>}
                <Button variant="outline" onClick={openMove}>
                  <Move className="w-4 h-4 mr-2" />
                  Move Location
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                {part.activities.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-500">No activity yet</p>
                ) : (
                  part.activities.map((activity) => (
                    <div key={activity.id} className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {activityLabels[activity.type] || activity.type}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(activity.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Part">
        <p className="text-sm text-gray-500 mb-4">
          Are you sure you want to delete <strong>{part.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete Part</Button>
        </div>
      </Modal>

      {/* Reserve Modal */}
      <Modal
        isOpen={showReserveModal}
        onClose={() => {
          setShowReserveModal(false);
          setProjectSearch("");
        }}
        title="Reserve Parts"
        size="md"
      >
        <div className="space-y-4">
          <Alert variant="info">{availableQuantity} units available for reservation</Alert>
          <div className="relative">
            <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-gray-400" />
            <Input
              label="Search Projects"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Type a project name..."
              className="pl-9"
            />
          </div>
          <Select
            label="Project"
            options={[
              {
                value: "",
                label: projectSearch && filteredProjects.length === 0
                  ? "No matching projects"
                  : "Select a project",
              },
              ...filteredProjects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={reserveData.projectId}
            onChange={(e) => {
              setReserveData({ ...reserveData, projectId: e.target.value });
              if (e.target.value) setProjectSearch("");
            }}
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            max={availableQuantity}
            value={reserveData.quantity}
            onChange={(e) => setReserveData({ ...reserveData, quantity: parseInt(e.target.value) || 1 })}
          />
          <Textarea
            label="Notes"
            value={reserveData.notes}
            onChange={(e) => setReserveData({ ...reserveData, notes: e.target.value })}
            rows={2}
            placeholder="Optional notes about this reservation..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => {
              setShowReserveModal(false);
              setProjectSearch("");
            }}>Cancel</Button>
            <Button onClick={handleReserve} disabled={saving || !reserveData.projectId || reserveData.quantity > availableQuantity}>
              {saving ? "Reserving..." : "Create Reservation"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Adjust Quantity Modal */}
      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title="Adjust Quantity" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={adjustData.mode === "add" ? "primary" : "outline"}
              onClick={() => setAdjustData({ ...adjustData, mode: "add" })}
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
            <Button
              variant={adjustData.mode === "remove" ? "primary" : "outline"}
              onClick={() => setAdjustData({ ...adjustData, mode: "remove" })}
            >
              <Minus className="w-4 h-4 mr-1" /> Remove
            </Button>
          </div>
          <Input
            label="Amount"
            type="number"
            min="1"
            value={adjustData.amount}
            onChange={(e) => setAdjustData({ ...adjustData, amount: parseInt(e.target.value) || 1 })}
          />
          <Input
            label="Reason *"
            value={adjustData.reason}
            onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
            placeholder="e.g., received shipment, damaged units"
          />
          <p className="text-xs text-gray-500">
            Current total {part.totalQuantity}. Cannot reduce below reserved ({part.reservedQuantity}).
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={saving || adjustData.reason.trim().length < 3}>{saving ? "Saving..." : "Apply"}</Button>
          </div>
        </div>
      </Modal>

      {/* Move Location Modal */}
      <Modal isOpen={showMoveModal} onClose={() => setShowMoveModal(false)} title="Move Part" size="md">
        <div className="space-y-4">
          <Input label="Warehouse / Zone *" value={moveData.location} onChange={(e) => setMoveData({ ...moveData, location: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Aisle" value={moveData.aisle} onChange={(e) => setMoveData({ ...moveData, aisle: e.target.value })} />
            <Input label="Shelf" value={moveData.shelf} onChange={(e) => setMoveData({ ...moveData, shelf: e.target.value })} />
            <Input label="Bin" value={moveData.bin} onChange={(e) => setMoveData({ ...moveData, bin: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowMoveModal(false)}>Cancel</Button>
            <Button onClick={handleMove} disabled={saving || !moveData.location.trim()}>
              {saving ? "Saving..." : "Save Location"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
