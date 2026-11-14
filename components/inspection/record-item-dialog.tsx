"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toEvidenceJpeg } from "@/lib/image";
import {
  CONDITION_LABEL,
  CONDITIONS,
  PHASE_LABEL,
  evidencePhotoPath,
} from "@/lib/inspection";
import type {
  Condition,
  InspectionItem,
  InspectionPhase,
  Rental,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** What is being recorded. `item: null` means the user names a custom item. */
export type RecordTarget = { room: string; item: string | null };

type Props = {
  target: RecordTarget | null;
  onOpenChange: (open: boolean) => void;
  rental: Pick<Rental, "id" | "user_id">;
  phase: InspectionPhase;
  onRecorded: (entry: InspectionItem) => void;
};

export function RecordItemDialog({
  target,
  onOpenChange,
  rental,
  phase,
  onRecorded,
}: Props) {
  const [supabase] = useState(() => createClient());
  const [itemName, setItemName] = useState("");
  const [condition, setCondition] = useState<Condition | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ item?: string; condition?: string }>(
    {},
  );
  const [saving, setSaving] = useState(false);

  // Keep the last target on screen while the dialog animates closed.
  const [shown, setShown] = useState<RecordTarget | null>(target);
  if (target && target !== shown) setShown(target);
  const current = target ?? shown;

  // Start from a clean form each time the dialog opens.
  useEffect(() => {
    if (!target) return;
    setItemName("");
    setCondition(null);
    setNote("");
    setPhoto(null);
    setErrors({});
  }, [target]);

  // Preview the chosen photo, and release it when it changes or goes away.
  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;

    const item = (target.item ?? itemName).trim();
    const nextErrors: typeof errors = {};
    if (!item) nextErrors.item = "Name the item you're recording.";
    if (!condition) nextErrors.condition = "Choose the condition.";
    setErrors(nextErrors);
    if (!item || !condition) return;

    setSaving(true);
    // The id is chosen here so the photo can be stored under it before the
    // row exists; a failed insert then never leaves a row without its photo.
    const id = crypto.randomUUID();
    let photoPath: string | null = null;

    try {
      if (photo) {
        const jpeg = await toEvidenceJpeg(photo);
        const path = evidencePhotoPath(rental.user_id, rental.id, id);
        const upload = await supabase.storage
          .from("evidence")
          .upload(path, jpeg, { contentType: "image/jpeg" });
        if (upload.error) throw new Error(upload.error.message);
        photoPath = path;
      }

      // captured_at is left to the database so the timestamp is the moment
      // the evidence was saved.
      const { data, error } = await supabase
        .from("inspection_items")
        .insert({
          id,
          rental_id: rental.id,
          room: target.room,
          item,
          phase,
          condition,
          note: note.trim() || null,
          photo_path: photoPath,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      toast.success(`${item} recorded`);
      onRecorded(data as InspectionItem);
      onOpenChange(false);
    } catch (error) {
      if (photoPath) {
        await supabase.storage.from("evidence").remove([photoPath]);
      }
      const reason = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Couldn't save this item: ${reason}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {current?.item
              ? `${current.room} · ${current.item}`
              : `Add an item to ${current?.room ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {PHASE_LABEL[phase]} condition. It&apos;s timestamped when you save
            and can&apos;t be edited afterwards.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} noValidate className="grid gap-4">
          {current?.item === null && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="item-name">Item</Label>
              <Input
                id="item-name"
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  setErrors((prev) => ({ ...prev, item: undefined }));
                }}
                placeholder="Ceiling fan"
                aria-invalid={!!errors.item}
                aria-describedby={errors.item ? "item-name-error" : undefined}
              />
              {errors.item && (
                <p id="item-name-error" className="text-sm text-destructive">
                  {errors.item}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label id="condition-label">Condition</Label>
            <div
              role="radiogroup"
              aria-labelledby="condition-label"
              aria-describedby={
                errors.condition ? "condition-error" : undefined
              }
              className="grid grid-cols-3 gap-2"
            >
              {CONDITIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={condition === option}
                  onClick={() => {
                    setCondition(option);
                    setErrors((prev) => ({ ...prev, condition: undefined }));
                  }}
                  className={cn(
                    "h-10 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    condition === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {CONDITION_LABEL[option]}
                </button>
              ))}
            </div>
            {errors.condition && (
              <p id="condition-error" className="text-sm text-destructive">
                {errors.condition}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="photo">
              Photo
              <span className="ml-1 font-normal text-muted-foreground">
                (optional, but it&apos;s your strongest proof)
              </span>
            </Label>
            {previewUrl ? (
              <div className="relative w-fit">
                {/* A local preview of a file the user just picked; next/image
                    can't optimise blob URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected photo"
                  className="max-h-48 rounded-md border object-contain"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 size-7"
                  onClick={() => setPhoto(null)}
                  aria-label="Remove photo"
                >
                  <X />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="photo"
                className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed p-5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <ImagePlus className="size-5" />
                Take or choose a photo
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">
              Note
              <span className="ml-1 font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Small chip near the sink, already there on day one"
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save evidence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
