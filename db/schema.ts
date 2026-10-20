import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
// The overlap and settings-revision guards are SQL triggers in 0005_appointments.sql.
export const appointmentSettings = sqliteTable("appointment_settings", {
  businessId: text("business_id")
    .primaryKey()
    .references(() => businesses.id),
  enabled: integer("enabled").notNull().default(0),
  revision: integer("revision").notNull().default(0),
  config: text("config").notNull(),
});
export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id),
    formId: text("form_id").references(() => forms.id),
    submissionId: text("submission_id")
      .unique()
      .references(() => submissions.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => appointmentCustomers.id),
    serviceId: text("service_id").notNull(),
    providerId: text("provider_id").notNull(),
    start: text("start").notNull(),
    end: text("end").notNull(),
    occupiedEnd: text("occupied_end").notNull(),
    timezone: text("timezone").notNull(),
    status: text("status", {
      enum: [
        "pending",
        "confirmed",
        "declined",
        "cancelled",
        "completed",
        "no_show",
      ],
    })
      .notNull()
      .default("pending"),
    revision: integer("revision").notNull().default(0),
    scheduleRevision: integer("schedule_revision").notNull(),
    idempotency: text("idempotency"),
    payloadHash: text("payload_hash"),
    tokenHash: text("token_hash"),
    confirmation: text("confirmation"),
    details: text("details").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_bookings_availability").on(
      table.businessId,
      table.providerId,
      table.start,
      table.occupiedEnd,
    ),
    index("idx_bookings_calendar").on(table.businessId, table.start),
    uniqueIndex("idx_bookings_idempotency").on(
      table.businessId,
      table.idempotency,
    ),
  ],
);
export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  logo: text("logo").notNull().default(""),
  accent: text("accent").notNull().default("#176650"),
  button: text("button").notNull().default("#176650"),
  plan: text("plan").notNull().default("free"),
  onboarded: integer("onboarded").notNull().default(0),
});
export const forms = sqliteTable(
  "forms",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id),
    slug: text("slug").notNull().unique(),
    draft: text("draft").notNull(),
    published: text("published"),
    status: text("status").notNull().default("draft"),
    version: integer("version").notNull().default(0),
    revision: integer("revision").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
    deleted: integer("deleted").notNull().default(0),
  },
  (t) => [index("idx_forms_business").on(t.businessId, t.deleted)],
);
export const versions = sqliteTable(
  "versions",
  {
    id: text("id").primaryKey(),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id),
    version: integer("version").notNull(),
    snapshot: text("snapshot").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("idx_versions_form_number").on(t.formId, t.version)],
);
export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id),
    version: integer("version").notNull(),
    snapshot: text("snapshot").notNull(),
    receipt: text("receipt").notNull(),
    idempotency: text("idempotency").notNull(),
    payloadHash: text("payload_hash").notNull(),
    tokenHash: text("token_hash").notNull(),
    customer: text("customer").notNull(),
    summary: text("summary").notNull(),
    total: integer("total").notNull().default(0),
    createdAt: text("created_at").notNull(),
    handoffAt: text("handoff_at"),
    assignedTo: text("assigned_to"),
    workflowStatus: text("workflow_status").notNull().default("new"),
    internalNotes: text("internal_notes").notNull().default(""),
  },
  (t) => [
    uniqueIndex("idx_submission_idempotency").on(t.formId, t.idempotency),
    index("idx_submissions_business_date").on(t.businessId, t.createdAt),
    index("idx_submissions_form").on(t.formId),
  ],
);
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull(),
    formId: text("form_id").notNull(),
    visitor: text("visitor").notNull(),
    kind: text("kind").notNull(),
    day: text("day").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_events_unique").on(t.formId, t.visitor, t.kind, t.day),
    index("idx_events_business_date").on(t.businessId, t.createdAt),
  ],
);
export const rates = sqliteTable("rates", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
export const uploads = sqliteTable(
  "uploads",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
  },
  (t) => [index("idx_uploads_business").on(t.businessId)],
);

export const usage = sqliteTable(
  "usage",
  {
    key: text("key").primaryKey(),
    businessId: text("business_id").notNull(),
    month: text("month").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("idx_usage_business_month").on(t.businessId, t.month)],
);

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id),
    userId: text("user_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    status: text("status").notNull().default("invited"),
    inviteHash: text("invite_hash"),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_members_email").on(t.businessId, t.email),
    index("idx_members_user").on(t.userId),
  ],
);
export const routingCounters = sqliteTable("routing_counters", {
  formId: text("form_id").primaryKey(),
  counter: integer("counter").notNull(),
});

export const appointmentCustomers = sqliteTable(
  "appointment_customers",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    notes: text("notes").notNull().default(""),
    archived: integer("archived").notNull().default(0),
    revision: integer("revision").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("appointment_customers_contact").on(
      t.businessId,
      t.email,
      t.phone,
    ),
  ],
);
export const appointmentActivity = sqliteTable("appointment_activity", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessId: text("business_id").notNull(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  providerId: text("provider_id").notNull(),
  createdAt: text("created_at").notNull(),
});
