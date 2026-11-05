import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  index,
  uniqueIndex,
  customType,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const gstTreatment = pgEnum("gst_treatment", ["TAXABLE", "GST_FREE"]);
export const orderStatus = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COLLECTED",
  "CANCELLED",
  "REFUNDED",
  "PAYMENT_FAILED",
  "EXPIRED",
]);
export const paymentStatus = pgEnum("payment_status", [
  "CREATED",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);
export const staffRole = pgEnum("staff_role", ["OWNER", "MANAGER", "KITCHEN"]);
export const jobStatus = pgEnum("job_status", ["PENDING", "SENDING", "SENT", "FAILED", "CANCELLED"]);
export const channel = pgEnum("notification_channel", ["EMAIL", "SMS"]);

/* ---------------- Menu ---------------- */

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const media = pgTable("media", {
  id: id(),
  filename: text("filename").notNull(),
  alt: text("alt").notNull().default(""),
  contentType: text("content_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: integer("bytes").notNull(),
  data: bytea("data").notNull(),
  createdAt: createdAt(),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    portion: text("portion"),
    priceCents: integer("price_cents").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    /** Either a /public path or "media:<id>" for owner uploads */
    imagePath: text("image_path"),
    imageAlt: text("image_alt"),
    isAvailable: boolean("is_available").notNull().default(true),
    isArchived: boolean("is_archived").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    isDailySpecial: boolean("is_daily_special").notNull().default(false),
    isVegetarian: boolean("is_vegetarian").notNull().default(false),
    spiceLevel: integer("spice_level").notNull().default(0),
    ingredients: text("ingredients"),
    allergens: text("allergens").array().notNull().default(sql`'{}'::text[]`),
    mayContain: text("may_contain").array().notNull().default(sql`'{}'::text[]`),
    allergensConfirmed: boolean("allergens_confirmed").notNull().default(false),
    gstTreatment: gstTreatment("gst_treatment").notNull().default("TAXABLE"),
    dailyLimit: integer("daily_limit"),
    maxPerOrder: integer("max_per_order").notNull().default(20),
    prepLeadHours: integer("prep_lead_hours").notNull().default(0),
    /** 0=Sun..6=Sat. Empty = every open day. */
    availableDays: integer("available_days").array().notNull().default(sql`'{}'::int[]`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("menu_items_category_idx").on(t.categoryId)],
);

export const optionGroups = pgTable("option_groups", {
  id: id(),
  menuItemId: text("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** PORTION groups are single-select and required by convention */
  kind: text("kind", { enum: ["PORTION", "MODIFIER"] }).notNull().default("MODIFIER"),
  required: boolean("required").notNull().default(false),
  minSelect: integer("min_select").notNull().default(0),
  maxSelect: integer("max_select").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const optionChoices = pgTable("option_choices", {
  id: id(),
  groupId: text("group_id")
    .notNull()
    .references(() => optionGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceDeltaCents: integer("price_delta_cents").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ---------------- Business settings & schedule ---------------- */

export const businessSettings = pgTable("business_settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull(),
  tagline: text("tagline").notNull(),
  contacts: jsonb("contacts").$type<{ name: string | null; phone: string; role: string }[]>().notNull(),
  email: text("email"),
  abn: text("abn"),
  legalName: text("legal_name"),
  pickupArea: text("pickup_area").notNull(),
  pickupAddress: text("pickup_address"),
  pickupInstructions: text("pickup_instructions"),
  gstRegistered: boolean("gst_registered").notNull().default(false),
  timezone: text("timezone").notNull().default("Australia/Perth"),
  minNoticeHours: integer("min_notice_hours").notNull().default(24),
  maxAdvanceDays: integer("max_advance_days").notNull().default(14),
  dailyOrderLimit: integer("daily_order_limit").notNull().default(30),
  slotMinutes: integer("slot_minutes").notNull().default(30),
  slotCapacity: integer("slot_capacity").notNull().default(4),
  /** HH:MM local. Orders for a date close at this time on the previous day. null = no cutoff */
  orderCutoffTime: text("order_cutoff_time").default("20:00"),
  cancelDeadlineHours: integer("cancel_deadline_hours").notNull().default(24),
  paymentHoldMinutes: integer("payment_hold_minutes").notNull().default(20),
  acceptingOrders: boolean("accepting_orders").notNull().default(true),
  announcement: text("announcement"),
  notifyEmailEnabled: boolean("notify_email_enabled").notNull().default(true),
  notifySmsEnabled: boolean("notify_sms_enabled").notNull().default(false),
  notifyOwnerNewOrder: boolean("notify_owner_new_order").notNull().default(true),
  ownerNotifyEmail: text("owner_notify_email"),
  reminderHoursBefore: integer("reminder_hours_before").notNull().default(3),
  updatedAt: updatedAt(),
});

export const openingHours = pgTable("opening_hours", {
  dayOfWeek: integer("day_of_week").primaryKey(),
  isOpen: boolean("is_open").notNull().default(true),
  openTime: text("open_time").notNull().default("12:00"),
  closeTime: text("close_time").notNull().default("20:00"),
});

export const closedDates = pgTable("closed_dates", {
  date: text("date").primaryKey(),
  reason: text("reason"),
});

/* ---------------- People ---------------- */

export const customers = pgTable("customers", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash"),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const staffUsers = pgTable("staff_users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: staffRole("role").notNull().default("KITCHEN"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    kind: text("kind", { enum: ["STAFF", "CUSTOMER"] }).notNull(),
    subjectId: text("subject_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_subject_idx").on(t.subjectId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_key_at_idx").on(t.key, t.at)],
);

/* ---------------- Orders & payments ---------------- */

export const orders = pgTable(
  "orders",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    customerId: text("customer_id").references(() => customers.id),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    notes: text("notes"),
    pickupDate: text("pickup_date").notNull(),
    pickupTime: text("pickup_time").notNull(),
    pickupAt: timestamp("pickup_at", { withTimezone: true }).notNull(),
    status: orderStatus("status").notNull().default("PENDING_PAYMENT"),
    subtotalCents: integer("subtotal_cents").notNull(),
    gstCents: integer("gst_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    refundedCents: integer("refunded_cents").notNull().default(0),
    gstRegisteredAtOrder: boolean("gst_registered_at_order").notNull().default(false),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    trackingToken: text("tracking_token").notNull().unique(),
    smsOptIn: boolean("sms_opt_in").notNull().default(false),
    /** Set when staff need to look at this order (e.g. paid after its hold expired and the slot is now over capacity) */
    attentionReason: text("attention_reason"),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_pickup_date_status_idx").on(t.pickupDate, t.status),
    index("orders_status_idx").on(t.status),
    index("orders_customer_idx").on(t.customerId),
    index("orders_email_idx").on(t.customerEmail),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: text("menu_item_id")
      .notNull()
      .references(() => menuItems.id),
    name: text("name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    options: jsonb("options").$type<{ group: string; choice: string; priceDeltaCents: number }[]>().notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    gstTreatment: gstTreatment("gst_treatment").notNull(),
    gstCents: integer("gst_cents").notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_menu_idx").on(t.menuItemId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    note: text("note"),
    actor: text("actor"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    provider: text("provider").notNull(),
    providerSessionId: text("provider_session_id").notNull().unique(),
    providerPaymentId: text("provider_payment_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("aud"),
    status: paymentStatus("status").notNull().default("CREATED"),
    refundedCents: integer("refunded_cents").notNull().default(0),
    checkoutUrl: text("checkout_url"),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

export const refunds = pgTable("refunds", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payments.id),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  providerRefundId: text("provider_refund_id").unique(),
  status: text("status", { enum: ["PENDING", "SUCCEEDED", "FAILED"] })
    .notNull()
    .default("PENDING"),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

/** Processed provider webhook events (idempotency) */
export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------- Notifications ---------------- */

export const notificationJobs = pgTable(
  "notification_jobs",
  {
    id: id(),
    /** Unique per logical notification, e.g. "order-confirmed:<orderId>:EMAIL" */
    dedupeKey: text("dedupe_key").notNull(),
    channel: channel("channel").notNull(),
    template: text("template").notNull(),
    recipient: text("recipient").notNull(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: jobStatus("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(6),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("notification_jobs_dedupe_idx").on(t.dedupeKey),
    index("notification_jobs_due_idx").on(t.status, t.runAt),
  ],
);

/* ---------------- Misc ---------------- */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_at_idx").on(t.at)],
);

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: createdAt(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/* ---------------- Relations ---------------- */

export const categoriesRelations = relations(categories, ({ many }) => ({ items: many(menuItems) }));
export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, { fields: [menuItems.categoryId], references: [categories.id] }),
  optionGroups: many(optionGroups),
}));
export const optionGroupsRelations = relations(optionGroups, ({ one, many }) => ({
  menuItem: one(menuItems, { fields: [optionGroups.menuItemId], references: [menuItems.id] }),
  choices: many(optionChoices),
}));
export const optionChoicesRelations = relations(optionChoices, ({ one }) => ({
  group: one(optionGroups, { fields: [optionChoices.groupId], references: [optionGroups.id] }),
}));
export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
  refunds: many(refunds),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, { fields: [refunds.orderId], references: [orders.id] }),
}));
export const customersRelations = relations(customers, ({ many }) => ({ orders: many(orders) }));

export type MenuItem = typeof menuItems.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type StaffRole = (typeof staffRole.enumValues)[number];
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type OpeningHours = typeof openingHours.$inferSelect;
