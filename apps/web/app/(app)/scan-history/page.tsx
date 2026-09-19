import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ScanHistoryPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Scan History</h1>
      <EmptyState
        icon={History}
        title="No scans recorded"
        description="Every card you scan will be listed here, with its identification confidence and timestamp."
      />
    </div>
  );
}
