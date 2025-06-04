"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, Filter } from "lucide-react";
import { ReturnStatusBadgeDropdown } from "./return-status-dropdown";

interface Store {
  id: string;
  name: string;
}

interface ReturnItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  reason: string;
  condition: string;
  unitPrice: number;
  totalPrice: number;
}

interface Return {
  id: string;
  returnNumber: string;
  status: string;
  store: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  returnDate: string;
  processedBy: {
    id: string;
    name: string;
  };
  items: ReturnItem[];
  totalAmount: number;
}

interface ReturnsListProps {
  returns: Return[];
  stores: Store[];
  currentStoreId?: string;
  currentStatus?: string;
  currentSearch?: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function ReturnsList({
  returns,
  stores,
  currentStoreId,
  currentStatus,
  currentSearch,
  currentPage,
  totalPages,
  totalItems,
}: ReturnsListProps) {
  const router = useRouter();
  const pathname = usePathname();

  // State
  const [storeId, setStoreId] = useState<string>(currentStoreId || "");
  const [status, setStatus] = useState<string>(currentStatus || "");
  const [searchTerm, setSearchTerm] = useState<string>(currentSearch || "");

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();

    if (storeId) {
      params.append("store", storeId);
    }

    if (status) {
      params.append("status", status);
    }

    if (searchTerm) {
      params.append("search", searchTerm);
    }

    params.append("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  };

  // Reset filters
  const resetFilters = () => {
    setStoreId("");
    setStatus("");
    setSearchTerm("");
    router.push(pathname);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();

    if (currentStoreId) {
      params.append("store", currentStoreId);
    }

    if (currentStatus) {
      params.append("status", currentStatus);
    }

    if (currentSearch) {
      params.append("search", currentSearch);
    }

    params.append("page", page.toString());

    router.push(`${pathname}?${params.toString()}`);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="store" className="block text-sm font-medium text-gray-800 mb-1">
              Store
            </label>
            <Select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-800 mb-1">
              Status
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>

          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-800 mb-1">
              Search
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by return #, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-800" />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={applyFilters}
              className="flex-1"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button
              onClick={resetFilters}
              variant="outline"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Return #</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returns.length > 0 ? (
                returns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                      <Link href={`/returns/${returnItem.id}`}>
                        {returnItem.returnNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {format(new Date(returnItem.returnDate), "MMM d, yyyy")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {returnItem.store?.name || "Unknown Store"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {returnItem.customer?.name || "Walk-in Customer"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {returnItem.items.length}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      ${returnItem.totalAmount.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <ReturnStatusBadgeDropdown
                        returnId={returnItem.id}
                        currentStatus={returnItem.status}
                        returnNumber={returnItem.returnNumber}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Link href={`/returns/${returnItem.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-800">
                    No returns found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-800">
                Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * 10, totalItems)}
                </span>{" "}
                of <span className="font-medium">{totalItems}</span> returns
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

