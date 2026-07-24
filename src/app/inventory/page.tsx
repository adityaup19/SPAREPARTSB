"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  Input,
  Select,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  TableLoading,
} from "@/components/ui";
import { Package, Search, ScanLine, Eye } from "lucide-react";
import Link from "next/link";
import { getConditionColor } from "@/lib/utils";
import { formatLocation } from "@/lib/inventory";
import type { Part } from "@/types";

const conditionOptions = [
  { value: "", label: "All Conditions" },
  { value: "New", label: "New" },
  { value: "Refurbished", label: "Refurbished" },
  { value: "Used", label: "Used" },
  { value: "Damaged", label: "Damaged" },
];

const availabilityOptions = [
  { value: "", label: "All Availability" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Has Reservations" },
  { value: "low", label: "Low Stock (≤5)" },
  { value: "out", label: "Out of Stock" },
];

const warrantyOptions = [
  { value: "", label: "All Warranties" },
  { value: "expiring", label: "Expiring Soon (90d)" },
  { value: "expired", label: "Expired" },
];

export default function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("");
  const [availability, setAvailability] = useState("");
  const [warranty, setWarranty] = useState("");

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (condition) params.set("condition", condition);
      if (availability) params.set("availability", availability);
      if (warranty) params.set("warranty", warranty);

      const response = await fetch(`/api/parts?${params}`);
      const data = await response.json();
      setParts(data);
    } catch (error) {
      console.error("Error fetching parts:", error);
    } finally {
      setLoading(false);
    }
  }, [search, condition, availability, warranty]);

  useEffect(() => {
    const timer = setTimeout(() => fetchParts(), 300);
    return () => clearTimeout(timer);
  }, [fetchParts]);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Search and manage your spare parts inventory"
        actions={
          <Link href="/scan">
            <Button>
              <ScanLine className="w-4 h-4 mr-2" />
              Scan a Part
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, part number, manufacturer, model, serial, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              options={availabilityOptions}
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            />
            <Select
              options={conditionOptions}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            />
            <Select
              options={warrantyOptions}
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <TableLoading columns={6} />
          </CardContent>
        </Card>
      ) : parts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Package}
              title="No parts found"
              description={
                search || condition || availability || warranty
                  ? "Try adjusting your search or filters"
                  : "Get started by scanning or adding your first spare part"
              }
              action={
                <Link href="/scan">
                  <Button>
                    <ScanLine className="w-4 h-4 mr-2" />
                    Scan a Part
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part) => {
                    const available = part.totalQuantity - part.reservedQuantity;
                    return (
                      <TableRow key={part.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {part.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={part.imageUrl}
                                alt={part.name}
                                className="w-10 h-10 rounded-md object-cover bg-gray-100 flex-shrink-0"
                              />
                            ) : (
                              <span className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-100 text-gray-400 flex-shrink-0">
                                <Package className="w-5 h-5" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium">{part.name}</p>
                              {part.modelNumber && (
                                <p className="text-xs text-gray-500">Model: {part.modelNumber}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{part.partNumber}</TableCell>
                        <TableCell>{part.manufacturer}</TableCell>
                        <TableCell className="text-sm">{formatLocation(part)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{part.totalQuantity} total</p>
                            <div className="flex gap-2 text-xs">
                              <span className="text-green-600">{available} available</span>
                              {part.reservedQuantity > 0 && (
                                <span className="text-orange-600">
                                  {part.reservedQuantity} reserved
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getConditionColor(part.condition)}>
                            {part.condition}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/parts/${part.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {parts.map((part) => {
              const available = part.totalQuantity - part.reservedQuantity;
              return (
                <Link key={part.id} href={`/parts/${part.id}`}>
                  <Card className="active:bg-gray-50">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {part.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={part.imageUrl}
                              alt={part.name}
                              className="w-12 h-12 rounded-md object-cover bg-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <span className="flex items-center justify-center w-12 h-12 rounded-md bg-gray-100 text-gray-400 flex-shrink-0">
                              <Package className="w-6 h-6" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{part.name}</p>
                            <p className="text-sm text-gray-500 font-mono">{part.partNumber}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatLocation(part)}</p>
                          </div>
                        </div>
                        <Badge className={getConditionColor(part.condition)}>
                          {part.condition}
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-3 text-sm">
                        <span className="font-medium">{part.totalQuantity} total</span>
                        <span className="text-green-600">{available} available</span>
                        {part.reservedQuantity > 0 && (
                          <span className="text-orange-600">
                            {part.reservedQuantity} reserved
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
