"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { FieldSelect } from "@/components/forms/FieldSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { deleteVehicle, getAdminVehicles } from "@/lib/api";
import { formatPrice, vehicleTitle } from "@/lib/format";
import { FUEL_TYPES, VEHICLE_TYPES } from "@/lib/vehicle-options";

const PAGE_LIMIT = 10;
const EMPTY_FILTERS = { fuel_type: "", vehicle_type: "" };

function TableSkeleton() {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label="Loading vehicles">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3">
          <Skeleton className="h-10 w-14 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-4 w-20 sm:block" />
          <Skeleton className="hidden h-6 w-16 md:block" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadVehicles(page = 1, query = search, nextFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminVehicles({
        page,
        limit: PAGE_LIMIT,
        search: query,
        ...nextFilters,
      });
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
    getAdminVehicles({ page: 1, limit: PAGE_LIMIT, search: "" })
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

  function handleFilterChange(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    loadVehicles(1, search, next);
  }

  function handleClearFilters() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    loadVehicles(1, "", EMPTY_FILTERS);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const vehicle = pendingDelete;
    setDeleting(true);
    try {
      await deleteVehicle(vehicle.id);
      toast.success(`${vehicleTitle(vehicle)} deleted`);
      setPendingDelete(null);
      const stayOnPage = vehicles.length > 1 || pagination.page === 1;
      await loadVehicles(stayOnPage ? pagination.page : pagination.page - 1);
    } catch (err) {
      toast.error(err?.message || "Unable to delete vehicle");
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(search || filters.fuel_type || filters.vehicle_type);

  return (
    <div className="space-y-8">
      <PageHeader
        size="compact"
        title="Vehicles"
        description="Search, create, update and remove catalog vehicles."
        actions={
          <Button nativeButton={false} render={<Link href="/admin/vehicles/new" />}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add vehicle
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <form className="flex flex-1 gap-2" onSubmit={handleSearch} role="search">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search brand or model"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                aria-label="Search vehicles"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <div className="grid grid-cols-2 gap-2 lg:w-[22rem]">
            <FieldSelect
              id="admin-filter-fuel"
              value={filters.fuel_type}
              onChange={(value) => handleFilterChange("fuel_type", value)}
              options={FUEL_TYPES}
              anyLabel="All fuels"
            />
            <FieldSelect
              id="admin-filter-type"
              value={filters.vehicle_type}
              onChange={(value) => handleFilterChange("vehicle_type", value)}
              options={VEHICLE_TYPES}
              anyLabel="All types"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
          <p className="text-muted-foreground tabular" aria-live="polite">
            {loading ? "Loading…" : `${pagination.total} vehicle${pagination.total === 1 ? "" : "s"}`}
          </p>
          {hasFilters ? (
            <Button type="button" variant="link" size="sm" className="px-0" onClick={handleClearFilters}>
              Clear search and filters
            </Button>
          ) : null}
        </div>

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState
            className="m-4"
            title="Could not load vehicles"
            description={error}
            onRetry={() => loadVehicles(pagination.page)}
          />
        ) : vehicles.length === 0 ? (
          <EmptyState
            className="m-4"
            title="No vehicles found"
            description={
              hasFilters
                ? "Try a different search or clear the filters."
                : "Add the first vehicle to start the catalog."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear search and filters
                </Button>
              ) : (
                <Button nativeButton={false} render={<Link href="/admin/vehicles/new" />}>
                  Add vehicle
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table className="border-t border-border">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Vehicle</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead>Transmission</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <VehicleImage
                          src={vehicle.image_url}
                          alt=""
                          aspect={null}
                          className="h-10 w-14 shrink-0 rounded-md"
                          iconClassName="size-4"
                          showFallbackLabel={false}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{vehicleTitle(vehicle)}</p>
                          <p className="text-xs text-muted-foreground">
                            #{vehicle.id}
                            {vehicle.variant ? ` · ${vehicle.variant}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-heading font-bold tabular">
                      {formatPrice(vehicle.price)}
                    </TableCell>
                    <TableCell>
                      {vehicle.fuel_type ? <Badge variant="outline">{vehicle.fuel_type}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{vehicle.transmission || "—"}</TableCell>
                    <TableCell>
                      {vehicle.vehicle_type ? (
                        <Badge variant="sage">{vehicle.vehicle_type}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          nativeButton={false}
                          render={<Link href={`/vehicles/${vehicle.id}`} />}
                          aria-label={`View ${vehicleTitle(vehicle)} on the site`}
                          title="View on site"
                        >
                          <Eye aria-hidden="true" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={`/admin/vehicles/${vehicle.id}/edit`} />}
                        >
                          <Pencil data-icon="inline-start" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setPendingDelete(vehicle)}
                          aria-label={`Delete ${vehicleTitle(vehicle)}`}
                          title="Delete"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
              <p className="text-sm text-muted-foreground tabular">
                Page {pagination.page} of {pagination.pages || 1}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadVehicles(pagination.page - 1)}
                >
                  <ChevronLeft data-icon="inline-start" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.pages === 0 || pagination.page >= pagination.pages}
                  onClick={() => loadVehicles(pagination.page + 1)}
                >
                  Next
                  <ChevronRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg font-bold">
              Delete {pendingDelete ? vehicleTitle(pendingDelete) : "vehicle"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the vehicle from the catalog. It will no
              longer appear in browsing, comparisons or recommendations. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete vehicle"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
