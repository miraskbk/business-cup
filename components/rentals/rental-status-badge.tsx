import { Badge } from "@/components/ui/badge";
import {
  RENTAL_STATUS_LABEL,
  type RentalStatus,
} from "@/lib/rental-status";

const VARIANT: Record<RentalStatus, "default" | "secondary" | "destructive"> = {
  active: "default",
  moved_out: "secondary",
  deposit_overdue: "destructive",
  deposit_returned: "secondary",
};

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  return <Badge variant={VARIANT[status]}>{RENTAL_STATUS_LABEL[status]}</Badge>;
}
