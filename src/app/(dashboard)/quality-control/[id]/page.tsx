import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { QualityControlDetail } from "../_components/quality-control-detail";

// This function is used to generate static params for the page
export async function generateStaticParams() {
  // We don't need to generate any static params
  return [];
}

// This tells Next.js to dynamically render this page
export const dynamic = 'force-dynamic';

export default async function QualityControlDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const resolvedParams = await params;
  const qualityControlId = resolvedParams.id;

  // We'll always render the detail component and let it handle the data fetching
  return <QualityControlDetail id={qualityControlId} />;
}
