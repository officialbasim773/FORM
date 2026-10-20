"use client";
import { useState } from "react";
import {
  CalendarDays,
  FileText,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import Customer from "./customer";
import type { Draft } from "@/lib/model";
const enquiry: Draft = {
  title: "Tell us about your project",
  description: "A few details to help Willow Studio prepare a useful reply.",
  type: "service",
  currency: "AED",
  accent: "#176650",
  button: "#176650",
  hideLogo: false,
  products: [],
  experience: "interactive",
  interactive: {
    welcome: false,
    progress: true,
    keyboard: true,
    startLabel: "Get started",
  },
  questions: [
    {
      id: "demo-name",
      label: "What’s your name?",
      type: "short text",
      required: true,
      options: [],
    },
    {
      id: "demo-service",
      label: "What can we help you with?",
      type: "single choice",
      required: true,
      options: ["A new website", "Brand design", "An online store"],
    },
    {
      id: "demo-budget",
      label: "What budget do you have in mind?",
      type: "single choice",
      required: true,
      options: ["Under AED 5,000", "AED 5,000–10,000", "Let’s discuss it"],
    },
    {
      id: "demo-project",
      label: "Tell us a little about your project",
      type: "long text",
      required: false,
      options: [],
    },
  ],
};
const services = [
  { name: "Discovery consultation", duration: 30, price: "Free" },
  { name: "Design review", duration: 60, price: "AED 250" },
];
function BookingExample() {
  const [step, setStep] = useState(0),
    [service, setService] = useState(0),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [name, setName] = useState(""),
    [email, setEmail] = useState("");
  const [days] = useState(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + i + 1);
      return d.toISOString().slice(0, 10);
    });
  });
  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat("en", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(value + "T12:00:00Z"));
  const selected = services[service];
  return (
    <div className="appointment-example">
      <div className="example-business">
        <span>w.</span>
        <div>
          <strong>Willow Studio</strong>
          <small>Appointments · Dubai time (UTC+4)</small>
        </div>
      </div>
      {step === 4 ? (
        <div className="example-complete" role="status">
          <CheckCircle2 size={38} />
          <h3>You’ve tried the booking flow.</h3>
          <p>
            {selected.name} with Alex Morgan
            <br />
            {dateLabel(date)} at {time}
          </p>
          <p>This was a demo. No appointment was saved or confirmed.</p>
          <p>
            On a live booking page, the request is saved and the business can
            accept or decline it.
          </p>
          <button
            className="btn"
            onClick={() => {
              setStep(0);
              setDate("");
              setTime("");
              setName("");
              setEmail("");
            }}
          >
            <RotateCcw size={16} />
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="example-steps" aria-label="Booking progress">
            {["Service", "Date & time", "Your details", "Review"].map(
              (label, i) => (
                <span
                  key={label}
                  aria-current={step === i ? "step" : undefined}
                  className={step === i ? "active" : ""}
                >
                  {i + 1}. {label}
                </span>
              ),
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(step + 1);
            }}
          >
            {step === 0 && (
              <>
                <h3>Choose your appointment</h3>
                <p>Meet with Alex Morgan, our studio consultant.</p>
                <div className="example-service-list">
                  {services.map((s, i) => (
                    <label key={s.name}>
                      <input
                        type="radio"
                        name="example-service"
                        checked={service === i}
                        onChange={() => {
                          setService(i);
                          setDate("");
                          setTime("");
                        }}
                      />
                      <span>
                        <strong>{s.name}</strong>
                        <small>
                          {s.duration} minutes · {s.price}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <h3>Find a time that suits you</h3>
                <p>
                  Sample availability for this demo. These times do not reserve
                  a real appointment.
                </p>
                <fieldset>
                  <legend>Choose a date</legend>
                  <div className="example-date-grid">
                    {days.map((day) => (
                      <label key={day}>
                        <input
                          type="radio"
                          required
                          name="example-date"
                          checked={date === day}
                          onChange={() => {
                            setDate(day);
                            setTime("");
                          }}
                        />
                        <span>{dateLabel(day)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {date && (
                  <fieldset>
                    <legend>Choose a start time · Dubai</legend>
                    <div className="example-time-grid">
                      {["09:00", "10:30", "14:00", "15:30"].map((t) => (
                        <label key={t}>
                          <input
                            type="radio"
                            required
                            name="example-time"
                            checked={time === t}
                            onChange={() => setTime(t)}
                          />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <h3>Who’s coming?</h3>
                <p>
                  Use sample details. Nothing entered here is sent or stored.
                </p>
                <label>
                  Your name
                  <input
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Taylor"
                    autoComplete="off"
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    autoComplete="off"
                  />
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <h3>Review your appointment</h3>
                <dl className="example-review">
                  <div>
                    <dt>Service</dt>
                    <dd>
                      {selected.name} · {selected.duration} min
                    </dd>
                  </div>
                  <div>
                    <dt>With</dt>
                    <dd>Alex Morgan</dd>
                  </div>
                  <div>
                    <dt>When</dt>
                    <dd>
                      {dateLabel(date)} at {time} · Dubai
                    </dd>
                  </div>
                  <div>
                    <dt>Starting price</dt>
                    <dd>{selected.price}</dd>
                  </div>
                  <div>
                    <dt>Your details</dt>
                    <dd>
                      {name}
                      <br />
                      {email}
                    </dd>
                  </div>
                </dl>
                <p>
                  Finish the demo to see the final step. This will not create a
                  booking.
                </p>
              </>
            )}
            <div className="example-form-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
              <button
                className="btn primary"
                disabled={step === 1 && (!date || !time)}
              >
                {step === 3 ? "Finish demo" : "Continue"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
export default function LandingExamples({ start }: { start: string }) {
  const [kind, setKind] = useState<"form" | "appointment">("form"),
    [version, setVersion] = useState(0);
  return (
    <section id="examples" className="landing-section real-examples">
      <div className="landing-section-head">
        <span className="eyebrow">TRY IT BEFORE YOU SIGN UP</span>
        <h2>See what your customers will see.</h2>
        <p>
          Try a real form or explore a booking request. No account needed.
          Nothing you enter is saved.
        </p>
      </div>
      <div
        className="example-switch"
        role="group"
        aria-label="Choose an example"
      >
        <button aria-pressed={kind === "form"} onClick={() => setKind("form")}>
          <FileText size={18} />
          Project enquiry
        </button>
        <button
          aria-pressed={kind === "appointment"}
          onClick={() => setKind("appointment")}
        >
          <CalendarDays size={18} />
          Appointment booking
        </button>
      </div>
      <div className="real-example-layout">
        <aside>
          <h3>
            {kind === "form"
              ? "A useful first conversation."
              : "From service to a time that fits."}
          </h3>
          <p>
            {kind === "form"
              ? "Try the same customer form used by FormChat: answer questions, go back to edit, and finish the preview."
              : "Choose a consultation, pick a sample time, enter example details and review the request."}
          </p>
          <ul>
            {(kind === "form"
              ? [
                  "One question at a time",
                  "Required answer validation",
                  "Go back without losing your answers",
                ]
              : [
                  "Service duration and starting price",
                  "Date and time selection",
                  "Review before requesting an appointment",
                ]
            ).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div className="example-disclaimer">
            <strong>Interactive demo</strong>
            <p>
              No responses or bookings are saved. No WhatsApp messages or emails
              are sent. Appointment times are examples.
            </p>
          </div>
        </aside>
        <div className="real-example-panel">
          <header>
            <span>
              {kind === "form" ? "FORM EXAMPLE" : "APPOINTMENT EXAMPLE"}
            </span>
            <button
              className="text-btn"
              onClick={() => setVersion((v) => v + 1)}
            >
              <RotateCcw size={14} />
              Restart
            </button>
          </header>
          <div
            role="region"
            aria-label={
              kind === "form"
                ? "Project enquiry example"
                : "Appointment booking example"
            }
            key={kind + version}
          >
            {kind === "form" ? (
              <Customer
                draft={enquiry}
                business={{ name: "Willow Studio", logo: "" }}
                preview
              />
            ) : (
              <BookingExample />
            )}
          </div>
        </div>
      </div>
      <div className="mk-demo-next">
        <div>
          <strong>Ready to make it yours?</strong>
          <p>Build your own form and share it when you’re ready.</p>
        </div>
        <a className="mk-button" href={start}>
          Make it yours <ArrowRight size={17} />
        </a>
      </div>
    </section>
  );
}
