import { Badge } from "@/components/ui/badge";
import {
  RENTAL_STATUS_LABEL,
  type RentalStatus,
} from "@/lib/rental-status";

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {RENTAL_STATUS_LABEL[status]}
    </Badge>
  );
}
