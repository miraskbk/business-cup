"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Rental } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  /** The rental to delete; the dialog is open while this is set. */
  rental: Rental | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (rental: Rental) => void;
};

export function DeleteRentalDialog({ rental, onOpenChange, onDeleted }: Props) {
  const [supabase] = useState(() => createClient());
  const [deleting, setDeleting] = useState(false);

  // Keep showing the address while the dialog animates closed.
  const [shown, setShown] = useState<Rental | null>(rental);
  if (rental && rental !== shown) setShown(rental);

  async function remove() {
    if (!rental) return;
    setDeleting(true);
    const { error } = await supabase
      .from("rentals")
      .delete()
      .eq("id", rental.id);
    if (error) {
      setDeleting(false);
      toast.error(`Couldn't delete the rental: ${error.message}`);
      return;
    }

    // The rows cascade in the database; the evidence photos live in storage
    // and are removed here. Rows go first so a failure never loses photos
    // for a rental that still exists.
    const folder = `${rental.user_id}/${rental.id}`;
    const { data: photos } = await supabase.storage
      .from("evidence")
      .list(folder, { limit: 1000 });
    if (photos && photos.length > 0) {
      await supabase.storage
        .from("evidence")
        .remove(photos.map((photo) => `${folder}/${photo.name}`));
    }
    setDeleting(false);

    toast.success("Rental deleted");
    onDeleted(rental);
    onOpenChange(false);
  }

  return (
    <Dialog open={!!rental} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this rental?</DialogTitle>
          <DialogDescription>
            {(rental ?? shown)?.address} and everything recorded for it will be
            deleted. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep rental
          </Button>
          <Button variant="destructive" onClick={remove} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete rental"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
