import { db, HttpError } from "./server";
import type { Receipt, Draft } from "./model";

export interface ResponseRow {
  version: number;
  id: string;
  business_id: string;
  form_id: string;
  customer: string;
  summary: string;
  created_at: string;
  total: number;
  handoff_at: string | null;
  workflow_status: string;
  internal_notes: string;
  assigned_to: string | null;
  assigned_name: string | null;
  assigned_status: string | null;
  form_deleted: number;
  booking_id: string | null;
  booking_start: string | null;
  booking_timezone: string | null;
  booking_status: string | null;
  receipt: string;
  snapshot: string;
  token_hash: string;
  payload_hash: string;
  idempotency: string;
}
export type InboxResponse = Omit<
  ResponseRow,
  "receipt" | "snapshot" | "token_hash" | "payload_hash" | "idempotency"
> & { receipt: Receipt; snapshot: Draft };
type Cursor = { createdAt: string; id: string };
function decodeCursor(value: string): Cursor {
  try {
    const c = JSON.parse(atob(value));
    if (
      typeof c.createdAt !== "string" ||
      !Number.isFinite(Date.parse(c.createdAt)) ||
      typeof c.id !== "string" ||
      c.id.length > 200
    )
      throw Error();
    return c;
  } catch {
    throw new HttpError(400, "Invalid response page cursor.");
  }
}
const cursorFor = (r: ResponseRow) =>
  btoa(JSON.stringify({ createdAt: r.created_at, id: r.id }));
const select = `SELECT s.*,f.deleted form_deleted,m.name assigned_name,m.status assigned_status,bk.id booking_id,bk.start booking_start,bk.timezone booking_timezone,bk.status booking_status FROM submissions s JOIN forms f ON s.form_id=f.id LEFT JOIN members m ON m.id=s.assigned_to LEFT JOIN bookings bk ON bk.submission_id=s.id`;

export async function responsePage(
  filters: string[],
  args: (string | number | null)[],
  params: URLSearchParams,
) {
  const limit = Number(params.get("limit") || 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new HttpError(400, "Page size must be between 1 and 100.");
  const total = await db()
    .prepare(
      `SELECT count(*) total FROM submissions s WHERE ${filters.join(" AND ")}`,
    )
    .bind(...args)
    .first<{ total: number }>();
  const cursor = params.get("cursor");
  if (cursor) {
    const c = decodeCursor(cursor);
    filters.push("(s.created_at<? OR (s.created_at=? AND s.id<?))");
    args.push(c.createdAt, c.createdAt, c.id);
  }
  const { results } = await db()
    .prepare(
      `${select} WHERE ${filters.join(" AND ")} ORDER BY s.created_at DESC,s.id DESC LIMIT ?`,
    )
    .bind(...args, limit + 1)
    .all<ResponseRow>();
  const rows = results.slice(0, limit);
  return {
    total: total?.total || 0,
    nextCursor:
      results.length > limit ? cursorFor(rows[rows.length - 1]) : null,
    responses: rows.map((row) => {
      const r: Partial<ResponseRow> = { ...row };
      delete r.token_hash;
      delete r.payload_hash;
      delete r.idempotency;
      return {
        ...r,
        receipt: JSON.parse(row.receipt),
        snapshot: JSON.parse(row.snapshot),
      };
    }),
  };
}

export async function responseExport(
  filters: string[],
  args: (string | number | null)[],
) {
  // A high-water key excludes submissions made after this export starts.
  const top = await db()
    .prepare(
      `SELECT s.created_at,s.id FROM submissions s WHERE ${filters.join(" AND ")} ORDER BY s.created_at DESC,s.id DESC LIMIT 1`,
    )
    .bind(...args)
    .first<Pick<ResponseRow, "created_at" | "id">>();
  let cursor: ResponseRow | undefined;
  let first = true;
  const encoder = new TextEncoder();
  const cell = (value: unknown) =>
    '"' +
    String(value ?? "")
      .replace(/^[\s]*[=+@-]/, (m) => "'" + m)
      .replaceAll('"', '""') +
    '"';
  const line = (values: unknown[]) => values.map(cell).join(",") + "\r\n";
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (first) {
          first = false;
          controller.enqueue(
            encoder.encode(
              "\uFEFF" +
                line([
                  "Reference",
                  "Form",
                  "Type",
                  "Customer",
                  "Submitted at",
                  "Estimated total (minor units)",
                  "Currency",
                  "WhatsApp handoff clicked at",
                  "Answers",
                  "Products",
                  "Status",
                  "Internal notes",
                ]),
            ),
          );
        }
        if (!top) {
          controller.close();
          return;
        }
        const where = [
          ...filters,
          "(s.created_at<? OR (s.created_at=? AND s.id<=?))",
        ];
        const values = [...args, top.created_at, top.created_at, top.id];
        if (cursor) {
          where.push("(s.created_at<? OR (s.created_at=? AND s.id<?))");
          values.push(cursor.created_at, cursor.created_at, cursor.id);
        }
        const { results } = await db()
          .prepare(
            `${select} WHERE ${where.join(" AND ")} ORDER BY s.created_at DESC,s.id DESC LIMIT 100`,
          )
          .bind(...values)
          .all<ResponseRow>();
        if (!results.length) {
          controller.close();
          return;
        }
        controller.enqueue(
          encoder.encode(
            results
              .map((r) => {
                const receipt: Receipt = JSON.parse(r.receipt);
                return line([
                  r.id,
                  receipt.formTitle,
                  receipt.formType,
                  r.customer,
                  r.created_at,
                  r.total,
                  receipt.currency,
                  r.handoff_at,
                  JSON.stringify(receipt.answers),
                  JSON.stringify(receipt.items),
                  r.workflow_status,
                  r.internal_notes,
                ]);
              })
              .join(""),
          ),
        );
        cursor = results[results.length - 1];
        if (results.length < 100) controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": 'attachment; filename="formchat-responses.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
