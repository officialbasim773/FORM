"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function shiftMonth(month: string, offset: number) {
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}
export function monthEnd(month: string) {
  const d = new Date(`${shiftMonth(month, 1)}-01T12:00:00Z`);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
export default function BookingCalendar({
  month,
  onMonth,
  date,
  onDate,
  available,
  min,
  max,
  loading = false,
}: {
  month: string;
  onMonth: (m: string) => void;
  date: string;
  onDate: (d: string) => void;
  available?: string[];
  min: string;
  max: string;
  loading?: boolean;
}) {
  const first = new Date(`${month}-01T12:00:00Z`),
    offset = (first.getUTCDay() + 6) % 7,
    days = Number(monthEnd(month).slice(-2));
  return (
    <section className="book-calendar" aria-label="Choose an available date">
      <header>
        <h3>
          {new Intl.DateTimeFormat("en", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(first)}
        </h3>
        <div>
          <button
            type="button"
            className="book-icon-btn"
            aria-label="Previous month"
            disabled={month <= min.slice(0, 7) || loading}
            onClick={() => onMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="book-icon-btn"
            aria-label="Next month"
            disabled={month >= max.slice(0, 7) || loading}
            onClick={() => onMonth(shiftMonth(month, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>
      <div className="book-calendar-grid">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span className="book-weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = `${month}-${String(i + 1).padStart(2, "0")}`,
            enabled =
              day >= min &&
              day <= max &&
              (!available || available.includes(day));
          return (
            <button
              type="button"
              key={day}
              aria-label={new Intl.DateTimeFormat("en", {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(new Date(`${day}T12:00:00Z`))}
              aria-pressed={date === day}
              disabled={!enabled || loading}
              className={date === day ? "selected" : enabled ? "available" : ""}
              onClick={() => onDate(day)}
            >
              {i + 1}
              {enabled && <i />}
            </button>
          );
        })}
      </div>
      <p className="book-calendar-key">
        <i />
        {loading ? "Checking available dates…" : "Available to book"}
      </p>
    </section>
  );
}
