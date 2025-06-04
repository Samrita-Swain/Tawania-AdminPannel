import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QualityControlForm } from "../../_components/quality-control-form";

export default async function NewReceivingQCPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch warehouses and products for the form
  const [warehouses, products] = await Promise.all([
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">New Receiving Quality Control</h1>
      </div>

      <QualityControlForm 
        warehouses={warehouses}
        products={products}
        type="RECEIVING"
      />
    </div>
  );
}
