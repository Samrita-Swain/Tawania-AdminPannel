import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewReturnForm } from "../_components/new-return-form";
import { redirect } from "next/navigation";

export default async function NewReturnPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Get stores and products for the form
  let stores: any[] = [];
  let products: any[] = [];
  let customers: any[] = [];

  try {
    const [storesResult, productsResult, customersResult] = await Promise.all([
      prisma.store.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.customer.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    stores = storesResult;
    products = productsResult;
    customers = customersResult;

    console.log(`Fetched ${stores.length} stores, ${products.length} products, ${customers.length} customers`);
  } catch (error) {
    console.error("Error fetching data for new return form:", error);

    // Provide fallback empty arrays
    stores = [];
    products = [];
    customers = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">New Return</h1>
      </div>

      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
          <p>Debug: Stores: {stores.length}, Products: {products.length}, Customers: {customers.length}</p>
        </div>
      )}

      <NewReturnForm
        stores={stores}
        products={products}
        customers={customers}
        userId={session.user.id}
      />
    </div>
  );
}
