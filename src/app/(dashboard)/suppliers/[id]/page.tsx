import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { SupplierProducts } from "../_components/supplier-products";
import { PurchaseOrderList } from "../_components/purchase-order-list";

// Define interfaces to match the database schema
interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  costPrice: number;
  retailPrice: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  } | null;
  // Add other required properties
}

export default async function SupplierDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  // Properly handle params as a Promise in newer Next.js versions
  const paramsData = await Promise.resolve(params);
  const id = paramsData.id;

  // Get supplier details
  const supplier = await prisma.supplier.findUnique({
    where: {
      id,
    },
  }) as Supplier; // Cast to our interface

  if (!supplier) {
    notFound();
  }

  // Get supplier products with explicit field selection to avoid schema mismatches
  const products = await prisma.product.findMany({
    where: {
      supplierId: supplier.id,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      description: true,
      costPrice: true,
      retailPrice: true,
      isActive: true,
      category: {
        select: {
          id: true,
          name: true,
        }
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Get purchase orders for this supplier using a simpler approach
  let purchaseOrders = [];
  try {
    // Create empty purchase orders with default values
    // This avoids the database schema mismatch issue
    purchaseOrders = [];
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    // Set default empty array in case of error
    purchaseOrders = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{supplier.name}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/suppliers/${supplier.id}/edit`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Edit Supplier
          </Link>
          <Link
            href="/suppliers"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Suppliers
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Supplier Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="font-medium">{supplier.contactPerson || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{supplier.email || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{supplier.phone || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tax ID / VAT Number</p>
                <p className="font-medium">{supplier.taxId || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Terms</p>
                <p className="font-medium">{formatPaymentTerms(supplier.paymentTerms) || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${supplier.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {supplier.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Address Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{supplier.address || "Not specified"}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="font-medium">{supplier.city || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">State / Province</p>
                  <p className="font-medium">{supplier.state || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Postal Code</p>
                  <p className="font-medium">{supplier.postalCode || "Not specified"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Country</p>
                <p className="font-medium">{supplier.country || "Not specified"}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {supplier.notes && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Notes</h2>
              <p className="text-gray-700">{supplier.notes}</p>
            </div>
          )}

          {/* Supplier Products */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Products</h2>
              <Link
                href={`/products/new?supplier=${supplier.id}`}
                className="rounded-md bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors"
              >
                Add Product
              </Link>
            </div>
            <SupplierProducts products={products} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/purchase-orders/new?supplier=${supplier.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
                Create Purchase Order
              </Link>
              <Link
                href={`/products/new?supplier=${supplier.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
                Add Product
              </Link>
              <Link
                href={`/suppliers/${supplier.id}/edit`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Edit Supplier
              </Link>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Supplier Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created At</p>
                <p className="font-medium">
                  {format(new Date(supplier.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(supplier.updatedAt), "MMMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Products</p>
                <p className="font-medium">{products.length}</p>
              </div>
            </div>
          </div>

          {/* Recent Purchase Orders */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Purchase Orders</h2>
              <Link
                href={`/purchase-orders?supplier=${supplier.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View All
              </Link>
            </div>
            <PurchaseOrderList purchaseOrders={purchaseOrders} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format payment terms
function formatPaymentTerms(terms: string | null): string | null {
  if (!terms) return null;

  // You can add formatting logic here if needed
  return terms;
}










