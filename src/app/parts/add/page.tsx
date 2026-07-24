"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Input,
  Select,
  Textarea,
  Button,
  Alert,
  Modal,
} from "@/components/ui";
import { ScanLine, Package, Plus } from "lucide-react";
import Link from "next/link";
import type { PartFormData } from "@/types";

const conditionOptions = [
  { value: "New", label: "New" },
  { value: "Refurbished", label: "Refurbished" },
  { value: "Used", label: "Used" },
  { value: "Damaged", label: "Damaged" },
];

const initialFormData: PartFormData = {
  name: "",
  partNumber: "",
  manufacturer: "",
  modelNumber: "",
  serialNumber: "",
  quantity: 1,
  location: "",
  aisle: "",
  shelf: "",
  bin: "",
  condition: "New",
  warrantyExpiration: "",
  notes: "",
  imageUrl: "",
};

export default function AddPartPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<PartFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof PartFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [existingPart, setExistingPart] = useState<{
    id: string;
    name: string;
    totalQuantity: number;
  } | null>(null);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [addQuantityAmount, setAddQuantityAmount] = useState(1);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 0 : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  const checkExistingPartNumber = async (partNumber: string) => {
    if (!partNumber) return;
    try {
      const response = await fetch(
        `/api/check-part-number?partNumber=${encodeURIComponent(partNumber)}`
      );
      const data = await response.json();
      if (data.exists) {
        setExistingPart({
          id: data.part.id,
          name: data.part.name,
          totalQuantity: data.part.totalQuantity,
        });
        setShowExistingModal(true);
      }
    } catch (error) {
      console.error("Error checking part number:", error);
    }
  };

  const handleAddQuantityToExisting = async () => {
    if (!existingPart) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/parts/${existingPart.id}/add-quantity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: addQuantityAmount }),
      });
      if (!response.ok) throw new Error("Failed to add quantity");

      setSubmitSuccess(`Added ${addQuantityAmount} units to existing part. Redirecting...`);
      setShowExistingModal(false);
      setTimeout(() => router.push(`/parts/${existingPart.id}`), 1200);
    } catch {
      setSubmitError("Failed to add quantity to existing part");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PartFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.partNumber.trim()) newErrors.partNumber = "Part number is required";
    if (!formData.manufacturer.trim()) newErrors.manufacturer = "Manufacturer is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (formData.quantity < 0) newErrors.quantity = "Quantity must be 0 or greater";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.status === 409) {
        setExistingPart({
          id: data.existingPart.id,
          name: data.existingPart.name,
          totalQuantity: data.existingPart.totalQuantity,
        });
        setShowExistingModal(true);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Failed to create part");

      setSubmitSuccess("Part created successfully! Redirecting...");
      setTimeout(() => router.push(`/parts/${data.id}`), 1200);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create part");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Add Part Manually" description="Enter part details by hand" />

      <div className="max-w-3xl">
        {/* Scan prompt */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600 text-white flex-shrink-0">
              <ScanLine className="w-5 h-5" />
            </span>
            <div>
              <p className="font-medium text-gray-900">
                Have a part label available? Scan it to prefill these fields.
              </p>
              <p className="text-sm text-gray-500">
                The scan flow captures a photo and extracts details automatically.
              </p>
            </div>
          </div>
          <Link href="/scan">
            <Button>
              <ScanLine className="w-4 h-4 mr-2" />
              Scan a Part
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Part Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitError && <Alert variant="error">{submitError}</Alert>}
              {submitSuccess && <Alert variant="success">{submitSuccess}</Alert>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Part Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="e.g., Industrial Ball Bearing"
                />
                <Input
                  label="Part Number *"
                  name="partNumber"
                  value={formData.partNumber}
                  onChange={handleChange}
                  onBlur={() => checkExistingPartNumber(formData.partNumber)}
                  error={errors.partNumber}
                  placeholder="e.g., SKF-6205-2RS"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Manufacturer *"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  error={errors.manufacturer}
                  placeholder="e.g., SKF"
                />
                <Input
                  label="Model Number"
                  name="modelNumber"
                  value={formData.modelNumber}
                  onChange={handleChange}
                  placeholder="e.g., 6205-2RS1"
                />
                <Input
                  label="Serial Number"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  placeholder="e.g., SKF2024001234"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Quantity *"
                  name="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={handleChange}
                  error={errors.quantity}
                />
                <Select
                  label="Condition"
                  name="condition"
                  options={conditionOptions}
                  value={formData.condition}
                  onChange={handleChange}
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Storage Location</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Warehouse / Zone *"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    error={errors.location}
                    placeholder="e.g., Warehouse A"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="Aisle" name="aisle" value={formData.aisle} onChange={handleChange} />
                    <Input label="Shelf" name="shelf" value={formData.shelf} onChange={handleChange} />
                    <Input label="Bin" name="bin" value={formData.bin} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <Input
                label="Warranty Expiration"
                name="warrantyExpiration"
                type="date"
                value={formData.warrantyExpiration}
                onChange={handleChange}
              />

              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Additional details about the part..."
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/inventory">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : (<><Plus className="w-4 h-4 mr-2" />Add Part</>)}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>

      {/* Existing Part Modal */}
      <Modal
        isOpen={showExistingModal}
        onClose={() => setShowExistingModal(false)}
        title="Part Number Already Exists"
        size="md"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            A part with this number already exists in the inventory.
          </Alert>

          {existingPart && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{existingPart.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                Current quantity: {existingPart.totalQuantity} units
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600 mb-3">
              Would you like to add more units to the existing part?
            </p>
            <Input
              label="Quantity to Add"
              type="number"
              min="1"
              value={addQuantityAmount}
              onChange={(e) => setAddQuantityAmount(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowExistingModal(false)}>Cancel</Button>
            <Link href={`/parts/${existingPart?.id}`}>
              <Button variant="outline">View Existing Part</Button>
            </Link>
            <Button onClick={handleAddQuantityToExisting} disabled={loading}>
              {loading ? "Adding..." : "Add Quantity"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
