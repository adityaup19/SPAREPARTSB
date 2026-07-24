"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
  Button,
  Alert,
  Badge,
} from "@/components/ui";
import {
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ScanLine,
  ArrowRight,
  Package,
  LayoutDashboard,
  FlaskConical,
} from "lucide-react";
import { formatLocation } from "@/lib/inventory";
import type { PartFormData } from "@/types";

type Step = "capture" | "review" | "confirm";

const conditionOptions = [
  { value: "New", label: "New" },
  { value: "Refurbished", label: "Refurbished" },
  { value: "Used", label: "Used" },
  { value: "Damaged", label: "Damaged" },
];

const emptyForm: PartFormData = {
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

// Simulated OCR samples. Replace with a real OCR provider later.
const OCR_SAMPLES: Partial<PartFormData>[] = [
  {
    name: "Servo Drive Unit",
    partNumber: "M9208-GGA-3",
    manufacturer: "Mitsubishi Electric",
    modelNumber: "MR-J4-70A",
    serialNumber: "ME" + Date.now().toString().slice(-8),
    condition: "New",
  },
  {
    name: "Proximity Sensor",
    partNumber: "XS612B1PAL2",
    manufacturer: "Telemecanique",
    modelNumber: "XS6-12B",
    serialNumber: "TE" + Date.now().toString().slice(-8),
    condition: "New",
  },
  {
    name: "Circuit Breaker",
    partNumber: "NSX100F-TM80D",
    manufacturer: "Schneider Electric",
    modelNumber: "NSX100F",
    serialNumber: "SC" + Date.now().toString().slice(-8),
    condition: "New",
  },
  {
    name: "Roller Chain Sprocket",
    partNumber: "40B17-1",
    manufacturer: "Martin Sprocket",
    modelNumber: "40B17",
    serialNumber: "",
    condition: "New",
  },
];

interface DuplicateInfo {
  id: string;
  name: string;
  partNumber: string;
  totalQuantity: number;
  availableQuantity: number;
  location: string;
  aisle: string | null;
  shelf: string | null;
  bin: string | null;
  matchType: "partNumber" | "modelNumber" | null;
}

interface ConfirmInfo {
  title: string;
  partNumber: string;
  location: string;
  newTotal: number;
  partId: string;
}

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("capture");
  const [image, setImage] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [form, setForm] = useState<PartFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PartFormData, string>>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [confirmInfo, setConfirmInfo] = useState<ConfirmInfo | null>(null);

  const update = (field: keyof PartFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setError("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setExtracted(false);
    };
    reader.readAsDataURL(file);
  };

  const runExtraction = async () => {
    setExtracting(true);
    await new Promise((r) => setTimeout(r, 1500));
    const sample = OCR_SAMPLES[Math.floor(Math.random() * OCR_SAMPLES.length)];
    setForm((prev) => ({ ...prev, ...sample, imageUrl: image }));
    setExtracting(false);
    setExtracted(true);
    setStep("review");
  };

  const skipToManual = () => {
    setForm((prev) => ({ ...prev, imageUrl: image }));
    setStep("review");
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof PartFormData, string>> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.partNumber.trim()) e.partNumber = "Required";
    if (!form.manufacturer.trim()) e.manufacturer = "Required";
    if (!form.location.trim()) e.location = "Required";
    if (form.quantity < 1) e.quantity = "Must be at least 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    setError("");
    if (!validate()) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({ partNumber: form.partNumber });
      if (form.manufacturer) params.set("manufacturer", form.manufacturer);
      if (form.modelNumber) params.set("modelNumber", form.modelNumber);
      const res = await fetch(`/api/check-part-number?${params}`);
      const data = await res.json();

      if (data.exists) {
        setDuplicate({
          id: data.part.id,
          name: data.part.name,
          partNumber: data.part.partNumber,
          totalQuantity: data.part.totalQuantity,
          availableQuantity: data.part.availableQuantity,
          location: data.part.location,
          aisle: data.part.aisle,
          shelf: data.part.shelf,
          bin: data.part.bin,
          matchType: data.matchType,
        });
      } else {
        await createNewPart();
      }
    } catch {
      setError("Something went wrong while checking for duplicates.");
    } finally {
      setSaving(false);
    }
  };

  const createNewPart = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError(
          "That part number already exists. Choose 'Add to existing' or change the part number."
        );
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to save part");

      setConfirmInfo({
        title: `${form.quantity} unit${form.quantity === 1 ? "" : "s"} added successfully`,
        partNumber: data.partNumber,
        location: formatLocation(data),
        newTotal: data.totalQuantity,
        partId: data.id,
      });
      setDuplicate(null);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save part");
    } finally {
      setSaving(false);
    }
  };

  const addToExisting = async () => {
    if (!duplicate) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/parts/${duplicate.id}/add-quantity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: form.quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update quantity");

      setConfirmInfo({
        title: `${form.quantity} unit${form.quantity === 1 ? "" : "s"} added successfully`,
        partNumber: data.partNumber,
        location: formatLocation(data),
        newTotal: data.totalQuantity,
        partId: data.id,
      });
      setDuplicate(null);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setStep("capture");
    setImage("");
    setExtracted(false);
    setExtracting(false);
    setForm(emptyForm);
    setErrors({});
    setError("");
    setDuplicate(null);
    setConfirmInfo(null);
  };

  const bigInput = "py-3 text-base";

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Scan a Part"
        description="Capture a label, review the details, and update inventory"
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <StepDot active={step === "capture"} done={step !== "capture"} label="Capture" />
        <div className="flex-1 h-px bg-gray-200" />
        <StepDot active={step === "review"} done={step === "confirm"} label="Review" />
        <div className="flex-1 h-px bg-gray-200" />
        <StepDot active={step === "confirm"} done={false} label="Confirm" />
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {/* STEP 1: CAPTURE */}
      {step === "capture" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Capture Part Label
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />

            {!image ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-14 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 text-white">
                  <Camera className="w-8 h-8" />
                </span>
                <span className="text-base font-semibold text-gray-900">Open Camera</span>
                <span className="text-sm text-gray-500">Tap to take a photo of the label</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt="Captured part label"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake / Replace
                  </Button>
                  <Button size="lg" onClick={runExtraction} disabled={extracting}>
                    {extracting ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Extract Part Details
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload an existing photo
              </Button>
              <Button variant="ghost" className="flex-1" onClick={skipToManual}>
                Enter details manually
              </Button>
            </div>

            <Alert variant="warning">
              <div className="flex items-start gap-2">
                <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Prototype extraction.</strong> No OCR provider is connected yet.
                  &quot;Extract Part Details&quot; fills the form with sample data so you can test
                  the workflow. Real label reading can be added later.
                </span>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: REVIEW */}
      {step === "review" && (
        <div className="space-y-4 pb-24">
          {extracted && (
            <Alert variant="info">
              <div className="flex items-start gap-2">
                <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Details below were filled by the <strong>prototype extractor</strong> (development
                  mode). Please review and correct every field before saving.
                </span>
              </div>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Review Part Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Part Name *"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                error={errors.name}
                className={bigInput}
                placeholder="e.g., Servo Drive Unit"
              />
              <Input
                label="Part Number *"
                value={form.partNumber}
                onChange={(e) => update("partNumber", e.target.value)}
                error={errors.partNumber}
                className={bigInput}
                placeholder="Primary identifier used for duplicate checks"
              />
              <Input
                label="Manufacturer *"
                value={form.manufacturer}
                onChange={(e) => update("manufacturer", e.target.value)}
                error={errors.manufacturer}
                className={bigInput}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Model Number"
                  value={form.modelNumber}
                  onChange={(e) => update("modelNumber", e.target.value)}
                  className={bigInput}
                />
                <Input
                  label="Serial Number"
                  value={form.serialNumber}
                  onChange={(e) => update("serialNumber", e.target.value)}
                  className={bigInput}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Quantity Received *"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => update("quantity", parseInt(e.target.value) || 0)}
                  error={errors.quantity}
                  className={bigInput}
                />
                <Select
                  label="Condition"
                  options={conditionOptions}
                  value={form.condition}
                  onChange={(e) => update("condition", e.target.value)}
                  className={bigInput}
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Storage Location</p>
                <Input
                  label="Warehouse / Zone *"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  error={errors.location}
                  className={bigInput}
                  placeholder="e.g., Warehouse A"
                />
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Input
                    label="Aisle"
                    value={form.aisle}
                    onChange={(e) => update("aisle", e.target.value)}
                    className={bigInput}
                    placeholder="C"
                  />
                  <Input
                    label="Shelf"
                    value={form.shelf}
                    onChange={(e) => update("shelf", e.target.value)}
                    className={bigInput}
                    placeholder="5"
                  />
                  <Input
                    label="Bin"
                    value={form.bin}
                    onChange={(e) => update("bin", e.target.value)}
                    className={bigInput}
                    placeholder="2"
                  />
                </div>
              </div>

              <Input
                label="Warranty Expiration"
                type="date"
                value={form.warrantyExpiration}
                onChange={(e) => update("warrantyExpiration", e.target.value)}
                className={bigInput}
              />
              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                placeholder="Anything worth noting about this part..."
              />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("capture")}>
              Back
            </Button>
          </div>

          {/* Sticky continue bar */}
          <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:pl-64 z-30 bg-white/95 backdrop-blur border-t border-gray-200 p-3">
            <div className="max-w-2xl mx-auto">
              <Button
                size="lg"
                className="w-full"
                onClick={handleContinue}
                disabled={saving}
              >
                {saving ? "Checking..." : "Continue"}
                {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIRM */}
      {step === "confirm" && confirmInfo && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </span>
              <h2 className="text-2xl font-bold text-gray-900">{confirmInfo.title}</h2>
              <div className="mt-4 w-full max-w-sm space-y-2 text-left bg-gray-50 rounded-lg p-4">
                <Row label="Part" value={confirmInfo.partNumber} />
                <Row label="Location" value={confirmInfo.location} />
                <Row label="New total quantity" value={String(confirmInfo.newTotal)} />
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <Button className="flex-1" onClick={resetAll}>
                  <ScanLine className="w-4 h-4 mr-2" />
                  Scan Another
                </Button>
                <Link href={`/parts/${confirmInfo.partId}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Package className="w-4 h-4 mr-2" />
                    View Part
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="ghost" className="w-full">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DUPLICATE DETECTION SHEET */}
      {duplicate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDuplicate(null)}
          />
          <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-gray-900">Matching part found</h2>
              <Badge variant="warning">
                {duplicate.matchType === "modelNumber"
                  ? "Manufacturer + Model match"
                  : "Part number match"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              This part already exists in inventory. We recommend adding the received units to the
              existing record.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1">
              <p className="font-medium text-gray-900">{duplicate.name}</p>
              <p className="text-sm text-gray-500 font-mono">{duplicate.partNumber}</p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                <span className="text-gray-500">Current total</span>
                <span className="text-right font-medium">{duplicate.totalQuantity}</span>
                <span className="text-gray-500">Available</span>
                <span className="text-right font-medium text-green-600">
                  {duplicate.availableQuantity}
                </span>
                <span className="text-gray-500">Location</span>
                <span className="text-right font-medium">{formatLocation(duplicate)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={addToExisting} disabled={saving}>
                {saving
                  ? "Saving..."
                  : `Add ${form.quantity} unit${form.quantity === 1 ? "" : "s"} to existing (Recommended)`}
              </Button>
              {duplicate.matchType !== "partNumber" && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={createNewPart}
                  disabled={saving}
                >
                  Create a separate inventory record
                </Button>
              )}
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => setDuplicate(null)}
                disabled={saving}
              >
                Cancel and edit the information
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold " +
          (active
            ? "bg-primary-600 text-white"
            : done
            ? "bg-green-500 text-white"
            : "bg-gray-200 text-gray-500")
        }
      >
        {done ? "\u2713" : label[0]}
      </span>
      <span
        className={
          "text-sm font-medium " + (active ? "text-gray-900" : "text-gray-500")
        }
      >
        {label}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
