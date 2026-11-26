/**
 * Hippo Know-How review on the V2 Topics board (Kennady, November 17, 2026: "I need a spot here to link all the Hippo Know-Hows so we
 * can review and approve them. So we could open up the 'Hippo Know Hows' for that topic and then review/approve them all or mark them
 * 'feedback' or 'stuck'.").
 *
 * The team's review is kept in the existing publisher review storage (kind `hippo-know-how`, record = HippoKnowHow.Id), not in
 * HippoKnowHow.Status: that column is Forge's approval, which every transfer already carries, and the State readiness count reads it.
 * - Approved = a sign-off.
 * - Feedback / Stuck = an open flag whose label (AssignedTo) is "Feedback" or "Stuck", with the reviewer's note.
 * - To review = neither.
 * Stuck outranks Feedback, and an open flag outranks a sign-off (Approve resolves open flags first; a flag withdraws a sign-off first).
 */
export const KNOW_HOW_KIND = "hippo-know-how" as const;
export const KNOW_HOW_FLAGS = { feedback: "Feedback", stuck: "Stuck" } as const;
export type KnowHowFlagKind = keyof typeof KNOW_HOW_FLAGS;
export type KnowHowReviewStatus = "to-review" | "approved" | "feedback" | "stuck";
export const knowHowReviewLabel: Record<KnowHowReviewStatus, string> = { "to-review": "To review", approved: "Approved", feedback: "Feedback", stuck: "Stuck" };

export type KnowHowNote = { id: number; kind: KnowHowFlagKind; note: string; by: string; on: string };
export type KnowHowReview = { status: KnowHowReviewStatus; approved: { by: string; on: string } | null; notes: KnowHowNote[] };
/** One breakout on the review page and its walkthrough, if one has been brought over from Forge. */
export type KnowHowReviewItem = {
  breakoutId: number;
  breakoutName: string;
  standards: string[];
  knowHow: null | { id: number; title: string; seconds: number; revision: string; review: KnowHowReview; package: unknown /* package type lives in the CMS */ };
};
export type KnowHowTopicCounts = { breakouts: number; knowHows: number } & Record<KnowHowReviewStatus, number>;

/** The flag label as stored, or null for any other flag (a General flag is not one of these review marks). */
export function flagKind(assignedTo: string | null | undefined): KnowHowFlagKind | null {
  const v = String(assignedTo ?? "").trim().toLowerCase();
  return v === "feedback" ? "feedback" : v === "stuck" ? "stuck" : null;
}

export function knowHowStatus(signedOff: boolean, open: { kind: KnowHowFlagKind }[]): KnowHowReviewStatus {
  if (open.some((n) => n.kind === "stuck")) return "stuck";
  if (open.some((n) => n.kind === "feedback")) return "feedback";
  return signedOff ? "approved" : "to-review";
}

export function emptyCounts(breakouts = 0): KnowHowTopicCounts {
  return { breakouts, knowHows: 0, "to-review": 0, approved: 0, feedback: 0, stuck: 0 };
}

/** Short board text: "All 3 approved", "2 to review", "1 stuck · 1 to review", "None yet". */
export function countsLabel(c: KnowHowTopicCounts): string {
  if (!c.knowHows) return "None yet";
  if (c.approved === c.knowHows) return `All ${c.knowHows} approved`;
  const parts: string[] = [];
  if (c.stuck) parts.push(`${c.stuck} stuck`);
  if (c.feedback) parts.push(`${c.feedback} feedback`);
  if (c["to-review"]) parts.push(`${c["to-review"]} to review`);
  return parts.join(" · ");
}

/** The steps one decision takes in the review storage, in order. Each is a separate audited write. */
export type KnowHowStep =
  | { action: "resolve"; flagId: number; resolutionNote: string }
  | { action: "withdraw" }
  | { action: "sign-off"; revision: string }
  | { action: "flag"; note: string; assignedTo: string };
export function knowHowSteps(
  review: KnowHowReview,
  decision: { to: "approved"; revision: string } | { to: KnowHowFlagKind; note: string } | { to: "reopen" },
): KnowHowStep[] {
  const steps: KnowHowStep[] = [];
  if (decision.to === "approved") {
    for (const n of review.notes) steps.push({ action: "resolve", flagId: n.id, resolutionNote: "Approved" });
    if (!review.approved) steps.push({ action: "sign-off", revision: decision.revision });
    return steps;
  }
  if (decision.to === "reopen") {
    for (const n of review.notes) steps.push({ action: "resolve", flagId: n.id, resolutionNote: "Back to review" });
    if (review.approved) steps.push({ action: "withdraw" });
    return steps;
  }
  const note = decision.note.trim();
  if (!note) throw new Error(decision.to === "stuck" ? "Say what it's stuck on." : "Write the feedback first.");
  if (note.length > 2000) throw new Error("Keep the note under 2,000 characters.");
  // Switching between Feedback and Stuck closes the other kind; more notes of the same kind add up.
  for (const n of review.notes) if (n.kind !== decision.to) steps.push({ action: "resolve", flagId: n.id, resolutionNote: `Changed to ${KNOW_HOW_FLAGS[decision.to]}` });
  if (review.approved) steps.push({ action: "withdraw" });
  steps.push({ action: "flag", note, assignedTo: KNOW_HOW_FLAGS[decision.to] });
  return steps;
}
