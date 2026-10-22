import type { Draft, Question } from "./model";

/** Bulk entry is line based, so labels containing commas stay intact. */
export function parseBulkChoices(text: string): string[] {
  const options = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (options.length < 2)
    throw new Error("Add at least two choices, one per line.");
  if (options.length > 30)
    throw new Error("A question can have up to 30 choices.");
  if (options.some((s) => s.length > 100))
    throw new Error("Each choice must be 100 characters or fewer.");
  if (new Set(options).size !== options.length)
    throw new Error("Each choice needs a different label.");
  return options;
}

/** Renaming is explicit; reordering choices must never rewrite a rule. */
export function patchQuestion(
  draft: Draft,
  id: string,
  patch: Partial<Question>,
  renames: Record<string, string> = {},
): Partial<Draft> {
  const original = draft.questions.find((q) => q.id === id);
  const adapt = (c: Question["condition"]) => {
    if (!c || c.questionId !== id) return c;
    const value = renames[c.value] ?? c.value;
    if (
      patch.options &&
      ["equals", "not_equals"].includes(c.operator) &&
      original?.options.includes(c.value) &&
      !patch.options.includes(value)
    ) {
      throw new Error(
        `“${c.value}” is used by a rule. Update that rule before removing this choice.`,
      );
    }
    return { ...c, value };
  };
  return {
    ...(draft.pageRules
      ? {
          pageRules: draft.pageRules.map((rule) => ({
            ...rule,
            condition: adapt(rule.condition)!,
          })),
        }
      : {}),
    questions: draft.questions.map((q) =>
      q.id === id
        ? { ...q, ...patch }
        : { ...q, condition: adapt(q.condition) },
    ),
    ...(draft.routing
      ? {
          routing: {
            ...draft.routing,
            rules: draft.routing.rules.map((r) => ({
              ...r,
              condition: adapt(r.condition)!,
            })),
          },
        }
      : {}),
  };
}
