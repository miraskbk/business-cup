import { deadlineFor, ruleFor } from "./deposit-rules.ts";
import { formatDate, formatDateTime, formatMoney } from "./format.ts";
import { CONDITION_LABEL, PHASE_LABEL } from "./inspection.ts";
import { parseMoney } from "./money.ts";
import type { Deduction, InspectionItem, ISODate, Rental } from "./types.ts";

export type LetterDetails = {
  senderName: string;
  forwardingAddress: string;
  refundedAmount: string;
};

export type LetterErrors = Partial<
  Record<keyof LetterDetails | "rental", string>
>;

type LetterInput = LetterDetails & {
  rental: Rental;
  deductions: readonly Deduction[];
  evidence: readonly InspectionItem[];
  today: ISODate;
};

export type LetterResult =
  | { ok: false; errors: LetterErrors }
  | {
      ok: true;
      text: string;
      amountRequested: number;
      evidence: InspectionItem[];
    };

/**
 * A factual refund request, with money calculated in cents. The date is an
 * explicit input so the same saved facts always produce the same letter.
 * No penalties, missed-notice claims, or promises to attach files are invented.
 */
export function generateDemandLetter(input: LetterInput): LetterResult {
  const { rental, today } = input;
  const errors: LetterErrors = {};
  const name = input.senderName.trim();
  const address = input.forwardingAddress.trim();
  const refunded = parseMoney(input.refundedAmount);
  if (!name) errors.senderName = "Enter your name for the signature.";
  if (!address)
    errors.forwardingAddress =
      "Enter an address where you can receive the refund.";
  if (refunded === null || refunded > rental.deposit_amount) {
    errors.refundedAmount =
      "Enter a refund from $0 up to the original deposit, with up to two decimal places.";
  }
  if (!rental.move_out_date || rental.move_out_date > today) {
    errors.rental =
      "Set a move-out date on or before today to create a letter.";
  } else if (rental.deposit_returned_at) {
    errors.rental =
      "This deposit is marked resolved. Reopen tracking if you still need to request a refund.";
  }
  if (refunded === null || Object.keys(errors).length)
    return { ok: false, errors };

  // Only this rental's rows belong in its letter, even if callers pass more.
  const deductions = input.deductions.filter(
    (row) => row.rental_id === rental.id,
  );
  const disputed = deductions.filter((row) => row.disputed);
  const acceptedCents = deductions
    .filter((row) => !row.disputed)
    .reduce((total, row) => total + Math.round(row.amount * 100), 0);
  const requestedCents = Math.max(
    0,
    Math.round(rental.deposit_amount * 100) -
      acceptedCents -
      Math.round(refunded * 100),
  );
  if (requestedCents === 0) {
    return {
      ok: false,
      errors: {
        refundedAmount:
          "No balance remains after the accepted charges and refunds. Review those amounts before requesting payment.",
      },
    };
  }
  const amountRequested = requestedCents / 100;
  const evidence = input.evidence
    .filter((row) => row.rental_id === rental.id)
    .sort(
      (a, b) =>
        a.captured_at.localeCompare(b.captured_at) || a.id.localeCompare(b.id),
    );
  const rule = ruleFor(rental.state);
  const deadline = deadlineFor(rental);

  const paragraphs = [
    ...(rental.is_sample
      ? [
          "SAMPLE LETTER - fictional rental, simulated dates, and AI-generated example photos. Not a real payment demand.",
        ]
      : []),
    formatDate(today),
    `To: ${rental.landlord_name?.trim() || "Landlord or property manager"}${rental.landlord_email ? `\nEmail: ${rental.landlord_email}` : ""}`,
    `Re: Security deposit refund - ${rental.address}`,
    `Dear ${rental.landlord_name?.trim() || "Landlord or property manager"},`,
    `I rented ${rental.address}${rental.lease_start ? ` beginning ${formatDate(rental.lease_start)}` : ""} and moved out on ${formatDate(rental.move_out_date!)}. I paid a security deposit of ${formatMoney(rental.deposit_amount)}.`,
    `I request payment of ${formatMoney(amountRequested)} from my security deposit, based on the following accounting:\nSecurity deposit paid: ${formatMoney(rental.deposit_amount)}\nDeductions I accept: ${formatMoney(acceptedCents / 100)}\nRefunds already received: ${formatMoney(refunded)}\nRemaining amount requested: ${formatMoney(amountRequested)}`,
  ];
  if (disputed.length) {
    paragraphs.push(
      `I dispute these deductions:\n${disputed.map((row) => `- ${row.description}: ${formatMoney(row.amount)}`).join("\n")}\nPlease reconsider these charges${evidence.length ? " in light of the condition records listed below" : ""} and explain the basis for any charge you continue to claim.`,
    );
  }
  if (rule) {
    let timing: string;
    if (rule.state === "TX") {
      timing = `The general refund period is ${rule.returnDeadlineDays} days after surrender. Please account for the written forwarding address provided below when determining the applicable refund and itemization duties.`;
    } else if (rule.state === "FL") {
      timing = `${rule.deadlineSummary} Please account for the applicable termination date and any required tenant notice when determining the deadline.`;
    } else {
      timing = `The standard ${rule.returnDeadlineDays}-day period measured from my move-out date ${deadline! < today ? "ended" : "ends"} on ${formatDate(deadline!)}. If you believe a different rule or timing applies, please explain in writing.`;
    }
    paragraphs.push(
      `I request the remaining refund and any required itemized accounting consistent with ${rule.statuteCitation}. ${timing}\nOfficial source: ${rule.sourceUrl}`,
    );
  } else {
    paragraphs.push(
      "Please return the outstanding balance and provide a written explanation and supporting documentation for any amounts you believe should be withheld.",
    );
  }
  paragraphs.push(
    `Please respond in writing and send the remaining refund to my forwarding address:\n${address}\n\nI hope we can resolve this promptly.`,
    `Sincerely,\n${name}`,
  );
  if (evidence.length) {
    paragraphs.push(
      `CONDITION EVIDENCE INDEX\nThese are the condition records I saved. Photo availability is noted for each record.\n\n${evidence
        .map((row, index) =>
          [
            `${index + 1}. ${PHASE_LABEL[row.phase]} · ${row.room} · ${row.item}`,
            `Condition: ${CONDITION_LABEL[row.condition]}. Recorded: ${formatDateTime(row.captured_at, "UTC")} UTC.`,
            `Record ID: ${row.id}`,
            row.note ? `Note: ${row.note}` : null,
            row.photo_path
              ? "Photo saved with this record."
              : "No photo saved with this record.",
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n\n")}`,
    );
  }
  return { ok: true, text: paragraphs.join("\n\n"), amountRequested, evidence };
}
