// The approval chain. Every request is signed in this order.
// When a request is created, one request_steps row is generated per position, in order.

export const POSITIONS = ["Adviser", "Chairperson", "College Dean"] as const;
export type Position = (typeof POSITIONS)[number];

export const FORM_TYPES = [
  "Load Revision Form",
  "Leave of Absence Form",
  "Shifter's Application Form",
] as const;
export type FormType = (typeof FORM_TYPES)[number];

// All three forms currently share the same chain. Change an entry here if a form needs a different one.
export const APPROVAL_CHAIN: Record<FormType, readonly Position[]> = {
  "Load Revision Form": POSITIONS,
  "Leave of Absence Form": POSITIONS,
  "Shifter's Application Form": POSITIONS,
};

export type StepStatus = "Waiting" | "Pending" | "Approved" | "Rejected" | "Returned";

/** Steps to insert for a brand-new request: the first is Pending (their turn), the rest Waiting. */
export function buildSteps(type: FormType) {
  return APPROVAL_CHAIN[type].map((position, i) => ({
    stepOrder: i + 1,
    position,
    status: (i === 0 ? "Pending" : "Waiting") as StepStatus,
  }));
}
