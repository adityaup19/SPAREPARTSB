import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout";
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import {
  Package,
  Boxes,
  PackageCheck,
  PackageMinus,
  AlertTriangle,
  Activity as ActivityIcon,
  ScanLine,
  Search,
  ClipboardList,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { activityLabel } from "@/lib/inventory";
import Link from "next/link";
import type { Part } from "@prisma/client";

// Render on each request instead of at build time — the dashboard reads the
// database, which isn't available/seeded during the Vercel build step.
export const dynamic = "force-dynamic";

async function getDashboardData() {
  const now = new Date();
  const soon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const [totalUniqueParts, totals, activities, warrantiesExpiringSoon, warrantyAlerts, lowStockParts] = await Promise.all([
    prisma.part.count(),
    prisma.part.aggregate({
      _sum: { totalQuantity: true, reservedQuantity: true },
    }),
    prisma.activity.findMany({
      include: { part: true, project: true, actor: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.part.count({
      where: { warrantyExpiration: { gt: now, lte: soon } },
    }),
    prisma.part.findMany({
      where: { warrantyExpiration: { gt: now, lte: soon } },
      orderBy: { warrantyExpiration: "asc" },
      take: 5,
    }),
    prisma.$queryRaw<Part[]>`
      SELECT * FROM "Part"
      WHERE "totalQuantity" > 0
        AND ("totalQuantity" - "reservedQuantity") BETWEEN 0 AND 5
      ORDER BY "updatedAt" DESC
      LIMIT 5
    `,
  ]);

  const totalUnits = totals._sum.totalQuantity ?? 0;
  const reservedUnits = totals._sum.reservedQuantity ?? 0;
  const availableUnits = totalUnits - reservedUnits;

  return {
    metrics: {
      totalUniqueParts,
      totalUnits,
      availableUnits,
      reservedUnits,
      warrantiesExpiringSoon,
    },
    activities,
    warrantyAlerts,
    lowStockParts,
  };
}

export default async function DashboardPage() {
  const { metrics, activities, warrantyAlerts, lowStockParts } = await getDashboardData();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your warehouse inventory"
      />

      {/* Primary add-part action (prioritized on mobile via ordering) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Link
          href="/scan"
          className="lg:col-span-2 group relative overflow-hidden rounded-xl bg-primary-600 text-white p-6 shadow-sm hover:bg-primary-700 transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary-100">Warehouse worker</p>
              <h2 className="text-2xl font-bold mt-1">Add a Part</h2>
              <p className="text-sm text-primary-100 mt-1">
                Photograph a label, review the details, and update inventory in seconds.
              </p>
            </div>
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/15 flex-shrink-0">
              <ScanLine className="w-8 h-8" />
            </span>
          </div>
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          <QuickAction href="/inventory" icon={Search} label="Search Inventory" />
          <QuickAction href="/reservations" icon={ClipboardList} label="View Reservations" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Unique Parts"
          value={metrics.totalUniqueParts}
          icon={Package}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Units"
          value={metrics.totalUnits.toLocaleString()}
          icon={Boxes}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Available"
          value={metrics.availableUnits.toLocaleString()}
          icon={PackageCheck}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard
          title="Reserved"
          value={metrics.reservedUnits.toLocaleString()}
          icon={PackageMinus}
          iconColor="bg-orange-100 text-orange-600"
        />
        <StatCard
          title="Warranty Alerts"
          value={metrics.warrantiesExpiringSoon}
          icon={AlertTriangle}
          iconColor="bg-red-100 text-red-600"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-gray-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {activities.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-500">No recent activity</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="px-6 py-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activityLabel(activity.type)}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {activity.details}
                        </p>
                        <p className="text-xs text-gray-400">
                          {activity.actor?.displayName || activity.actor?.email || "System"}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warranty Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Warranties Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {warrantyAlerts.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-500">
                  No warranties expiring in the next 90 days
                </p>
              ) : (
                warrantyAlerts.map((part) => (
                  <Link
                    key={part.id}
                    href={`/parts/${part.id}`}
                    className="block px-6 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {part.name}
                        </p>
                        <p className="text-sm text-gray-500">{part.partNumber}</p>
                      </div>
                      <Badge variant="warning">
                        {formatDateTime(part.warrantyExpiration)}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="w-5 h-5 text-red-500" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {lowStockParts.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-500">
                  No parts with low stock
                </p>
              ) : (
                lowStockParts.map((part) => {
                  const available = part.totalQuantity - part.reservedQuantity;
                  return (
                    <Link
                      key={part.id}
                      href={`/parts/${part.id}`}
                      className="block px-6 py-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {part.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {part.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            {available} available
                          </p>
                          <p className="text-xs text-gray-500">
                            of {part.totalQuantity} total
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/scan"
                className="flex flex-col items-center justify-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <ScanLine className="w-8 h-8 text-primary-600 mb-2" />
                <span className="text-sm font-medium text-primary-700">Add a Part</span>
              </Link>
              <Link
                href="/inventory"
                className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Boxes className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-green-700">View Inventory</span>
              </Link>
              <Link
                href="/reservations"
                className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <PackageMinus className="w-8 h-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-orange-700">Reservations</span>
              </Link>
              <Link
                href="/projects"
                className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <ActivityIcon className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-purple-700">Projects</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Search;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-primary-300 hover:bg-primary-50 transition-colors"
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600">
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-sm font-medium text-gray-900">{label}</span>
    </Link>
  );
}
