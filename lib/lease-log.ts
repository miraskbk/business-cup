import type { ISODate, LeaseEvent, LeaseEventKind } from "./types.ts";

export const EVENT_KINDS: readonly LeaseEventKind[] = [
  "repair_request",
  "landlord_promise",
  "notice",
  "payment",
  "other",
];
export const EVENT_KIND_LABEL: Record<LeaseEventKind, string> = {
  repair_request: "Repair request",
  landlord_promise: "Landlord promise",
  notice: "Notice",
  payment: "Payment",
  other: "Other",
};
export type EventDraft = {
  kind: LeaseEventKind;
  title: string;
  details: string;
  due_date: string;
  resolved: boolean;
};
export type EventErrors = Partial<
  Record<"kind" | "title" | "due_date", string>
>;
export const EMPTY_EVENT: EventDraft = {
  kind: "repair_request",
  title: "",
  details: "",
  due_date: "",
  resolved: false,
};

export function validateEvent(
  draft: EventDraft,
):
  | { ok: false; errors: EventErrors }
  | {
      ok: true;
      payload: Omit<LeaseEvent, "id" | "user_id" | "rental_id" | "created_at">;
    } {
  const errors: EventErrors = {};
  const title = draft.title.trim();
  if (!title || title.length > 200)
    errors.title = "Enter a title of 1 to 200 characters.";
  if (!EVENT_KINDS.includes(draft.kind)) errors.kind = "Choose an event type.";
  if (draft.due_date) {
    const date = new Date(`${draft.due_date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.due_date) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== draft.due_date
    ) {
      errors.due_date = "Choose a valid due date.";
    }
  }
  return Object.keys(errors).length
    ? { ok: false, errors }
    : {
        ok: true,
        payload: {
          kind: draft.kind,
          title,
          details: draft.details.trim() || null,
          due_date: draft.due_date || null,
          resolved: draft.resolved,
        },
      };
}

export type EventStatus = "resolved" | "overdue" | "due_today" | "open";
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  resolved: "Resolved",
  overdue: "Overdue",
  due_today: "Due today",
  open: "Open",
};

export function eventStatus(
  event: Pick<LeaseEvent, "due_date" | "resolved">,
  today: ISODate,
): EventStatus {
  if (event.resolved) return "resolved";
  if (!event.due_date || event.due_date > today) return "open";
  return event.due_date < today ? "overdue" : "due_today";
}
