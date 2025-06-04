import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@heroicons/react/24/outline";
import { QualityControlList } from "./_components/quality-control-list";
import { getWarehouses } from "@/lib/warehouse";

export const metadata: Metadata = {
  title: "Quality Control",
  description: "Manage quality control inspections",
};

export default async function QualityControlPage() {
  const warehouses = await getWarehouses();

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quality Control</h1>
          <p className="text-gray-800">
            Manage quality control inspections for incoming and returned products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/quality-control/new/receiving">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Receiving QC
            </Button>
          </Link>
          <Link href="/quality-control/new/return">
            <Button className="bg-green-600 hover:bg-green-700">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Return QC
            </Button>
          </Link>
          <Link href="/quality-control/new/random">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Random QC
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* QualityControlFallback component is intentionally removed */}
        <div id="quality-control-list-container" style={{ display: "block" }}>
          <QualityControlList warehouses={warehouses} />
        </div>
      </div>
    </div>
  );
}
