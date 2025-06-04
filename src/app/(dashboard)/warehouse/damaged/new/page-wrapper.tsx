"use client";

import { NotificationProvider } from "@/components/ui/notification";
import { ReportDamagedItemPage } from "./page";

export default function ReportDamagedItemPageWrapper() {
  return (
    <NotificationProvider>
      <ReportDamagedItemPage />
    </NotificationProvider>
  );
}
