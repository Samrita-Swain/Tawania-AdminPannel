import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { PaymentForm } from "../../_components/payment-form";

export default async function SalePaymentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const saleId = params.id;

  // Get sale with related data
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      store: true,
      customer: true,
      Payment: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!sale) {
    notFound();
  }

  // Redirect if sale is already fully paid
  if (sale.paymentStatus === "PAID") {
    redirect(`/sales/${saleId}`);
  }

  // Calculate payment totals
  const totalAmount = Number(sale.totalAmount);
  const totalPaid = sale.Payment.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balanceDue = totalAmount - totalPaid;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Process Payment</h1>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Receipt #</h3>
            <p className="mt-1 text-base font-medium text-gray-900">{sale.receiptNumber}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Customer</h3>
            <p className="mt-1 text-base text-gray-900">
              {sale.customer ? sale.customer.name : "Walk-in Customer"}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Store</h3>
            <p className="mt-1 text-base text-gray-900">{sale.store.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
            <p className="mt-1 text-base font-medium text-gray-900">${totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Amount Paid</h3>
            <p className="mt-1 text-base text-green-600">${totalPaid.toFixed(2)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Balance Due</h3>
            <p className="mt-1 text-base font-bold text-red-600">${balanceDue.toFixed(2)}</p>
          </div>
        </div>

        <PaymentForm sale={sale} balanceDue={balanceDue} />
      </div>
    </div>
  );
}
