"use client";
import { useEffect, useState } from "react";
import { BarChart3, Calendar } from "lucide-react";
import { Business, FormRecord } from "@/lib/model";
import { PLANS } from "@/lib/config";
import { api } from "@/lib/client";
import { Picker, Loading } from "./ui";

export default function AnalyticsPage({
  business,
  forms,
}: {
  business: Business;
  forms: FormRecord[];
}) {
  const [data, setData] = useState<{events:Record<string,number>;submissions:number;handoffs:number;trend:{day:string;n:number}[];eventTrend:{day:string;kind:string;n:number}[];top:{id:string;title:string;deleted:number;n:number}[]} | null>(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!PLANS[business.plan].analytics) return;
    api("analytics" + (filter !== "all" ? "?form=" + filter : ""))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [filter, business.plan]);
  if (!PLANS[business.plan].analytics)
    return (
      <>
        <div className="page-title">
          <div>
            <h1>Analytics</h1>
            <p>Understand how customers use your forms.</p>
          </div>
        </div>
        <div className="empty-state panel">
          <BarChart3 size={32} />
          <h2>Included in Business</h2>
          <p>
            Unique views, starts, submissions and WhatsApp handoffs, with trends
            over time.
          </p>
          <p>
            Business is planned at ${PLANS.business.monthlyPrice}/month or $
            {PLANS.business.yearlyPrice}/year. Payment is not connected yet.
          </p>
        </div>
      </>
    );
  const views = data?.events.view || 0;
  const starts = data?.events.start || 0;
  const submissions = data?.submissions || 0;
  const clicks = data?.handoffs || 0;
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    const day = d.toISOString().slice(0, 10);
    return {
      day,
      n: data?.trend.find((t) => t.day === day)?.n || 0,
      view:
        data?.eventTrend
          .filter((t) => t.day === day && t.kind === "view")
          .reduce((n: number, t) => n + t.n, 0) || 0,
    };
  });
  const max = Math.max(1, ...days.flatMap((d) => [d.n, d.view]));
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">A CLEARER PICTURE</span>
          <h1>Analytics</h1>
          <p>See where requests begin and conversations continue.</p>
        </div>
        <div className="row">
          <Picker
            value={filter}
            onChange={setFilter}
            label="Analytics form"
            options={[
              { value: "all", label: "All forms" },
              ...forms.map((f) => ({ value: f.id, label: f.draft.title })),
            ]}
          />
          <span className="date-range">
            <Calendar size={15} />
            Last 30 days
          </span>
        </div>
      </div>
      {error ? (
        <div className="error">{error}</div>
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div className="analytics-metrics">
            {[
              [views, "Unique form views", "Distinct browsers per form"],
              [starts, "Form starts", "Visitors who began an answer"],
              [
                submissions,
                "Completed submissions",
                `${views ? Math.round((submissions / views) * 100) : 0}% submission rate`,
              ],
              [
                clicks,
                "WhatsApp handoff clicks",
                `${submissions ? Math.round((clicks / submissions) * 100) : 0}% handoff rate`,
              ],
            ].map(([n, title, desc]) => (
              <div key={title}>
                <span>{title}</span>
                <strong>{n}</strong>
                <small>{desc}</small>
              </div>
            ))}
          </div>
          <section className="chart-panel">
            <div className="between">
              <div>
                <h3>From views to requests</h3>
                <p>Daily activity over the last 30 days</p>
              </div>
              <div className="chart-legend">
                <span>
                  <i />
                  Views
                </span>
                <span>
                  <i />
                  Submissions
                </span>
              </div>
            </div>
            <div
              className="bar-chart"
              role="img"
              aria-label={`Last 30 days: ${views} unique form views and ${submissions} submissions`}
            >
              <div className="chart-axis">
                <span>{max}</span>
                <span>{Math.round(max / 2)}</span>
                <span>0</span>
              </div>
              <div className="chart-bars">
                {days.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.view} views, ${d.n} submissions`}
                  >
                    <span style={{ height: `${(d.view / max) * 100}%` }} />
                    <span style={{ height: `${(d.n / max) * 100}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-dates">
              <span>{days[0].day}</span>
              <span>{days[14].day}</span>
              <span>Today</span>
            </div>
          </section>
          <div className="analytics-bottom">
            <section className="panel">
              <h3>Most-used forms</h3>
              {data.top.map((f, i: number) => (
                <div className="top-form" key={f.id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <strong>
                    {f.title}
                    {f.deleted ? " (deleted)" : ""}
                  </strong>
                  <span>{f.n} submissions</span>
                </div>
              ))}
            </section>
            <section className="panel metric-definitions">
              <h3>What these numbers mean</h3>
              <p>
                <strong>Submission rate</strong> is submissions divided by
                unique form views. Repeat requests can make it exceed 100%.
              </p>
              <p>
                <strong>Handoff rate</strong> is the percentage of submitted
                requests where the customer clicked Continue to WhatsApp.
              </p>
              <p>
                Views and starts count distinct browsers per form in this
                period. Daily charts count each browser once per day. They do
                not identify individual people. We cannot measure messages sent,
                bookings or sales.
              </p>
            </section>
          </div>
        </>
      )}
    </>
  );
}
