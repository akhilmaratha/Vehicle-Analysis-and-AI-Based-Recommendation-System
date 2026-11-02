import Link from "next/link";
import { Car, Building2, Search, Sparkles } from "lucide-react";
import { DashboardCard } from "@/components/admin/DashboardCard";
import { Button } from "@/components/ui/button";

const stats = [
  {
    title: "Total Vehicles",
    value: "128",
    description: "Placeholder count",
    icon: Car,
  },
  {
    title: "Total Brands",
    value: "18",
    description: "Placeholder count",
    icon: Building2,
  },
  {
    title: "Total Searches",
    value: "1,042",
    description: "Placeholder count",
    icon: Search,
  },
  {
    title: "Total Recommendations",
    value: "376",
    description: "Placeholder count",
    icon: Sparkles,
  },
];

export default function AdminPage() {
  return (
    <div className="page-container space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Overview placeholders for the management panel.
          </p>
        </div>
        <Link href="/admin/vehicles">
          <Button>Manage Vehicles</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <DashboardCard key={stat.title} {...stat} />
        ))}
      </div>
    </div>
  );
}
