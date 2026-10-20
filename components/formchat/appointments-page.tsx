"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Plus,
  List,
  SlidersHorizontal,
  Sparkles,
  Copy,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock3,
  UserRound,
  CheckCircle2,
} from "lucide-react";
import { Customers, ManualBooking, BookingDetail } from "./appointment-tools";
import { api, copy } from "@/lib/client";
import {
  defaultSchedule,
  formatAppointment,
  localDate,
  type AppointmentConfig,
  type Slot,
} from "@/lib/appointments";
import { CURRENCIES } from "@/lib/config";
import { money } from "@/lib/model";

type Settings = {
  enabled: boolean;
  revision: number;
  config: AppointmentConfig;
  team: { id: string; name: string }[];
  bookingPath: string;
};
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
function Dates({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [date, setDate] = useState("");
  return (
    <div>
      <div className="appointment-actions">
        <input
          aria-label="Unavailable date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          className="btn"
          type="button"
          disabled={!date}
          onClick={() => {
            onChange([...new Set([...value, date])].sort());
            setDate("");
          }}
        >
          Add unavailable date
        </button>
      </div>
      <div className="appointment-slots">
        {value.map((d) => (
          <button
            type="button"
            className="btn"
            key={d}
            onClick={() => onChange(value.filter((x) => x !== d))}
            aria-label={`Remove unavailable date ${d}`}
          >
            {d} ×
          </button>
        ))}
      </div>
    </div>
  );
}
function Periods({
  value,
  onChange,
  label,
}: {
  value: { start: string; end: string }[];
  onChange: (v: { start: string; end: string }[]) => void;
  label: string;
}) {
  return (
    <div>
      <strong>{label}</strong>
      {value.map((p, i) => (
        <div className="appointment-actions" key={i}>
          <input
            aria-label={`${label} start`}
            type="time"
            required
            value={p.start}
            onChange={(e) =>
              onChange(
                value.map((x, j) =>
                  i === j ? { ...x, start: e.target.value } : x,
                ),
              )
            }
          />
          <span>to</span>
          <input
            aria-label={`${label} end`}
            type="time"
            required
            value={p.end}
            onChange={(e) =>
              onChange(
                value.map((x, j) =>
                  i === j ? { ...x, end: e.target.value } : x,
                ),
              )
            }
          />
          <button
            className="text-btn"
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      {value.length < 3 && (
        <button
          type="button"
          className="text-btn"
          onClick={() =>
            onChange([
              ...value,
              {
                start: label === "Breaks" ? "12:00" : "09:00",
                end: label === "Breaks" ? "13:00" : "17:00",
              },
            ])
          }
        >
          Add {label.toLowerCase()}
        </button>
      )}
    </div>
  );
}
export default function AppointmentsPage({
  businessId,
}: {
  businessId: string;
}) {
  const saving = useRef(false);
  const recoveryKey = `formchat:appointment-settings:${businessId}`;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState("bookings");
  const [routeId, setRouteId] = useState("");
  const [newCustomer, setNewCustomer] = useState<any>(null);
  useEffect(() => {
    const sync = () => {
      const parts = window.location.hash.slice(1).split("/");
      if (parts[0] === "appointments") {
        setTab(
          [
            "requests",
            "bookings",
            "booking",
            "customers",
            "new",
            "calendar",
            "services",
            "availability",
          ].includes(parts[1])
            ? parts[1]
            : "bookings",
        );
        setRouteId(parts[2] || "");
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [savedZone, setSavedZone] = useState("UTC");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty || !settings) return;
    try {
      sessionStorage.setItem(recoveryKey, JSON.stringify(settings));
    } catch {}
  }, [settings, dirty, recoveryKey]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const view = tab === "calendar" ? "calendar" : "list";
  const [editing, setEditing] = useState<any>(null);
  const [provider, setProvider] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api("appointments/settings")
      .then((r) => {
        let recovered: Settings | null = null;
        try {
          recovered = JSON.parse(sessionStorage.getItem(recoveryKey) || "null");
        } catch {}
        if (recovered?.config && typeof recovered.revision === "number") {
          setSettings({
            ...r,
            enabled: recovered.enabled,
            config: recovered.config,
            revision: recovered.revision,
          });
          setDirty(true);
          setNotice(
            recovered.revision === r.revision
              ? "Your unsaved appointment settings were restored."
              : "Your draft was restored, but settings changed elsewhere. Copy your edits before reloading; saving may report a conflict.",
          );
        } else setSettings(r);
        setSavedZone(r.config.timezone);
        const today = localDate(new Date().toISOString(), r.config.timezone);
        setFrom(today);
        setTo(
          new Date(Date.parse(today) + 30 * 86400000)
            .toISOString()
            .slice(0, 10),
        );
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!from || !to) return;
    let active = true;
    setError("");
    api(
      `appointments/bookings?${tab === "requests" ? "status=pending" : new URLSearchParams({ from, to })}`,
    )
      .then((r) => active && setBookings(r.bookings))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [from, to, refresh, tab]);
  useEffect(() => {
    setSlots([]);
    setSlot("");
    if (!editing || !date || !provider) return;
    let active = true;
    api(
      `appointments/slots?${new URLSearchParams({ service: editing.service_id, provider, date, exclude: editing.id })}`,
    )
      .then((r) => active && setSlots(r.slots))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [editing, date, provider]);
  async function action(b: any, data: any) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`appointments/bookings/${b.id}`, "PATCH", {
        revision: b.revision,
        ...data,
      });
      setEditing(null);
      setRefresh((x) => x + 1);
      setNotice("Appointment updated. Contact the customer to let them know.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!settings) return <p role="status">{error || "Loading appointments…"}</p>;
  const config = settings.config;
  const change = (patch: Partial<AppointmentConfig>) => {
    setDirty(true);
    setSettings({ ...settings, config: { ...config, ...patch } });
  };
  const shown = bookings.filter(
    (b) =>
      (tab === "requests"
        ? b.status === "pending"
        : filter === "all" || b.status === filter) &&
      (
        b.details.customer +
        " " +
        b.details.serviceName +
        " " +
        b.details.providerName
      )
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const moveWeek = (n: number) => {
    const next = new Date(
      Date.parse(from || localDate(new Date().toISOString(), savedZone)) +
        n * 7 * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    setFrom(next);
    setTo(new Date(Date.parse(next) + 6 * 86400000).toISOString().slice(0, 10));
  };
  const providerName = (id: string) =>
    settings.team.find((p) => p.id === id)?.name || "Inactive team member";
  const cards = (rows: any[]) =>
    rows.map((b) => (
      <article
        className={`panel appointment-card status-${b.status}`}
        key={b.id}
      >
        <span className={`booking-status ${b.status}`}>
          {b.status.replace("_", " ")}
        </span>
        <h3>
          <a href={`#appointments/booking/${b.id}`}>
            {b.details.serviceName} · {b.details.customer}
          </a>
        </h3>
        <p>
          {formatAppointment(b.start, savedZone)} –{" "}
          {new Intl.DateTimeFormat("en", {
            timeZone: savedZone,
            timeStyle: "short",
          }).format(new Date(b.end))}
        </p>
        <p>
          {b.details.providerName} ·{" "}
          <strong>{b.status.replace("_", " ")}</strong> · from{" "}
          {money(b.details.price, b.details.currency)}
        </p>
        <small>Booking reference: {b.id}</small>
        <details>
          <summary>Customer details</summary>
          {b.details.email && (
            <p>
              <strong>Email:</strong> {b.details.email}
            </p>
          )}
          {b.details.customerPhone && (
            <p>
              <strong>Phone:</strong> {b.details.customerPhone}
            </p>
          )}
          {b.details.notes && (
            <p>
              <strong>Notes:</strong> {b.details.notes}
            </p>
          )}
          {b.details.answers?.map((a: any, i: number) => (
            <p key={i}>
              <strong>{a.label}:</strong>{" "}
              {Array.isArray(a.value) ? a.value.join(", ") : a.value}
            </p>
          ))}
        </details>
        {b.status === "pending" && (
          <div className="appointment-actions">
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void action(b, { status: "confirmed" })}
            >
              Accept appointment
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm("Decline this request and release its time?")
                )
                  void action(b, { status: "declined" });
              }}
            >
              Decline
            </button>
          </div>
        )}
        {["pending", "confirmed"].includes(b.status) && (
          <div className="appointment-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setEditing(b);
                setProvider(b.provider_id);
                setDate(localDate(b.start, savedZone));
                setError("");
              }}
            >
              Reschedule
            </button>
            {(b.status === "pending"
              ? ["cancelled"]
              : ["cancelled", "completed", "no_show"]
            ).map((status) => (
              <button
                className="btn"
                key={status}
                disabled={busy}
                onClick={() => {
                  if (
                    status !== "cancelled" ||
                    window.confirm(
                      "Cancel this appointment and release its time?",
                    )
                  )
                    void action(b, { status });
                }}
              >
                {status === "cancelled"
                  ? "Cancel"
                  : status === "completed"
                    ? "Mark completed"
                    : "Mark no-show"}
              </button>
            ))}
          </div>
        )}
      </article>
    ));
  return (
    <div className="appointments-page" data-section={tab}>
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR SCHEDULE</span>
          <h1>Appointments</h1>
          <p>
            Review requests, manage upcoming appointments and keep your team’s
            availability up to date. {savedZone}.{" "}
            {settings.enabled
              ? "Booking is enabled."
              : "New bookings are paused."}
          </p>
        </div>
      </div>
      <div className="booking-section-toolbar">
        <p>Manage your appointments and customers in one place.</p>
        <button
          className="btn primary"
          onClick={() => {
            setNewCustomer(null);
            window.location.hash = "appointments/new";
          }}
        >
          New appointment
        </button>
      </div>
      <div className="booking-share-bar">
        <div>
          <CalendarDays size={20} />
          <div>
            <strong>Your booking page</strong>
            <small>
              One link for your services, available times and customer bookings.
            </small>
          </div>
        </div>
        <div>
          <button
            className="btn"
            onClick={() =>
              copy(location.origin + settings.bookingPath)
                .then(() => setNotice("Booking link copied."))
                .catch(() =>
                  setError(
                    "Could not copy. Open your booking page and copy its address.",
                  ),
                )
            }
          >
            <Copy size={15} /> Copy link
          </button>
          <a
            className="btn primary"
            href={settings.bookingPath}
            target="_blank"
            rel="noopener noreferrer"
          >
            View booking page <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
      <div
        className="booking-tabs"
        role="tablist"
        aria-label="Appointments sections"
      >
        {[
          { id: "requests", label: "Requests", icon: Clock3 },
          { id: "customers", label: "Customers", icon: UserRound },
          { id: "bookings", label: "Bookings", icon: List },
          { id: "calendar", label: "Calendar", icon: CalendarDays },
          { id: "services", label: "Services", icon: Sparkles },
          {
            id: "availability",
            label: "Availability",
            icon: SlidersHorizontal,
          },
        ].map(({ id, label, icon: Icon }) => (
          <button
            role="tab"
            aria-selected={
              tab === id ||
              (id === "bookings" && ["booking", "new"].includes(tab))
            }
            key={id}
            className={
              tab === id ||
              (id === "bookings" && ["booking", "new"].includes(tab))
                ? "active"
                : ""
            }
            onClick={() => {
              window.location.hash = `appointments/${id}`;
              setTab(id);
              if (id === "calendar" && from)
                setTo(
                  new Date(Date.parse(from) + 6 * 86400000)
                    .toISOString()
                    .slice(0, 10),
                );
              setError("");
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {tab === "customers" ? (
        <Customers
          id={routeId}
          onBook={(customer) => {
            setNewCustomer(customer);
            window.location.hash = "appointments/new";
          }}
        />
      ) : tab === "new" ? (
        <ManualBooking
          settings={settings}
          customer={newCustomer}
          onClose={() => {
            window.location.hash = "appointments/bookings";
          }}
          onDone={(id) => {
            setNewCustomer(null);
            setRefresh((x) => x + 1);
            window.location.hash = `appointments/booking/${id}`;
          }}
        />
      ) : tab === "booking" && routeId ? (
        <BookingDetail
          id={routeId}
          onReschedule={(b) => {
            setEditing(b);
            setProvider(b.provider_id);
            setDate(localDate(b.start, savedZone));
            window.location.hash = "appointments/bookings";
          }}
        />
      ) : ["services", "availability"].includes(tab) ? (
        <form
          className="panel settings-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving.current) return;
            saving.current = true;
            setBusy(true);
            setError("");
            setNotice("");
            try {
              setSettings(
                await api("appointments/settings", "PATCH", {
                  enabled: settings.enabled,
                  revision: settings.revision,
                  config,
                }),
              );
              setSavedZone(config.timezone);
              try {
                sessionStorage.removeItem(recoveryKey);
              } catch {}
              setDirty(false);
              setRefresh((x) => x + 1);
              setNotice("Saved. Your separate booking page is up to date.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              saving.current = false;
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} className="appointment-settings-fields">
            <div className="booking-editor-heading">
              <span className="eyebrow">
                {tab === "services"
                  ? "WHAT YOU OFFER"
                  : "WHEN YOU’RE AVAILABLE"}
              </span>
              <h2>
                {tab === "services"
                  ? "Good service starts here."
                  : "Make room for what matters."}
              </h2>
              <p>
                {tab === "services"
                  ? "Create the services customers can book on your booking page."
                  : "Set your business time zone, working hours, breaks and days off."}
              </p>
            </div>
            <div hidden={tab !== "availability"}>
              <label>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => (
                    setDirty(true),
                    setSettings({ ...settings, enabled: e.target.checked })
                  )}
                />{" "}
                Accept new bookings
              </label>
              <label>
                Business time zone
                <input
                  required
                  list="appointment-timezones"
                  value={config.timezone}
                  placeholder="Asia/Dubai"
                  onChange={(e) => change({ timezone: e.target.value })}
                />
                <datalist id="appointment-timezones">
                  {Intl.supportedValuesOf("timeZone").map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
              </label>
              <p>
                Changing the time zone changes future availability; existing
                appointments keep their UTC times.
              </p>
            </div>
            <div hidden={tab !== "services"}>
              <h3>{config.services.length} services</h3>
              {config.services.map((s, i) => {
                const update = (patch: Partial<typeof s>) =>
                  change({
                    services: config.services.map((x, j) =>
                      i === j ? { ...x, ...patch } : x,
                    ),
                  });
                return (
                  <fieldset
                    className="appointment-service service-editor"
                    key={s.id}
                  >
                    <legend>{s.name || "New service"}</legend>
                    <label>
                      Name
                      <input
                        required
                        maxLength={120}
                        value={s.name}
                        onChange={(e) => update({ name: e.target.value })}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        maxLength={600}
                        value={s.description}
                        onChange={(e) =>
                          update({ description: e.target.value })
                        }
                      />
                    </label>
                    <div className="appointment-actions">
                      <label>
                        Duration (minutes)
                        <input
                          type="number"
                          min={5}
                          max={480}
                          required
                          value={s.duration}
                          onChange={(e) =>
                            update({ duration: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Buffer after (minutes)
                        <input
                          type="number"
                          min={0}
                          max={240}
                          required
                          value={s.buffer}
                          onChange={(e) =>
                            update({ buffer: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Starting price
                        <input
                          type="number"
                          min={0}
                          max={100000}
                          step="0.01"
                          required
                          value={s.price / 100}
                          onChange={(e) =>
                            update({
                              price: Math.round(Number(e.target.value) * 100),
                            })
                          }
                        />
                      </label>
                      <label>
                        Currency
                        <select
                          value={s.currency}
                          onChange={(e) =>
                            update({
                              currency: e.target.value as typeof s.currency,
                            })
                          }
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="appointment-actions">
                      <label>
                        Minimum notice
                        <select
                          value={s.minNoticeHours ?? 0}
                          onChange={(e) =>
                            update({ minNoticeHours: Number(e.target.value) })
                          }
                        >
                          {[0, 1, 2, 4, 12, 24, 48, 72, 168].map((h) => (
                            <option key={h} value={h}>
                              {h === 0
                                ? "No minimum"
                                : h < 24
                                  ? `${h} hours`
                                  : `${h / 24} days`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Book up to (days ahead)
                        <input
                          type="number"
                          min={1}
                          max={90}
                          required
                          value={s.maxAdvanceDays ?? 90}
                          onChange={(e) =>
                            update({ maxAdvanceDays: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Start times every
                        <select
                          value={s.slotInterval ?? 15}
                          onChange={(e) =>
                            update({
                              slotInterval: Number(e.target.value) as
                                15 | 30 | 60,
                            })
                          }
                        >
                          {[15, 30, 60].map((m) => (
                            <option key={m} value={m}>
                              {m} minutes
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={s.active !== false}
                        onChange={(e) => update({ active: e.target.checked })}
                      />{" "}
                      Bookable online
                    </label>
                    <p>Provided by</p>
                    {settings.team.map((p) => (
                      <label key={p.id}>
                        <input
                          type="checkbox"
                          checked={s.providerIds.includes(p.id)}
                          onChange={(e) => {
                            const providerIds = e.target.checked
                              ? [...s.providerIds, p.id]
                              : s.providerIds.filter((id) => id !== p.id);
                            change({
                              services: config.services.map((x, j) =>
                                j === i ? { ...x, providerIds } : x,
                              ),
                              providers: config.providers.some(
                                (x) => x.id === p.id,
                              )
                                ? config.providers
                                : [...config.providers, defaultSchedule(p.id)],
                            });
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                    <button
                      className="text-btn"
                      type="button"
                      onClick={() =>
                        change({
                          services: config.services.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove service
                    </button>
                  </fieldset>
                );
              })}
              <button
                type="button"
                className="btn primary add-service-button"
                disabled={config.services.length >= 30}
                onClick={() =>
                  change({
                    services: [
                      ...config.services,
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        description: "",
                        duration: 30,
                        buffer: 0,
                        price: 0,
                        currency: "USD",
                        providerIds: ["owner"],
                      },
                    ],
                  })
                }
              >
                <Plus size={18} aria-hidden="true" /> Add service
              </button>
            </div>
            <div hidden={tab !== "availability"}>
              <h3>Business unavailable dates</h3>
              <Dates
                value={config.unavailableDates}
                onChange={(unavailableDates) => change({ unavailableDates })}
              />
              <h2>Team schedules</h2>
              {config.providers.map((p, i) => {
                const update = (patch: Partial<typeof p>) =>
                  change({
                    providers: config.providers.map((x, j) =>
                      i === j ? { ...x, ...patch } : x,
                    ),
                  });
                return (
                  <details key={p.id} className="appointment-service">
                    <summary>{providerName(p.id)}</summary>
                    {p.days.map((d, j) => (
                      <div className="appointment-day" key={d.day}>
                        <h3>{weekdays[d.day]}</h3>
                        {!d.periods.length && <p>Closed</p>}
                        <Periods
                          label="Working hours"
                          value={d.periods}
                          onChange={(periods) =>
                            update({
                              days: p.days.map((x, k) =>
                                j === k ? { ...x, periods } : x,
                              ),
                            })
                          }
                        />
                        <Periods
                          label="Breaks"
                          value={d.breaks}
                          onChange={(breaks) =>
                            update({
                              days: p.days.map((x, k) =>
                                j === k ? { ...x, breaks } : x,
                              ),
                            })
                          }
                        />
                      </div>
                    ))}
                    <h3>Unavailable dates</h3>
                    <Dates
                      value={p.unavailableDates}
                      onChange={(unavailableDates) =>
                        update({ unavailableDates })
                      }
                    />
                    {p.id !== "owner" && (
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() =>
                          change({
                            providers: config.providers.filter(
                              (x) => x.id !== p.id,
                            ),
                            services: config.services.map((s) => ({
                              ...s,
                              providerIds: s.providerIds.filter(
                                (id) => id !== p.id,
                              ),
                            })),
                          })
                        }
                      >
                        Remove provider schedule
                      </button>
                    )}
                  </details>
                );
              })}
            </div>
            <div className="booking-save-bar">
              <span>
                {dirty
                  ? "You have unsaved changes"
                  : "Changes apply to your booking page after saving."}
              </span>
              <button className="btn primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          <div className="booking-overview">
            <div>
              <CalendarDays size={19} />
              <span>
                Confirmed
                <strong>
                  {bookings.filter((b) => b.status === "confirmed").length}
                </strong>
              </span>
            </div>
            <div>
              <CheckCircle2 size={19} />
              <span>
                Awaiting approval
                <strong>
                  {bookings.filter((b) => b.status === "pending").length}
                </strong>
              </span>
            </div>
            <div>
              <UserRound size={19} />
              <span>
                Services<strong>{config.services.length}</strong>
              </span>
            </div>
          </div>
          <div className="booking-list-filters">
            <label>
              <Search size={16} />
              <input
                placeholder="Search customer or service"
                aria-label="Search appointments"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div>
              {[
                "all",
                "pending",
                "confirmed",
                "declined",
                "completed",
                "cancelled",
                "no_show",
              ].map((s) => (
                <button
                  className={filter === s ? "active" : ""}
                  key={s}
                  onClick={() => setFilter(s)}
                >
                  {s === "all" ? "All bookings" : s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          {tab === "calendar" && (
            <div className="booking-week-nav">
              <h2>
                {new Intl.DateTimeFormat("en", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(
                  new Date(
                    `${from || localDate(new Date().toISOString(), savedZone)}T12:00:00Z`,
                  ),
                )}
              </h2>
              <div>
                <button
                  className="btn"
                  aria-label="Previous week"
                  onClick={() => moveWeek(-1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    const today = localDate(
                      new Date().toISOString(),
                      savedZone,
                    );
                    setFrom(today);
                    setTo(
                      new Date(Date.parse(today) + 6 * 86400000)
                        .toISOString()
                        .slice(0, 10),
                    );
                  }}
                >
                  Today
                </button>
                <button
                  className="btn"
                  aria-label="Next week"
                  onClick={() => moveWeek(1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}
          <div className="appointment-actions booking-range">
            <label>
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button className="btn" onClick={() => setRefresh((x) => x + 1)}>
              Refresh
            </button>
          </div>
          {editing && (
            <section className="panel appointment-card">
              <h2>Reschedule {editing.details.serviceName}</h2>
              <label>
                Provider
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {settings.team
                    .filter((p) =>
                      config.services
                        .find((s) => s.id === editing.service_id)
                        ?.providerIds.includes(p.id),
                    )
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Available time
                <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                  <option value="">Choose a time</option>
                  {slots.map((s) => (
                    <option key={s.start} value={s.start}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="appointment-actions">
                <button className="btn" onClick={() => setEditing(null)}>
                  Close
                </button>
                <button
                  className="btn primary"
                  disabled={!slot || busy}
                  onClick={() =>
                    void action(editing, {
                      appointment: {
                        serviceId: editing.service_id,
                        providerId: provider,
                        start: slot,
                      },
                    })
                  }
                >
                  Save new time
                </button>
              </div>
            </section>
          )}
          {!shown.length && (
            <div className="book-empty">
              <CalendarDays size={30} />
              <h3>A little breathing room.</h3>
              <p>
                No appointments match this date range and filter. Share your
                booking link to get started.
              </p>
            </div>
          )}
          {view === "list" ? (
            <div className="booking-list">
              {cards(
                [...shown].sort(
                  (a, b) =>
                    Number(b.status === "pending") -
                      Number(a.status === "pending") ||
                    a.start.localeCompare(b.start),
                ),
              )}
            </div>
          ) : (
            <div className="appointment-calendar">
              {Array.from(
                {
                  length: Math.min(
                    94,
                    Math.max(
                      0,
                      (Date.parse(to) - Date.parse(from)) / 86400000 + 1,
                    ),
                  ),
                },
                (_, i) =>
                  new Date(Date.parse(from) + i * 86400000)
                    .toISOString()
                    .slice(0, 10),
              ).map((day) => (
                <section key={day}>
                  <h3 className="booking-day-heading">
                    {new Intl.DateTimeFormat("en", {
                      weekday: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(`${day}T12:00:00Z`))}
                  </h3>
                  {cards(
                    shown.filter((b) => localDate(b.start, savedZone) === day),
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
