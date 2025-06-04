import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { CustomerEditForm } from "../../_components/customer-edit-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  if (!session) {
    redirect("/api/auth/signin");
  }

  // Get customer details
  const customer = await prisma.customer.findUnique({
    where: {
      id: resolvedParams.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      isActive: true,
      loyaltyPoints: true,
      loyaltyTier: true,
    },
  });

  if (!customer) {
    notFound();
  }

  // Parse addresses from string (assuming it's stored as JSON string)
  let addresses = [];
  try {
    if (customer.address) {
      // If address is a JSON string of array
      addresses = typeof customer.address === 'string'
        ? JSON.parse(customer.address)
        : [{ id: '1', address: customer.address, city: '', state: '', postalCode: '', country: '', isDefault: true }];
    }
  } catch {
    // If parsing fails, treat as single address
    if (customer.address) {
      addresses = [{ id: '1', address: customer.address, city: '', state: '', postalCode: '', country: '', isDefault: true }];
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Edit Customer</h1>
      <CustomerEditForm customer={customer} addresses={addresses} />
    </div>
  );
}
