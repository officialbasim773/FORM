"use client";
import NextImage from "next/image";
import { usePublicEmbed } from "@/lib/use-public-embed";
import { readApiResponse } from "@/lib/api-response";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Globe2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/client";
import { money } from "@/lib/model";
import {
  formatAppointment,
  type BookingChoice,
  type AppointmentService,
  type Slot,
} from "@/lib/appointments";
import BookingCalendar, { monthEnd } from "./booking-calendar";
type Customer = { name: string; email: string; phone: string; notes: string };
type RequestBody = {
  appointment: BookingChoice;
  customer: Customer;
  idempotency: string;
  token: string;
  website: string;
  startedAt: number;
};
type Options = {
  business: { name: string; logo: string };
  timezone: string;
  today: string;
  services: AppointmentService[];
  providers: { id: string; name: string }[];
};
type Confirmation = {
  status?: string;
  token?: string;
  id: string;
  start: string;
  end: string;
  timezone: string;
  serviceName: string;
  providerName: string;
  price: number;
  currency: string;
  customer: Customer;
  businessName: string;
  phone: string;
  message: string;
};
const emptyCustomer = { name: "", email: "", phone: "", notes: "" };
export default function PublicBooking({ businessId }: { businessId: string }) {
  const { embedded, inline } = usePublicEmbed("appointment", businessId);
  const [data, setData] = useState<Options | null>(null),
    [step, setStep] = useState(0),
    [service, setService] = useState(""),
    [provider, setProvider] = useState(""),
    [date, setDate] = useState(""),
    [month, setMonth] = useState(""),
    [start, setStart] = useState("");
  const [dates, setDates] = useState<string[]>([]),
    [slots, setSlots] = useState<Slot[]>([]),
    [customer, setCustomer] = useState<Customer>(emptyCustomer),
    [receipt, setReceipt] = useState<Confirmation | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [datesLoading, setDatesLoading] = useState(false),
    [refresh, setRefresh] = useState(0),
    [website, setWebsite] = useState(""),
    [restored, setRestored] = useState(false);
  const pending = useRef<RequestBody | null>(null),
    startedAt = useRef(Date.now()),
    key = `formchat:booking:${businessId}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser/API lifecycle state and clear stale data before loading the new resource.
      if (saved?.receipt) setReceipt(saved.receipt);
      if (saved?.pending) {
        pending.current = saved.pending;
        setCustomer(saved.pending.customer);
        setService(saved.pending.appointment.serviceId);
        setProvider(saved.pending.appointment.providerId);
        setStart(saved.pending.appointment.start);
        setStep(3);
      }
    } catch {}
    setRestored(true);
    let alive = true;
    api(`booking/${businessId}`)
      .then((r) => {
        if (alive) {
          setData(r);
          setMonth(r.today.slice(0, 7));
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [businessId, key]);
  useEffect(() => {
    if (!data || !service || !provider || !month || step !== 1) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser/API lifecycle state and clear stale data before loading the new resource.
    setDatesLoading(true);
    setDates([]);
    api(
      `booking/${businessId}/dates?${new URLSearchParams({ service, provider, from: `${month}-01`, to: monthEnd(month) })}`,
    )
      .then((r) => alive && setDates(r.dates))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setDatesLoading(false));
    return () => {
      alive = false;
    };
  }, [businessId, data, service, provider, month, refresh, step]);
  useEffect(() => {
    if (step !== 1) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser/API lifecycle state and clear stale data before loading the new resource.
    setSlots([]);
    setStart("");
    setLoading(false);
    if (!date || !service || !provider) return;
    let alive = true;
    setLoading(true);
    api(
      `booking/${businessId}/slots?${new URLSearchParams({ service, provider, date })}`,
    )
      .then((r) => alive && setSlots(r.slots))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [businessId, service, provider, date, refresh, step]);
  async function refreshStatus() {
    if (!receipt?.token) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/booking/${businessId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: receipt.id, token: receipt.token }),
      });
      const result: Confirmation & { error?: string } = await (async () => {
        try {
          return await readApiResponse(response);
        } catch (e) {
          if (!response.ok) throw new Error((e as Error).message);
          throw e;
        }
      })();
      if (!response.ok)
        throw new Error(result.error || "Could not refresh status.");
      const next = { ...result, token: receipt.token };
      setReceipt(next);
      persist({ receipt: next });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function persist(value: unknown) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    const input = pending.current || {
      appointment: { serviceId: service, providerId: provider, start },
      customer,
      idempotency: crypto.randomUUID(),
      token: crypto.randomUUID(),
      website,
      startedAt: startedAt.current,
    };
    pending.current = input;
    persist({ pending: input });
    try {
      const response = await fetch(`/api/booking/${businessId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result: Confirmation & { error?: string } = await (async () => {
        try {
          return await readApiResponse(response);
        } catch (e) {
          if (!response.ok) throw new Error((e as Error).message);
          throw e;
        }
      })();
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          pending.current = null;
          persist({});
          if (response.status === 409) {
            setStep(1);
            setStart("");
            setRefresh((n) => n + 1);
          }
        }
        throw new Error(result.error || "We could not save this booking.");
      }
      setReceipt({ ...result, token: input.token });
      persist({ receipt: { ...result, token: input.token } });
      pending.current = null;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const chosen = data?.services.find((s) => s.id === service),
    person = data?.providers.find((p) => p.id === provider);
  const name = receipt?.businessName || data?.business.name || "Appointments";
  const heading = (
    <header className="book-brand">
      <a
        href={`/book/${businessId}${embedded ? "?embed=1" + (inline ? "&resize=1" : "") : ""}`}
        aria-label={`${name} booking page`}
      >
        {data?.business.logo ? (
          <NextImage
            unoptimized
            width={96}
            height={96}
            src={data.business.logo}
            alt=""
          />
        ) : (
          <span>{name.slice(0, 1)}</span>
        )}
        <strong>{name}</strong>
      </a>
      <span>
        <ShieldCheck size={15} /> Secure booking
      </span>
    </header>
  );
  if (receipt)
    return (
      <main
        className={
          "booking-public" +
          (embedded ? " booking-embedded" : "") +
          (inline ? " booking-inline" : "")
        }
      >
        {heading}
        <section className="book-success">
          <div className="book-success-icon">
            <Check size={30} />
          </div>
          <span className="eyebrow">SAVED IN FORMCHAT</span>
          <h1>
            {receipt.status === "pending"
              ? "Request received."
              : receipt.status === "declined"
                ? "Request declined."
                : receipt.status === "cancelled"
                  ? "Booking cancelled."
                  : receipt.status === "completed"
                    ? "Appointment completed."
                    : receipt.status === "no_show"
                      ? "Marked as no-show."
                      : "You’re booked."}
          </h1>
          <p>
            {receipt.status === "pending"
              ? "Your requested time is held while the business reviews your appointment. It is not confirmed yet."
              : `Appointment status: ${(receipt.status || "confirmed").replace("_", " ")}.`}
          </p>
          <div className="book-confirmation">
            <h2>{receipt.serviceName}</h2>
            <p>
              <CalendarDays size={18} />
              {formatAppointment(receipt.start, receipt.timezone)}
            </p>
            <p>
              <UserRound size={18} />
              {receipt.providerName}
            </p>
            <p>
              From {money(receipt.price, receipt.currency)} · No payment
              collected
            </p>
            <small>Booking reference</small>
            <code>{receipt.id}</code>
          </div>
          {receipt.token && (
            <button
              className="btn primary full"
              disabled={busy}
              onClick={() => void refreshStatus()}
            >
              {busy ? "Checking…" : "Refresh booking status"}
            </button>
          )}
          {error && <p role="alert">{error}</p>}
          <p className="small">
            Keep this page open to check for updates. Contact the business for
            changes. Email and SMS notifications are not sent automatically.
          </p>
          <button
            className="text-btn"
            onClick={() => {
              setReceipt(null);
              setStep(0);
              setService("");
              setStart("");
              setDate("");
              setCustomer(emptyCustomer);
              startedAt.current = Date.now();
              persist({});
            }}
          >
            Book another appointment
          </button>
        </section>
        <footer className="book-footer">
          Appointments by <strong>FormChat</strong>
        </footer>
      </main>
    );
  if (!data)
    return (
      <main
        className={
          "booking-public" +
          (embedded ? " booking-embedded" : "") +
          (inline ? " booking-inline" : "")
        }
      >
        {heading}
        <section className="book-success">
          <CalendarDays size={32} />
          <h1>
            {error ? "Booking page unavailable" : "Getting things ready…"}
          </h1>
          <p role="status">{error || "Loading services and availability."}</p>
          {pending.current && (
            <>
              <p>
                A booking attempt is pending. Check its result before trying a
                different time.
              </p>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void confirm()}
              >
                Check booking result
              </button>
            </>
          )}
        </section>
      </main>
    );
  const next = () => {
    setError("");
    setStep((n) => n + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <main
      className={
        "booking-public" +
        (embedded ? " booking-embedded" : "") +
        (inline ? " booking-inline" : "")
      }
    >
      {heading}
      <nav className="book-progress" aria-label="Booking progress">
        {["Service", "Date & time", "Your details", "Review"].map(
          (label, i) => (
            <span
              key={label}
              aria-current={step === i ? "step" : undefined}
              className={step === i ? "current" : step > i ? "done" : ""}
            >
              <b>{step > i ? <Check size={14} /> : i + 1}</b>
              {label}
            </span>
          ),
        )}
      </nav>
      <div className={`book-layout ${step === 0 ? "service-selection" : ""}`}>
        <aside className="book-sidebar">
          <span className="eyebrow">A LITTLE TIME, JUST FOR YOU</span>
          <h1>
            {step === 0
              ? "Let’s make time."
              : chosen?.name || "Your appointment"}
          </h1>
          <p>
            {step === 0
              ? "Choose a service and find a time that works for you."
              : chosen?.description}
          </p>
          {chosen && (
            <div className="book-facts">
              <p>
                <Clock3 size={18} />
                {chosen.duration} minutes
              </p>
              <p>
                <span className="book-price">
                  {money(chosen.price, chosen.currency)}
                </span>
                <small>starting price</small>
              </p>
              {person && (
                <p>
                  <UserRound size={18} />
                  {person.name}
                </p>
              )}
              {start && (
                <p>
                  <CalendarDays size={18} />
                  {formatAppointment(start, data.timezone)}
                </p>
              )}
            </div>
          )}
          <div className="book-trust">
            <Globe2 size={17} />
            <div>
              <strong>{data.timezone.replaceAll("_", " ")}</strong>
              <small>All times are in the business’s time zone.</small>
            </div>
          </div>
          <p className="small">No payment is collected when booking.</p>
        </aside>
        <section className="book-main">
          {step > 0 && (
            <button
              className="text-btn book-back"
              disabled={busy || !!pending.current}
              onClick={() => {
                setStep((n) => n - 1);
                setError("");
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {step === 0 ? (
            <>
              <div className="book-section-heading">
                <span className="eyebrow">OUR SERVICES</span>
                <h2>What can we help with?</h2>
                <p>Pick a service to see available dates.</p>
              </div>
              <div className="book-service-list">
                {data.services
                  .filter((s) => s.providerIds.length)
                  .map((s) => (
                    <button
                      className="book-service-card"
                      key={s.id}
                      onClick={() => {
                        setService(s.id);
                        setProvider(s.providerIds[0]);
                        setDate("");
                        setStart("");
                        next();
                      }}
                    >
                      <span className="book-service-symbol">
                        <CalendarDays size={23} />
                      </span>
                      <span>
                        <strong>{s.name}</strong>
                        <p>
                          {s.description ||
                            "Choose a date and time for your appointment."}
                        </p>
                        <small>
                          <Clock3 size={14} />
                          {s.duration} min <i /> From{" "}
                          {money(s.price, s.currency)}
                        </small>
                      </span>
                      <ArrowRight size={20} />
                    </button>
                  ))}
              </div>
              {!data.services.some((s) => s.providerIds.length) && (
                <div className="book-empty">
                  <CalendarDays size={32} />
                  <h3>No services available yet</h3>
                  <p>Please check back soon or contact the business.</p>
                </div>
              )}
            </>
          ) : step === 1 ? (
            <>
              <div className="book-section-heading">
                <span className="eyebrow">FIND YOUR TIME</span>
                <h2>A date that suits you.</h2>
                <p>Select an available day, then choose a time.</p>
              </div>
              <label className="book-provider">
                Team member
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setStart("");
                    setDate("");
                  }}
                >
                  {data.providers
                    .filter((p) => chosen?.providerIds.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="book-time-layout">
                <BookingCalendar
                  month={month}
                  onMonth={(m) => {
                    setMonth(m);
                    setDate("");
                    setStart("");
                  }}
                  date={date}
                  onDate={setDate}
                  available={dates}
                  loading={datesLoading}
                  min={data.today}
                  max={new Date(
                    Date.parse(data.today) +
                      (chosen?.maxAdvanceDays ?? 90) * 86400000,
                  )
                    .toISOString()
                    .slice(0, 10)}
                />
                <section className="book-times">
                  <h3>
                    {date
                      ? new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                          timeZone: "UTC",
                        }).format(new Date(`${date}T12:00:00Z`))
                      : "Available times"}
                  </h3>
                  <p className="small">
                    {loading
                      ? "Checking times…"
                      : !date
                        ? "Choose a date on the calendar."
                        : !slots.length
                          ? "No times left on this date. Please choose another day."
                          : `${chosen?.duration} minute appointments`}
                  </p>
                  <div className="book-time-buttons">
                    {slots.map((s) => (
                      <button
                        type="button"
                        key={s.start}
                        aria-pressed={start === s.start}
                        className={start === s.start ? "selected" : ""}
                        onClick={() => setStart(s.start)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <div className="book-bottom">
                <button
                  className="text-btn"
                  onClick={() => setRefresh((n) => n + 1)}
                >
                  Refresh availability
                </button>
                <button
                  className="btn primary"
                  disabled={!start || loading || datesLoading}
                  onClick={next}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : step === 2 ? (
            <form
              className="book-details"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <div className="book-section-heading">
                <span className="eyebrow">NICE TO MEET YOU</span>
                <h2>Your details.</h2>
                <p>So the business knows who to expect.</p>
              </div>
              <label>
                Full name
                <input
                  required
                  autoComplete="name"
                  maxLength={120}
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                />
              </label>
              <label>
                Email address
                <input
                  required
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="+971501234567"
                  pattern="\+[1-9][0-9]{7,14}"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                />
                <small>Include your country code.</small>
              </label>
              <label>
                Anything we should know? <span className="small">Optional</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={customer.notes}
                  onChange={(e) =>
                    setCustomer({ ...customer, notes: e.target.value })
                  }
                />
              </label>
              <div className="book-honeypot" aria-hidden="true">
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>
              <div className="book-bottom">
                <small>
                  Your details are shared with {data.business.name}.
                </small>
                <button className="btn primary">
                  Review booking <ArrowRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="book-section-heading">
                <span className="eyebrow">ONE LAST LOOK</span>
                <h2>Ready when you are.</h2>
                <p>Review your details before requesting an appointment.</p>
              </div>
              <div className="book-review">
                <h3>{chosen?.name || "Appointment"}</h3>
                <p>
                  <CalendarDays size={18} />
                  {formatAppointment(start, data.timezone)}
                </p>
                <p>
                  <UserRound size={18} />
                  {person?.name}
                </p>
                <hr />
                <strong>{customer.name}</strong>
                <p>{customer.email}</p>
                <p>{customer.phone}</p>
                {customer.notes && <p>{customer.notes}</p>}
                <hr />
                <div className="between">
                  <span>Starting price</span>
                  <strong>
                    {chosen
                      ? money(chosen.price, chosen.currency)
                      : "See original service"}
                  </strong>
                </div>
                <small>
                  The final price may vary. No payment is collected.
                </small>
              </div>
              <div className="book-save-note">
                <ShieldCheck size={20} />
                <p>
                  {pending.current
                    ? "We’re checking your original booking attempt. Retry below to get the saved result safely."
                    : "Your request holds this time after saving. The business must accept it before your appointment is confirmed."}
                </p>
              </div>
              <button
                className="btn primary full"
                disabled={busy || !restored}
                onClick={() => void confirm()}
              >
                {busy
                  ? "Saving your booking…"
                  : pending.current
                    ? "Check booking result"
                    : "Request appointment"}
                <CheckCircle2 size={18} />
              </button>
            </>
          )}
        </section>
      </div>
      <footer className="book-footer">
        Appointments by <strong>FormChat</strong>
      </footer>
    </main>
  );
}
