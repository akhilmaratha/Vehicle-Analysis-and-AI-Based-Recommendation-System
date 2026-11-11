"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { deleteVehicle, getAdminVehicles } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadVehicles(page = 1, query = search) {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminVehicles({ page, limit: 10, search: query });
      setVehicles(data.items || []);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      setError(err?.message || "Unable to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    getAdminVehicles({ page: 1, limit: 10, search: "" })
      .then((data) => {
        if (ignore) return;
        setVehicles(data.items || []);
        setPagination({ page: data.page, pages: data.pages, total: data.total });
      })
      .catch((err) => {
        if (!ignore) setError(err?.message || "Unable to load vehicles");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    loadVehicles(1, search);
  }

  async function handleDelete(vehicle) {
    const confirmed = window.confirm(
      `Delete ${vehicle.brand} ${vehicle.model}? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteVehicle(vehicle.id);
      await loadVehicles(pagination.page);
    } catch (err) {
      setError(err?.message || "Unable to delete vehicle");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Manage Vehicles
          </h1>
          <p className="mt-1 text-muted-foreground">
            Search, create, update, and delete vehicles.
          </p>
        </div>
        <Link href="/admin/vehicles/new">
          <Button>
            <Plus data-icon="inline-start" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Table</CardTitle>
          <CardDescription>
            {pagination.total} vehicles found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-4 flex gap-2" onSubmit={handleSearch}>
            <Input
              placeholder="Search brand or model"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit" variant="outline">
              <Search data-icon="inline-start" />
              Search
            </Button>
          </form>

          {loading ? (
            <LoadingSpinner label="Loading vehicles..." />
          ) : error ? (
            <ErrorState description={error} onRetry={() => loadVehicles(pagination.page)} />
          ) : vehicles.length === 0 ? (
            <EmptyState title="No vehicles found" description="Try a different search or add a new vehicle." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Transmission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>{vehicle.id}</TableCell>
                      <TableCell>{vehicle.brand}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{formatPrice(vehicle.price)}</TableCell>
                      <TableCell>{vehicle.fuel_type}</TableCell>
                      <TableCell>{vehicle.transmission}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Link href={`/vehicles/${vehicle.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye />
                            View
                          </Button>
                        </Link>
                        <Link href={`/admin/vehicles/${vehicle.id}/edit`}>
                          <Button size="sm" variant="outline">
                            <Pencil />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(vehicle)}
                        >
                          <Trash2 />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages || 1}
                </p>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pagination.page <= 1}
                    onClick={() => loadVehicles(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pagination.pages === 0 || pagination.page >= pagination.pages}
                    onClick={() => loadVehicles(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
