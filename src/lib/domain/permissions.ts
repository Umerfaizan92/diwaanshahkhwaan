export const ROLES = ["OWNER", "MANAGER", "KITCHEN"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard:view",
  "orders:view",
  "orders:update", // move orders through the kitchen workflow
  "orders:cancel",
  "orders:refund",
  "menu:availability", // mark dishes sold out / available
  "menu:edit", // prices, descriptions, options, categories, photos
  "schedule:edit", // hours, closed dates, capacity
  "production:view",
  "payments:view",
  "payments:reconcile",
  "customers:view",
  "customers:edit",
  "reports:view",
  "notifications:manage",
  "messages:view",
  "settings:edit",
  "staff:manage",
  "audit:view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER: [
    "dashboard:view",
    "orders:view",
    "orders:update",
    "orders:cancel",
    "orders:refund",
    "menu:availability",
    "menu:edit",
    "schedule:edit",
    "production:view",
    "payments:view",
    "payments:reconcile",
    "customers:view",
    "customers:edit",
    "reports:view",
    "notifications:manage",
    "messages:view",
  ],
  KITCHEN: ["dashboard:view", "orders:view", "orders:update", "menu:availability", "production:view"],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(permission) ?? false;
}

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner — full access",
  MANAGER: "Manager — everything except settings, staff and audit log",
  KITCHEN: "Kitchen — view orders, update order progress, mark dishes sold out",
};
