"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  generateDemandLetter,
  type LetterDetails,
  type LetterErrors,
} from "@/lib/demand-letter";
import { ruleFor } from "@/lib/deposit-rules";
import { formatDateTime, formatMoney, todayISO } from "@/lib/format";
import { CONDITION_LABEL, PHASE_LABEL } from "@/lib/inspection";
import type { Deduction, InspectionItem, Rental } from "@/lib/types";
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

type Snapshot = {
  rental: Rental;
  deductions: Deduction[];
  evidence: InspectionItem[];
};
type PrintPhoto = { entry: InspectionItem; url: string };

function preloadPhoto(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(
      () => reject(new Error("A photo took too long to load.")),
      15_000,
    );
    img.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("A saved photo couldn't be loaded."));
    };
    img.src = url;
  });
}

export function DemandLetter({
  rental,
  today,
  compact = false,
}: {
  rental: Rental;
  today: string;
  compact?: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [details, setDetails] = useState<LetterDetails>({
    senderName: "",
    forwardingAddress: "",
    refundedAmount: "0",
  });
  const [errors, setErrors] = useState<LetterErrors>({});
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(false);
  const [amount, setAmount] = useState(0);
  const [evidence, setEvidence] = useState<InspectionItem[]>([]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [printPhotos, setPrintPhotos] = useState<PrintPhoto[]>([]);
  const [printing, setPrinting] = useState(false);
  const [copying, setCopying] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const unavailable = rental.deposit_returned_at
    ? "This deposit is marked resolved. Reopen tracking to request an outstanding refund."
    : !rental.move_out_date || rental.move_out_date > today
      ? "Set a move-out date on or before today to create your letter."
      : null;

  async function load() {
    setOpen(true);
    setLoading(true);
    setLoadError(null);
    setPreview(false);
    setPrintPhotos([]);
    setErrors({});
    setSnapshot(null);
    // Read at the point of generation so edits in the deductions/checklist
    // above are reflected without reloading the rental page.
    try {
      const [rentalResult, deductionsResult, evidenceResult] =
        await Promise.all([
          supabase.from("rentals").select("*").eq("id", rental.id).single(),
          supabase
            .from("deductions")
            .select("*")
            .eq("rental_id", rental.id)
            .order("created_at"),
          supabase
            .from("inspection_items")
            .select("*")
            .eq("rental_id", rental.id)
            .order("captured_at"),
        ]);
      const error =
        rentalResult.error ?? deductionsResult.error ?? evidenceResult.error;
      if (error) throw new Error(error.message);
      setSnapshot({
        rental: rentalResult.data as Rental,
        deductions: deductionsResult.data as Deduction[],
        evidence: evidenceResult.data as InspectionItem[],
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function generate(event: React.FormEvent) {
    event.preventDefault();
    if (!snapshot) return;
    const result = generateDemandLetter({
      ...snapshot,
      ...details,
      today: todayISO(),
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setText(result.text);
    setAmount(result.amountRequested);
    setEvidence(result.evidence);
    setPrintPhotos([]);
    setPreview(true);
  }

  async function copy() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        "Letter copied. Include any supporting photos when you send it.",
      );
    } catch {
      textarea.current?.focus();
      textarea.current?.select();
      toast.error(
        "Copy wasn't allowed. The letter is selected so you can copy it manually.",
      );
    } finally {
      setCopying(false);
    }
  }

  async function print() {
    setPrinting(true);
    try {
      let photos: PrintPhoto[] = [];
      const withPhotos = includePhotos
        ? evidence.filter((entry) => entry.photo_path)
        : [];
      if (withPhotos.length) {
        const { data, error } = await supabase.storage
          .from("evidence")
          .createSignedUrls(
            withPhotos.map((entry) => entry.photo_path!),
            3600,
          );
        if (error) throw new Error(error.message);
        photos = withPhotos.map((entry) => {
          const signed = data?.find((photo) => photo.path === entry.photo_path);
          if (!signed?.signedUrl || signed.error)
            throw new Error("A saved photo couldn't be loaded.");
          return { entry, url: signed.signedUrl };
        });
        await Promise.all(photos.map((photo) => preloadPhoto(photo.url)));
      }
      setPrintPhotos(photos);
      // Let React commit the photo appendix before the browser snapshots it.
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        ),
      );
      window.print();
    } catch (error) {
      toast.error(
        `${error instanceof Error ? error.message : "Couldn't prepare the letter."} Try again, or turn off photos to print the letter and evidence index.`,
      );
    } finally {
      setPrinting(false);
    }
  }

  function setDetail(key: keyof LetterDetails, value: string) {
    setDetails((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  return (
    <section
      className={
        compact ? "space-y-2" : "space-y-3 rounded-lg border bg-card p-4 sm:p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className={compact ? "sr-only" : "max-w-xl space-y-1"}>
          <h2 className="text-lg font-semibold">Make your case in writing</h2>
          <p className="text-sm text-muted-foreground">
            Turn your rental details, disputed charges, and timestamped evidence
            into a letter you can review and send.
          </p>
        </div>
        <Button disabled={!!unavailable} onClick={load}>
          <FileText />
          Generate demand letter
        </Button>
      </div>
      {unavailable && (
        <p className="text-sm text-muted-foreground">{unavailable}</p>
      )}
      <Dialog open={open} onOpenChange={(value) => !printing && setOpen(value)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {preview
                ? "Review your demand letter"
                : "Prepare your demand letter"}
            </DialogTitle>
            <DialogDescription>
              {preview
                ? "Edit the draft below before copying or printing. Check every claim and amount before sending."
                : "Add your signature and forwarding address, then confirm any refund you've already received."}
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="space-y-3" aria-label="Loading letter details">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : loadError ? (
            <div className="space-y-3" role="alert">
              <p>Couldn&apos;t load the letter details.</p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button variant="outline" onClick={load}>
                Try again
              </Button>
            </div>
          ) : snapshot && !preview ? (
            <form onSubmit={generate} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="letter-sender">Your full name</Label>
                  <Input
                    id="letter-sender"
                    autoComplete="name"
                    value={details.senderName}
                    onChange={(e) => setDetail("senderName", e.target.value)}
                    aria-invalid={!!errors.senderName}
                    aria-describedby={
                      errors.senderName ? "letter-sender-error" : undefined
                    }
                  />
                  {errors.senderName && (
                    <p
                      id="letter-sender-error"
                      className="text-sm text-destructive"
                    >
                      {errors.senderName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="letter-refunded">
                    Amount already refunded ($)
                  </Label>
                  <Input
                    id="letter-refunded"
                    inputMode="decimal"
                    value={details.refundedAmount}
                    onChange={(e) =>
                      setDetail("refundedAmount", e.target.value)
                    }
                    aria-invalid={!!errors.refundedAmount}
                    aria-describedby={
                      errors.refundedAmount
                        ? "letter-refunded-help letter-refunded-error"
                        : "letter-refunded-help"
                    }
                  />
                  <p
                    id="letter-refunded-help"
                    className="text-xs text-muted-foreground"
                  >
                    Enter 0 if you haven&apos;t received any refund.
                  </p>
                  {errors.refundedAmount && (
                    <p
                      id="letter-refunded-error"
                      className="text-sm text-destructive"
                    >
                      {errors.refundedAmount}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="letter-forwarding">
                  Your forwarding address
                </Label>
                <Textarea
                  id="letter-forwarding"
                  autoComplete="street-address"
                  rows={3}
                  placeholder="Street address, apartment, city, state and ZIP"
                  value={details.forwardingAddress}
                  onChange={(e) =>
                    setDetail("forwardingAddress", e.target.value)
                  }
                  aria-invalid={!!errors.forwardingAddress}
                  aria-describedby={
                    errors.forwardingAddress
                      ? "letter-forwarding-error"
                      : undefined
                  }
                />
                {errors.forwardingAddress && (
                  <p
                    id="letter-forwarding-error"
                    className="text-sm text-destructive"
                  >
                    {errors.forwardingAddress}
                  </p>
                )}
              </div>
              <p className="rounded-md bg-muted/50 p-3 text-sm">
                Your request will subtract refunds received and charges
                you&apos;ve marked accepted from the{" "}
                {formatMoney(snapshot.rental.deposit_amount)} deposit. It
                includes no automatic penalties or fees.
              </p>
              {ruleFor(snapshot.rental.state)?.renterDuty && (
                <p className="text-sm text-muted-foreground">
                  {ruleFor(snapshot.rental.state)!.renterDuty}
                </p>
              )}
              {!ruleFor(snapshot.rental.state) && (
                <p className="text-sm text-muted-foreground">
                  No verified state rule is available for this rental. Your
                  letter will be a general refund request without a statute
                  citation or legal deadline.
                </p>
              )}
              {errors.rental && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.rental}
                </p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create letter</Button>
              </DialogFooter>
            </form>
          ) : (
            preview && (
              <div className="space-y-4">
                <p className="text-sm font-medium">
                  Calculated balance: {formatMoney(amount)} · {evidence.length}{" "}
                  evidence {evidence.length === 1 ? "record" : "records"}
                </p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="demand-letter-text">Letter text</Label>
                  <Textarea
                    id="demand-letter-text"
                    ref={textarea}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={16}
                    className="min-h-72 font-mono text-xs leading-relaxed"
                  />
                </div>
                <Label className="flex items-center gap-2">
                  <Checkbox
                    checked={includePhotos}
                    disabled={printing}
                    onCheckedChange={(checked) => {
                      setIncludePhotos(checked === true);
                      setPrintPhotos([]);
                    }}
                  />
                  Include saved photos in print / PDF
                </Label>
                <p className="text-xs text-muted-foreground">
                  Copy includes the letter and evidence index. Print can also
                  include photo pages. Use your browser&apos;s Save as PDF
                  option, or save a copy of the text before leaving.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={printing}
                    onClick={() => setPreview(false)}
                  >
                    Edit details
                  </Button>
                  <Button
                    variant="outline"
                    disabled={copying || printing || !text.trim()}
                    onClick={copy}
                  >
                    <Copy />
                    {copying ? "Copying…" : "Copy letter"}
                  </Button>
                  <Button disabled={printing || !text.trim()} onClick={print}>
                    <Printer />
                    {printing ? "Preparing photos…" : "Print / Save as PDF"}
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
      {open &&
        preview &&
        createPortal(
          <article data-demand-letter-print className="hidden">
            <div className="demand-letter-body">
              {text.split("\n\n").map((paragraph, index) => (
                <p
                  key={index}
                  className={
                    paragraph.startsWith("CONDITION EVIDENCE INDEX")
                      ? "demand-letter-index-heading"
                      : undefined
                  }
                >
                  {paragraph}
                </p>
              ))}
            </div>
            {printPhotos.length > 0 && (
              <section className="demand-letter-photos">
                <h1>Photo evidence</h1>
                {printPhotos.map(({ entry, url }) => (
                  <figure key={entry.id}>
                    <figcaption>
                      <strong>
                        {PHASE_LABEL[entry.phase]} · {entry.room} · {entry.item}
                      </strong>
                      <br />
                      {CONDITION_LABEL[entry.condition]} · Recorded{" "}
                      {formatDateTime(entry.captured_at, "UTC")} UTC
                      <br />
                      Record ID: {entry.id}
                      {entry.note && (
                        <>
                          <br />
                          {entry.note}
                        </>
                      )}
                    </figcaption>
                    {/* Short-lived signed URLs from the private evidence bucket. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${PHASE_LABEL[entry.phase]} ${entry.room} ${entry.item}`}
                    />
                  </figure>
                ))}
              </section>
            )}
          </article>,
          document.body,
        )}
    </section>
  );
}
