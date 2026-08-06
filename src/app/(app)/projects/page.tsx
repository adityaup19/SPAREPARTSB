"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Input,
  Textarea,
  Select,
  Alert,
  EmptyState,
  TableLoading,
} from "@/components/ui";
import { FolderKanban, Plus, Edit, Trash2, Eye } from "lucide-react";
import { getStatusColor, formatDate } from "@/lib/utils";
import type { Project, Reservation, Part } from "@/types";
import { useCurrentUser } from "@/components/auth-provider";

interface ProjectWithReservations extends Project {
  reservations: (Reservation & { part: Part })[];
  _count: { reservations: number };
}

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Planned", label: "Planned" },
  { value: "On Hold", label: "On Hold" },
  { value: "Completed", label: "Completed" },
];

const initialFormData = {
  name: "",
  description: "",
  status: "Active",
};

export default function ProjectsPage() {
  const currentUser = useCurrentUser();
  const canManage = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";
  const [projects, setProjects] = useState<ProjectWithReservations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithReservations | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setError("");
    setShowModal(true);
  };

  const handleOpenEdit = (project: ProjectWithReservations) => {
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
    });
    setSelectedProject(project);
    setIsEditing(true);
    setError("");
    setShowModal(true);
  };

  const handleOpenDetail = (project: ProjectWithReservations) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = isEditing ? `/api/projects/${selectedProject?.id}` : "/api/projects";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save project");
      }

      setSuccess(isEditing ? "Project updated successfully" : "Project created successfully");
      setShowModal(false);
      fetchProjects();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete project");

      setSuccess("Project deleted successfully");
      fetchProjects();
    } catch {
      setError("Failed to delete project");
    }
  };

  const getTotalReserved = (project: ProjectWithReservations) => {
    return project.reservations
      .filter((r) => r.status === "Reserved" || r.status === "Ready for Pickup")
      .reduce((sum, r) => sum + r.quantity, 0);
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage projects and their part reservations"
        actions={canManage ? (
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        ) : undefined}
      />

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableLoading columns={6} />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to start reserving parts"
              action={canManage ? (
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              ) : undefined}
            />
          ) : (
            <>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reservations</TableHead>
                  <TableHead>Parts Reserved</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    onClick={() => handleOpenDetail(project)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenDetail(project);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${project.name} parts`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{project._count.reservations}</TableCell>
                    <TableCell>{getTotalReserved(project)} units</TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(project.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenDetail(project);
                          }}
                          aria-label={`View ${project.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canManage && <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenEdit(project);
                          }}
                          aria-label={`Edit ${project.name}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>}
                        {currentUser.role === "ADMIN" && <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(project.id);
                          }}
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  onClick={() => handleOpenDetail(project)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenDetail(project);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${project.name} parts`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{project.description}</p>
                    </div>
                    <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    {project._count.reservations} reservations · {getTotalReserved(project)} units
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={(event) => {
                      event.stopPropagation();
                      handleOpenDetail(project);
                    }}>View Parts</Button>
                    {canManage && <Button size="sm" variant="outline" onClick={(event) => {
                      event.stopPropagation();
                      handleOpenEdit(project);
                    }}>Edit</Button>}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? "Edit Project" : "New Project"}
        size="md"
      >
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <Input
            label="Project Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., HVAC System Upgrade"
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Project description..."
          />

          <Select
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedProject?.name || "Project Details"}
        size="lg"
      >
        {selectedProject && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(selectedProject.status)}>
                {selectedProject.status}
              </Badge>
              <span className="text-sm text-gray-500">
                Created {formatDate(selectedProject.createdAt)}
              </span>
            </div>

            {selectedProject.description && (
              <p className="text-sm text-gray-600">{selectedProject.description}</p>
            )}

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Reserved Parts</h4>
              {selectedProject.reservations.length === 0 ? (
                <p className="text-sm text-gray-500">No parts reserved for this project</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProject.reservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell>
                            <div>
                              <Link
                                href={`/parts/${reservation.part.id}`}
                                className="font-medium text-blue-600 hover:underline"
                                onClick={() => setShowDetailModal(false)}
                              >
                                {reservation.part.name}
                              </Link>
                              <p className="text-xs text-gray-500">{reservation.part.partNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>{reservation.quantity}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reservation.status)}>
                              {reservation.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
