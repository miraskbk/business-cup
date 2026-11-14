"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import { toEvidenceJpeg } from "@/lib/image";
import { buildSampleApartment, SAMPLE_PHOTOS } from "@/lib/sample-apartment";
import { takeSampleIntent } from "@/components/rentals/sample-link";
import { Button } from "@/components/ui/button";

export function SampleApartment() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const pending = useRef<Promise<string | null> | null>(null);
  // Creating the sample writes rows and photos, so it needs a click: either
  // on a link that led here or on the button below. Loading the URL alone,
  // as a crawler does, only reopens a sample that already exists.
  const confirmed = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (takeSampleIntent()) confirmed.current = true;
    async function seed(): Promise<string | null> {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user)
        throw new Error(
          "Couldn't start your guest session. Please reload and try again.",
        );
      const { data: existing, error: lookupError } = await supabase
        .from("rentals")
        .select("id")
        .eq("is_sample", true)
        .maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (existing) return existing.id;
      if (!confirmed.current) return null;
      const fixture = buildSampleApartment(auth.user.id, todayISO(), () =>
        crypto.randomUUID(),
      );
      const uploaded: string[] = [];
      try {
        // Upload before the transaction, so no evidence row points at a
        // photo that failed to upload. RLS restricts these paths to this user.
        for (const item of fixture.items.filter((item) => item.photo_path)) {
          const response = await fetch(SAMPLE_PHOTOS[item.phase]);
          if (!response.ok)
            throw new Error(
              "Couldn't load the sample photos. Please try again.",
            );
          const blob = await response.blob();
          const jpeg = await toEvidenceJpeg(
            new File([blob], "sample.jpg", { type: blob.type }),
          );
          const { error } = await supabase.storage
            .from("evidence")
            .upload(item.photo_path!, jpeg, { contentType: "image/jpeg" });
          if (error) throw new Error(error.message);
          uploaded.push(item.photo_path!);
        }
        const { data, error } = await supabase.rpc("seed_sample_apartment", {
          p_rental: fixture.rental,
          p_items: fixture.items,
          p_events: fixture.events,
          p_deductions: fixture.deductions,
        });
        if (error) throw new Error(error.message);
        if (typeof data !== "string")
          throw new Error("The sample couldn't be created. Please try again.");
        // Another tab might have won the transaction lock while we uploaded.
        if (data !== fixture.rental.id)
          await supabase.storage.from("evidence").remove(uploaded);
        return data;
      } catch (error) {
        // A response can be lost after a successful commit. Recover it instead
        // of deleting the photos referenced by an already-created sample.
        const recovery = await supabase
          .from("rentals")
          .select("id")
          .eq("id", fixture.rental.id)
          .eq("is_sample", true)
          .maybeSingle();
        if (recovery.data) return recovery.data.id;
        if (!recovery.error && uploaded.length)
          await supabase.storage.from("evidence").remove(uploaded);
        throw error;
      }
    }
    // Strict Mode may rerun the effect; share its in-flight operation.
    if (!pending.current) pending.current = seed();
    pending.current
      .then((id) => {
        if (active && id === null) {
          setAsking(true);
        } else if (active) {
          const view = new URLSearchParams(window.location.search).get("view");
          const suffix =
            view &&
            ["move-in", "lease-log", "renewal", "move-out"].includes(view)
              ? `?view=${view}`
              : "";
          router.replace(`/protected/rentals/${id}${suffix}`);
        }
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : "Please try again.");
      });
    return () => {
      active = false;
    };
  }, [supabase, router, attempt]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      {error ? (
        <>
          <h1 className="text-xl font-semibold">
            Couldn&apos;t prepare the sample
          </h1>
          <p role="alert" className="text-sm text-muted-foreground">
            {error}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                pending.current = null;
                setError(null);
                setAttempt((prev) => prev + 1);
              }}
            >
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/protected">My rentals</Link>
            </Button>
          </div>
        </>
      ) : asking ? (
        <>
          <h1 className="text-xl font-semibold">Explore a sample apartment</h1>
          <p className="text-sm text-muted-foreground">
            A fictional rental with sample photos, lease events, and a disputed
            $300 deduction, saved in your own private guest session.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                confirmed.current = true;
                pending.current = null;
                setAsking(false);
                setAttempt((prev) => prev + 1);
              }}
            >
              Open the sample
            </Button>
            <Button asChild variant="outline">
              <Link href="/protected">My rentals</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
          <h1 className="text-xl font-semibold">
            Preparing your sample apartment
          </h1>
          <p className="text-sm text-muted-foreground">
            Saving a fictional rental, sample photos, lease events, and a
            disputed $300 deduction in your own guest session.
          </p>
          <p className="text-xs text-muted-foreground">
            If you&apos;ve tried it before, we&apos;ll reopen your existing
            sample.
          </p>
        </>
      )}
    </div>
  );
}
