"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDateTime, todayISO } from "@/lib/format";
import {
  EMPTY_EVENT,
  EVENT_KINDS,
  EVENT_KIND_LABEL,
  EVENT_STATUS_LABEL,
  eventStatus,
  validateEvent,
  type EventDraft,
  type EventErrors,
} from "@/lib/lease-log";
import type { LeaseEvent, Rental } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeaseLog({ rental }: { rental: Rental }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<LeaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(todayISO);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaseEvent | null>(null);
  const [draft, setDraft] = useState<EventDraft>(EMPTY_EVENT);
  const [errors, setErrors] = useState<EventErrors>({});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string[]>([]);
  const [removing, setRemoving] = useState<LeaseEvent | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lease_events")
      .select("*")
      .eq("rental_id", rental.id)
      .order("created_at", { ascending: false });
    setLoadError(error?.message ?? null);
    if (!error) setRows(data as LeaseEvent[]);
    setLoading(false);
  }, [supabase, rental.id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayISO()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function openForm(row: LeaseEvent | null) {
    setEditing(row);
    setDraft(
      row
        ? {
            kind: row.kind,
            title: row.title,
            details: row.details ?? "",
            due_date: row.due_date ?? "",
            resolved: row.resolved,
          }
        : EMPTY_EVENT,
    );
    setErrors({});
    setFormOpen(true);
  }

  function setField<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = validateEvent(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    const query = editing
      ? supabase
          .from("lease_events")
          .update(result.payload)
          .eq("id", editing.id)
          .eq("rental_id", rental.id)
      : supabase
          .from("lease_events")
          .insert({ ...result.payload, rental_id: rental.id });
    const { data, error } = await query.select().single();
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save the event: ${error.message}`);
      return;
    }
    setRows((prev) =>
      editing
        ? prev.map((row) =>
            row.id === editing.id ? (data as LeaseEvent) : row,
          )
        : [data as LeaseEvent, ...prev],
    );
    setFormOpen(false);
    toast.success(editing ? "Event updated" : "Event added");
  }

  async function toggle(row: LeaseEvent, resolved: boolean) {
    setToggling((prev) => [...prev, row.id]);
    const { data, error } = await supabase
      .from("lease_events")
      .update({ resolved })
      .eq("id", row.id)
      .eq("rental_id", rental.id)
      .select()
      .single();
    setToggling((prev) => prev.filter((id) => id !== row.id));
    if (error) {
      toast.error(`Couldn't update the event: ${error.message}`);
      return;
    }
    setRows((prev) =>
      prev.map((entry) => (entry.id === row.id ? (data as LeaseEvent) : entry)),
    );
    toast.success(resolved ? "Event resolved" : "Event reopened");
  }

  async function remove() {
    if (!removing) return;
    setRemoveBusy(true);
    const { error } = await supabase
      .from("lease_events")
      .delete()
      .eq("id", removing.id)
      .eq("rental_id", rental.id);
    setRemoveBusy(false);
    if (error) {
      toast.error(`Couldn't remove the event: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== removing.id));
    setRemoving(null);
    toast.success("Event removed");
  }

  if (loading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  if (loadError)
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 p-5">
        <p>Couldn&apos;t load the lease log.</p>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    );
  const openCount = rows.filter((row) => !row.resolved).length;
  const overdueCount = rows.filter(
    (row) => eventStatus(row, today) === "overdue",
  ).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Your lease timeline</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Keep repair requests, promises, notices, and payments in one place,
            with dates you can refer back to.
          </p>
          <p className="text-sm">
            <span className="font-medium">{openCount} open</span>
            {overdueCount > 0 && (
              <span className="text-destructive">
                {" "}
                · {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => openForm(null)}>
          <Plus />
          Add event
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No lease events yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Log the next repair request or agreement so the details don&apos;t
            get lost.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => openForm(null)}
          >
            Add your first event
          </Button>
        </div>
      ) : (
        <ol className="space-y-4 border-l-2 border-muted pl-4 sm:pl-6">
          {rows.map((row) => {
            const status = eventStatus(row, today);
            return (
              <li
                key={row.id}
                data-lease-event={row.id}
                className="relative space-y-3 rounded-lg border p-4"
              >
                <span
                  className="absolute -left-[23px] top-6 size-3 rounded-full border-2 border-background bg-secondary sm:-left-[31px]"
                  aria-hidden
                />
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {EVENT_KIND_LABEL[row.kind]}
                      </Badge>
                      <Badge
                        variant={
                          status === "overdue"
                            ? "destructive"
                            : status === "resolved"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {EVENT_STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <h3 className="break-words font-semibold">{row.title}</h3>
                  </div>
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={toggling.includes(row.id)}
                      aria-label={`Edit event ${row.title}`}
                      onClick={() => openForm(row)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={toggling.includes(row.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove event ${row.title}`}
                      onClick={() => setRemoving(row)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                {row.details && (
                  <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {row.details}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <p>Logged {formatDateTime(row.created_at)}</p>
                  {row.due_date && (
                    <p className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      Due {formatDate(row.due_date)}
                    </p>
                  )}
                </div>
                <Label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={row.resolved}
                    disabled={toggling.includes(row.id)}
                    aria-label={`Resolve ${row.title}`}
                    onCheckedChange={(checked) => toggle(row, checked === true)}
                  />
                  Resolved
                </Label>
              </li>
            );
          })}
        </ol>
      )}
      <Dialog
        open={formOpen}
        onOpenChange={(value) => !saving && setFormOpen(value)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit lease event" : "Add lease event"}
            </DialogTitle>
            <DialogDescription>
              Record what happened and when a response or action is due.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="event-kind">Type</Label>
                <Select
                  value={draft.kind}
                  onValueChange={(value) =>
                    setField("kind", value as EventDraft["kind"])
                  }
                >
                  <SelectTrigger id="event-kind" aria-invalid={!!errors.kind}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {EVENT_KIND_LABEL[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.kind && (
                  <p className="text-sm text-destructive">{errors.kind}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="event-due">
                  Due date{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="event-due"
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setField("due_date", e.target.value)}
                  aria-invalid={!!errors.due_date}
                  aria-describedby={
                    errors.due_date ? "event-due-error" : undefined
                  }
                />
                {errors.due_date && (
                  <p id="event-due-error" className="text-sm text-destructive">
                    {errors.due_date}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                maxLength={200}
                value={draft.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Asked landlord to fix the leaking sink"
                aria-invalid={!!errors.title}
                aria-describedby={
                  errors.title ? "event-title-error" : undefined
                }
              />
              {errors.title && (
                <p id="event-title-error" className="text-sm text-destructive">
                  {errors.title}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-details">
                Details{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="event-details"
                rows={3}
                value={draft.details}
                onChange={(e) => setField("details", e.target.value)}
                placeholder="What was agreed, who you spoke to, and how you contacted them"
              />
            </div>
            <Label className="flex items-center gap-2">
              <Checkbox
                checked={draft.resolved}
                onCheckedChange={(checked) =>
                  setField("resolved", checked === true)
                }
              />
              Resolved
            </Label>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removing}
        onOpenChange={(value) => !value && !removeBusy && setRemoving(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this event?</DialogTitle>
            <DialogDescription>
              This entry will be removed from your lease timeline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={removeBusy}
              onClick={() => setRemoving(null)}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={removeBusy}
              onClick={remove}
            >
              {removeBusy ? "Removing…" : "Remove event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
