import type { WaitlistInterest } from "@prisma/client";

export const WAITLIST_INTERESTS: { value: WaitlistInterest; label: string }[] = [
  { value: "RIDE", label: "Book rides" },
  { value: "RENT", label: "Rent cars" },
  { value: "DRIVE", label: "Drive and earn" },
  { value: "HOST", label: "List my car" },
];

export const WAITLIST_INTEREST_LABEL = Object.fromEntries(WAITLIST_INTERESTS.map((i) => [i.value, i.label])) as Record<
  WaitlistInterest,
  string
>;
