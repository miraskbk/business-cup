import { Suspense } from "react";
import { RentalDetail } from "@/components/rentals/rental-detail";
import { Skeleton } from "@/components/ui/skeleton";

export default function RentalDetailPage() {
  return (
    // The rental id comes from the URL, which is only known per request, so
    // the detail view streams in behind a Suspense boundary.
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <RentalDetail />
    </Suspense>
  );
}
