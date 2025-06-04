import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function QualityControlNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Quality Control Not Found</h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        The quality control you are looking for could not be found. It may have been deleted or the URL might be incorrect.
      </p>
      <Link href="/quality-control">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Back to Quality Controls
        </Button>
      </Link>
    </div>
  );
}
