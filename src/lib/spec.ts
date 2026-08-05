import type { Answers, Status } from "@/db/schema";

export const QUESTIONS = [
  { id: "who",    label: "Who is this for, and what problem does it solve?" },
  { id: "flow",   label: "What does the person do, step by step?" },
  { id: "check",  label: "How do we know it works?", kind: "checks" as const,
    hint: "One check per line. Each has to pass or fail on its own." },
  { id: "fail",   label: "What happens when it goes wrong?",
    hint: "Errors, empty states, the second click, the expired session." },
  { id: "out",    label: "What is explicitly out of scope?" },
  { id: "breaks", label: "What existing behaviour or data does this change?" },
] as const;

export const STAGES: { id: Status; label: string }[] = [
  { id: "discussion", label: "Discussion" },
  { id: "specified",  label: "Specified" },
  { id: "building",   label: "Building" },
  { id: "review",     label: "Review" },
  { id: "deployed",   label: "Deployed" },
];

export function checksOf(a: Answers): string[] {
  return (a.check ?? []).filter((c) => c.trim().length > 0);
}

export function missingCount(a: Answers): number {
  return QUESTIONS.filter((q) =>
    q.id === "check"
      ? checksOf(a).length === 0
      : !((a as Record<string, unknown>)[q.id] as string | undefined)?.trim()
  ).length;
}

export const isGated = (a: Answers) => missingCount(a) > 0;
