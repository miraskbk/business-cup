"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Camera, Lock, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import {
  CONDITION_LABEL,
  PHASE_LABEL,
  buildChecklist,
  buildComparison,
  checklistProgress,
  type ChecklistLine,
} from "@/lib/inspection";
import type {
  Condition,
  InspectionItem,
  InspectionPhase,
  Rental,
} from "@/lib/types";
import {
  RecordItemDialog,
  type RecordTarget,
} from "@/components/inspection/record-item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

/** Signed photo links are valid for an hour, then need a reload. */
const SIGNED_URL_SECONDS = 60 * 60;

const CONDITION_BADGE: Record<
  Condition,
  "secondary" | "outline" | "destructive"
> = {
  good: "secondary",
  fair: "outline",
  damaged: "destructive",
};

type Props = {
  rental: Pick<Rental, "id" | "user_id">;
  phase: InspectionPhase;
};

export function InspectionChecklist({ rental, phase }: Props) {
  const [supabase] = useState(() => createClient());
  const [entries, setEntries] = useState<InspectionItem[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recording, setRecording] = useState<RecordTarget | null>(null);
  const [viewing, setViewing] = useState<InspectionItem | null>(null);
  const [removing, setRemoving] = useState<InspectionItem | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  // The bucket is private, so photos are shown through short-lived signed URLs.
  const signPhotos = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      const { data, error } = await supabase.storage
        .from("evidence")
        .createSignedUrls(paths, SIGNED_URL_SECONDS);
      if (error || !data) {
        toast.error("Couldn't load the photos. Reload the page to try again.");
        return;
      }
      setPhotoUrls((prev) => {
        const next = { ...prev };
        for (const signed of data) {
          if (signed.path && signed.signedUrl) {
            next[signed.path] = signed.signedUrl;
          }
        }
        return next;
      });
    },
    [supabase],
  );

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("inspection_items")
      .select("*")
      .eq("rental_id", rental.id);
    if (phase === "move_in") query = query.eq("phase", phase);
    const { data, error } = await query.order("captured_at");
    const rows = (data as InspectionItem[] | null) ?? [];
    setLoadError(error ? error.message : null);
    setEntries(rows);
    setLoading(false);
    await signPhotos(
      rows.flatMap((row) => (row.photo_path ? [row.photo_path] : [])),
    );
  }, [supabase, rental.id, phase, signPhotos]);

  useEffect(() => {
    load();
  }, [load]);

  const rooms = useMemo(() => buildChecklist(entries, phase), [entries, phase]);
  const comparison = useMemo(() => buildComparison(entries), [entries]);
  const comparisonLines = comparison.flatMap((room) => room.lines);
  const progress =
    phase === "move_out"
      ? {
          recorded: comparisonLines.filter((line) => line.moveOut.length > 0)
            .length,
          total: comparisonLines.length,
        }
      : checklistProgress(rooms);

  function handleRecorded(entry: InspectionItem) {
    setEntries((prev) => [...prev, entry]);
    if (entry.photo_path) signPhotos([entry.photo_path]);
  }

  async function remove() {
    if (!removing) return;
    setRemoveBusy(true);
    const { error } = await supabase
      .from("inspection_items")
      .delete()
      .eq("id", removing.id);
    if (error) {
      setRemoveBusy(false);
      toast.error(`Couldn't remove this item: ${error.message}`);
      return;
    }
    if (removing.photo_path) {
      await supabase.storage.from("evidence").remove([removing.photo_path]);
    }
    setRemoveBusy(false);
    setEntries((prev) => prev.filter((entry) => entry.id !== removing.id));
    toast.success(`${removing.item} removed`);
    setRemoving(null);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/40 p-6 text-center">
        <p className="font-medium">Couldn&apos;t load the checklist.</p>
        <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }

  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.recorded / progress.total) * 100);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-medium">
            {progress.recorded} of {progress.total} items recorded
          </p>
          <p className="text-sm text-muted-foreground">
            {phase === "move_in"
              ? "Record each item on the day you move in."
              : "Record each item on the day you move out."}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label={`${PHASE_LABEL[phase]} checklist progress`}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.recorded}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {phase === "move_out" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Compare move-in and move-out
            </h2>
            <p className="text-sm text-muted-foreground">
              Match the same item across both inspections. Every recording keeps
              its original timestamp.
            </p>
          </div>
          {comparison.map((room) => (
            <section
              key={room.room}
              className="overflow-hidden rounded-lg border"
            >
              <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <h3 className="font-semibold">{room.room}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecording({ room: room.room, item: null })}
                  aria-label={`Add an item to ${room.room}`}
                >
                  <Plus />
                  Add item
                </Button>
              </header>
              <ul className="divide-y">
                {room.lines.map((line) => (
                  <li
                    key={line.item}
                    data-comparison-item={`${line.room} ${line.item}`}
                  >
                    <h4 className="px-4 pt-3 font-medium">{line.item}</h4>
                    <div className="grid sm:grid-cols-2 sm:divide-x">
                      {(["move_in", "move_out"] as const).map((side) => {
                        const recorded =
                          side === "move_in" ? line.moveIn : line.moveOut;
                        return (
                          <div
                            key={side}
                            className="min-w-0 py-2"
                            data-phase={side}
                          >
                            <p className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {PHASE_LABEL[side]}
                            </p>
                            {recorded.map((entry) => (
                              <ChecklistRow
                                key={entry.id}
                                largePhoto
                                line={{
                                  room: line.room,
                                  item: line.item,
                                  entry,
                                }}
                                photoUrl={
                                  entry.photo_path
                                    ? photoUrls[entry.photo_path]
                                    : undefined
                                }
                                onRecord={() =>
                                  setRecording({
                                    room: line.room,
                                    item: line.item,
                                  })
                                }
                                onView={() => setViewing(entry)}
                                onRemove={
                                  side === "move_out"
                                    ? () => setRemoving(entry)
                                    : undefined
                                }
                              />
                            ))}
                            {recorded.length === 0 && (
                              <div className="flex items-center justify-between gap-3 px-4 py-3">
                                <p className="text-sm text-muted-foreground">
                                  No {PHASE_LABEL[side].toLowerCase()} record
                                </p>
                                {side === "move_out" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setRecording({
                                        room: line.room,
                                        item: line.item,
                                      })
                                    }
                                    aria-label={`Record ${line.room} ${line.item}`}
                                  >
                                    <Camera />
                                    Record
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {phase === "move_in" &&
        rooms.map((room) => {
          const done = room.lines.filter((line) => line.entry).length;
          return (
            <section key={room.room} className="rounded-lg border">
              <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <h3 className="font-semibold">
                  {room.room}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {done}/{room.lines.length}
                  </span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecording({ room: room.room, item: null })}
                  aria-label={`Add an item to ${room.room}`}
                >
                  <Plus />
                  Add item
                </Button>
              </header>
              <ul className="divide-y">
                {room.lines.map((line) => (
                  <li key={line.entry?.id ?? `todo-${line.item}`}>
                    <ChecklistRow
                      line={line}
                      photoUrl={
                        line.entry?.photo_path
                          ? photoUrls[line.entry.photo_path]
                          : undefined
                      }
                      onRecord={() =>
                        setRecording({ room: line.room, item: line.item })
                      }
                      onView={() => setViewing(line.entry)}
                      onRemove={() => setRemoving(line.entry)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

      <RecordItemDialog
        target={recording}
        onOpenChange={(open) => !open && setRecording(null)}
        rental={rental}
        phase={phase}
        onRecorded={handleRecorded}
      />

      <PhotoDialog
        entry={viewing}
        photoUrl={
          viewing?.photo_path ? photoUrls[viewing.photo_path] : undefined
        }
        onOpenChange={(open) => !open && setViewing(null)}
      />

      <Dialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this evidence?</DialogTitle>
            <DialogDescription>
              The record and its photo will be deleted. If you record the item
              again it gets a new timestamp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={remove}
              disabled={removeBusy}
            >
              {removeBusy ? "Removing…" : "Remove evidence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistRow({
  line,
  photoUrl,
  onRecord,
  onView,
  onRemove,
  largePhoto = false,
}: {
  line: ChecklistLine;
  photoUrl: string | undefined;
  onRecord: () => void;
  onView: () => void;
  onRemove?: () => void;
  largePhoto?: boolean;
}) {
  const { entry } = line;

  if (!entry) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate">{line.item}</p>
          <p className="text-sm text-muted-foreground">Not recorded yet</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRecord}
          aria-label={`Record ${line.room} ${line.item}`}
        >
          <Camera />
          Record
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${largePhoto ? "flex-col" : ""}`}
    >
      {entry.photo_path ? (
        <button
          type="button"
          onClick={onView}
          aria-label={`View photo of ${line.room} ${entry.item}`}
          className={`${largePhoto ? "h-44 w-full" : "size-16"} shrink-0 overflow-hidden rounded-md border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          {photoUrl && (
            // Signed URLs from a private bucket change on every load, so
            // next/image's optimiser and cache don't apply.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              className={`size-full ${largePhoto ? "object-contain" : "object-cover"}`}
              loading="lazy"
            />
          )}
        </button>
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed text-center text-xs text-muted-foreground">
          No photo
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{entry.item}</p>
          <Badge variant={CONDITION_BADGE[entry.condition]}>
            {CONDITION_LABEL[entry.condition]}
          </Badge>
        </div>
        {entry.note && (
          <p className="break-words text-sm text-muted-foreground">
            {entry.note}
          </p>
        )}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3 shrink-0" aria-hidden />
          Recorded {formatDateTime(entry.captured_at)}
        </p>
      </div>

      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove ${line.room} ${entry.item}`}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}

function PhotoDialog({
  entry,
  photoUrl,
  onOpenChange,
}: {
  entry: InspectionItem | null;
  photoUrl: string | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  // Keep the photo on screen while the dialog animates closed.
  const [shown, setShown] = useState(entry);
  const [shownUrl, setShownUrl] = useState(photoUrl);
  if (entry && entry !== shown) setShown(entry);
  if (entry && photoUrl && photoUrl !== shownUrl) setShownUrl(photoUrl);
  const current = entry ?? shown;

  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {current ? `${current.room} · ${current.item}` : "Photo"}
          </DialogTitle>
          <DialogDescription>
            {current &&
              `${CONDITION_LABEL[current.condition]} · recorded ${formatDateTime(current.captured_at)}`}
          </DialogDescription>
        </DialogHeader>
        {shownUrl && current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownUrl}
            alt={`${current.room} ${current.item}, ${CONDITION_LABEL[current.condition].toLowerCase()} condition`}
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
