"use client";
import ExperiencePicker from "./experience-picker";
import { MediaEditor } from "./media-editor";
import { useEffect, useState } from "react";
import { Plus, Trash2, GitBranch, Layers, Users } from "lucide-react";
import { Draft, Question, Condition, TeamMember, formPages } from "@/lib/model";
import { api } from "@/lib/client";
export function ConditionEditor({
  condition,
  questions,
  onChange,
}: {
  condition: Condition;
  questions: Question[];
  onChange: (c: Condition) => void;
}) {
  const source = questions.find((q) => q.id === condition.questionId);
  const choices =
    source?.type === "yes/no"
      ? ["Yes", "No"]
      : source?.type === "rating"
        ? ["1", "2", "3", "4", "5"]
        : source?.options || [];
  return (
    <div className="condition-fields">
      <label>
        When the answer to
        <select
          value={condition.questionId}
          onChange={(e) =>
            onChange({ ...condition, questionId: e.target.value, value: "" })
          }
        >
          {questions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Condition
        <select
          value={condition.operator}
          onChange={(e) =>
            onChange({
              ...condition,
              operator: e.target.value as Condition["operator"],
            })
          }
        >
          <option value="equals">Is equal to</option>
          <option value="not_equals">Is not equal to</option>
          <option value="contains">Contains</option>
          <option value="answered">Is answered</option>
          <option value="not_answered">Is empty</option>
          <option value="greater_than">Is greater than</option>
          <option value="less_than">Is less than</option>
        </select>
      </label>
      {!["answered", "not_answered"].includes(condition.operator) && (
        <label>
          Answer value
          {choices.length &&
          ["equals", "not_equals"].includes(condition.operator) ? (
            <select
              value={condition.value}
              onChange={(e) =>
                onChange({ ...condition, value: e.target.value })
              }
            >
              <option value="">Choose an answer</option>
              {choices.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          ) : (
            <input
              value={condition.value}
              maxLength={4000}
              onChange={(e) =>
                onChange({ ...condition, value: e.target.value })
              }
            />
          )}
        </label>
      )}
    </div>
  );
}
export function QuestionFlow({
  draft,
  question: q,
  onChange,
}: {
  draft: Draft;
  question: Question;
  onChange: (patch: Partial<Question>) => void;
}) {
  const pages = formPages(draft);
  const ordered = pages.flatMap((p) =>
    draft.questions.filter((x) => (x.pageId || pages[0].id) === p.id),
  );
  const earlier = ordered.slice(
    0,
    ordered.findIndex((x) => x.id === q.id),
  );
  return (
    <div className="question-flow">
      {pages.length > 1 && (
        <label>
          Page
          <select
            value={q.pageId || pages[0].id}
            onChange={(e) => onChange({ pageId: e.target.value })}
          >
            {pages.map((p, i) => (
              <option key={p.id} value={p.id}>
                {i + 1}. {p.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Show this question
        <select
          value={q.condition ? "conditional" : "always"}
          onChange={(e) =>
            onChange({
              condition:
                e.target.value === "always"
                  ? undefined
                  : {
                      questionId: earlier[0].id,
                      operator: "equals",
                      value: "",
                    },
            })
          }
        >
          <option value="always">Always</option>
          <option value="conditional" disabled={!earlier.length}>
            Only when an answer matches
          </option>
        </select>
      </label>
      {q.condition && (
        <ConditionEditor
          condition={q.condition}
          questions={earlier}
          onChange={(condition) => onChange({ condition })}
        />
      )}
    </div>
  );
}
export default function FlowEditor({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("team")
      .then((r) =>
        setMembers(r.members.filter((m: TeamMember) => m.status === "active")),
      )
      .catch((e) => setError(e.message));
  }, []);
  const pages = formPages(draft);
  const routing = draft.routing || {
    mode: "owner" as const,
    memberIds: [],
    rules: [],
  };
  const route = (patch: Partial<typeof routing>) =>
    onChange({ routing: { ...routing, ...patch } });
  return (
    <div className="flow-editor">
      <section className="flow-section">
        <span className="section-kicker">FORM LAYOUT</span>
        <h3>How questions are displayed</h3>
        <p>
          Choose one question at a time, sections, or all questions on one page.
        </p>
        <ExperiencePicker
          value={
            draft.experience ||
            (draft.pages && draft.pages.length > 1 ? "multipage" : "classic")
          }
          onChange={(experience) => onChange({ experience })}
        />
        {draft.experience === "interactive" && (
          <div className="interactive-settings">
            <div className="welcome-media-settings">
              <h4>Welcome image</h4>
              <p className="small">
                Set the scene with your work, products or brand.
              </p>
              <MediaEditor
                label="Welcome image"
                value={draft.interactive?.media}
                onChange={(media) =>
                  onChange({
                    interactive: {
                      welcome: true,
                      progress: true,
                      keyboard: true,
                      startLabel: "Let’s start",
                      ...draft.interactive,
                      media,
                    },
                  })
                }
              />
            </div>
            {(
              [
                ["welcome", "Show welcome screen"],
                ["progress", "Show progress"],
                ["keyboard", "Enable Enter to continue"],
              ] as const
            ).map(([key, label]) => (
              <label className="check-label" key={key}>
                <input
                  type="checkbox"
                  checked={draft.interactive?.[key] ?? true}
                  onChange={(e) =>
                    onChange({
                      interactive: {
                        welcome: true,
                        progress: true,
                        keyboard: true,
                        startLabel: "Let’s start",
                        ...draft.interactive,
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
                {label}
              </label>
            ))}
            {(
              [
                ["welcomeTitle", "Welcome heading"],
                ["welcomeDescription", "Welcome description"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  maxLength={key === "welcomeTitle" ? 120 : 500}
                  value={draft.interactive?.[key] || ""}
                  placeholder={
                    key === "welcomeTitle"
                      ? "A few questions. A better conversation."
                      : "Tell us what you need, one step at a time."
                  }
                  onChange={(e) =>
                    onChange({
                      interactive: {
                        welcome: true,
                        progress: true,
                        keyboard: true,
                        startLabel: "Let’s start",
                        ...draft.interactive,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
            <label>
              Welcome button
              <input
                maxLength={40}
                value={draft.interactive?.startLabel || "Let’s start"}
                onChange={(e) =>
                  onChange({
                    interactive: {
                      welcome: true,
                      progress: true,
                      keyboard: true,
                      ...draft.interactive,
                      startLabel: e.target.value,
                    },
                  })
                }
              />
            </label>
            <p className="small">
              Submission saves answers and opens WhatsApp directly. Product
              forms keep the catalog together, then guide customers through
              their details.
            </p>
          </div>
        )}
      </section>
      <section className="flow-section">
        <span className="section-kicker">
          <Layers size={16} /> MULTI-PAGE FORM
        </span>
        <h3>A little at a time</h3>
        <p>
          Group questions into clear steps. Empty conditional pages are skipped
          automatically.
        </p>
        {pages.map((p, i) => (
          <div className="page-editor-row" key={p.id}>
            <span className="question-number">{i + 1}</span>
            <label>
              Page title
              <input
                maxLength={100}
                value={p.title}
                onChange={(e) =>
                  onChange({
                    pages: pages.map((x) =>
                      x.id === p.id ? { ...x, title: e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              className="icon-btn"
              disabled={pages.length === 1}
              aria-label={`Delete page ${i + 1}`}
              onClick={() => {
                const next = pages.filter((x) => x.id !== p.id);
                onChange({
                  pages: next,
                  questions: draft.questions.map((q) =>
                    (q.pageId || pages[0].id) === p.id
                      ? { ...q, pageId: next[0].id }
                      : q,
                  ),
                });
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn"
          disabled={pages.length >= 10}
          onClick={() =>
            onChange({
              pages: [
                ...pages,
                { id: crypto.randomUUID(), title: `Step ${pages.length + 1}` },
              ],
            })
          }
        >
          <Plus size={16} />
          Add page
        </button>
        <p className="small">
          Assign each question to a page in the Questions tab. Products appear
          on the first page.
        </p>
      </section>
      <section className="flow-section">
        <span className="section-kicker">
          <GitBranch size={16} /> CONDITIONAL QUESTIONS
        </span>
        <h3>Ask only what matters</h3>
        <p>
          Open a question and change “Show this question” to add a rule using an
          earlier answer.
        </p>
        <div className="notice">
          {draft.questions.filter((q) => q.condition).length} conditional
          questions · Hidden answers are excluded from saved responses.
        </div>
      </section>
      <section className="flow-section">
        <span className="section-kicker">
          <Users size={16} /> TEAM ROUTING
        </span>
        <h3>The right person, every time</h3>
        <p>
          Assign new requests and direct their WhatsApp link to the selected
          teammate.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          Route new submissions
          <select
            value={routing.mode}
            onChange={(e) =>
              route({
                mode: e.target.value as typeof routing.mode,
                memberIds: members[0] ? [members[0].id] : [],
                rules: [],
              })
            }
          >
            <option value="owner">Business owner</option>
            <option value="member" disabled={!members.length}>
              One team member
            </option>
            <option value="round_robin" disabled={!members.length}>
              Round robin
            </option>
            <option value="rules" disabled={!members.length}>
              Based on answers
            </option>
          </select>
        </label>
        {!members.length && (
          <p className="notice">
            Invite teammates in Business settings → Team. They become available
            here after accepting.
          </p>
        )}
        {routing.mode === "member" && (
          <label>
            Team member
            <select
              value={routing.memberIds[0] || ""}
              onChange={(e) => route({ memberIds: [e.target.value] })}
            >
              <option value="" disabled>
                Choose a member
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {routing.mode === "round_robin" && (
          <fieldset>
            <legend>Rotate between these teammates</legend>
            {members.map((m) => (
              <label className="check-label" key={m.id}>
                <input
                  type="checkbox"
                  checked={routing.memberIds.includes(m.id)}
                  onChange={(e) =>
                    route({
                      memberIds: e.target.checked
                        ? [...routing.memberIds, m.id]
                        : routing.memberIds.filter((id) => id !== m.id),
                    })
                  }
                />
                {m.name}
              </label>
            ))}
          </fieldset>
        )}
        {routing.mode === "rules" && (
          <>
            {routing.rules.map((r, i) => (
              <div className="routing-rule" key={i}>
                <div className="between">
                  <strong>Rule {i + 1}</strong>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove routing rule ${i + 1}`}
                    onClick={() =>
                      route({ rules: routing.rules.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <ConditionEditor
                  condition={r.condition}
                  questions={draft.questions}
                  onChange={(condition) =>
                    route({
                      rules: routing.rules.map((x, j) =>
                        j === i ? { ...x, condition } : x,
                      ),
                    })
                  }
                />
                <label>
                  Assign to
                  <select
                    value={r.memberId}
                    onChange={(e) =>
                      route({
                        rules: routing.rules.map((x, j) =>
                          j === i ? { ...x, memberId: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
            <button
              type="button"
              className="btn"
              disabled={!members.length || routing.rules.length >= 20}
              onClick={() =>
                route({
                  rules: [
                    ...routing.rules,
                    {
                      condition: {
                        questionId: draft.questions[0].id,
                        operator: "equals",
                        value: "",
                      },
                      memberId: members[0].id,
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Add routing rule
            </button>
            <p className="small">
              Rules run from top to bottom. The first match wins.
            </p>
          </>
        )}
        <p className="small">
          If no rule matches or a teammate is removed, requests go to the
          business owner. Reassigning an existing response changes inbox access;
          its original WhatsApp destination stays saved.
        </p>
      </section>
    </div>
  );
}
