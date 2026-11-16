/**
 * Role-based access control.
 * A permission is "<module>.<action>", e.g. "orders.edit", "products.delete".
 * Super Admin (Admin.role = ADMIN) has everything. Everyone else gets the permissions of their AdminRole.
 */

export const ACTIONS = ["view", "create", "edit", "delete", "export"] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_LABEL: Record<Action, string> = { view: "View", create: "Create", edit: "Edit", delete: "Delete", export: "Export" };

type ModuleDef = { label: string; group: string; desc: string; actions: Action[]; hints?: Partial<Record<Action, string>> };

export const MODULES = {
  dashboard: { label: "Dashboard", group: "General", desc: "Sales overview", actions: ["view"] },
  orders: {
    label: "Orders",
    group: "Sales",
    desc: "Orders and incomplete checkouts",
    actions: ["view", "edit", "delete", "export"],
    hints: { edit: "Change status, courier, notes, send to Steadfast", delete: "Delete orders and abandoned drafts", export: "Print invoices, download CSV" },
  },
  customers: { label: "Customers", group: "Sales", desc: "Customer list and blocklist", actions: ["view", "edit"], hints: { edit: "Block / unblock phones and IPs" } },
  products: {
    label: "Products & Categories",
    group: "Catalog",
    desc: "Products, stock, prices, categories",
    actions: ["view", "create", "edit", "delete"],
    hints: { edit: "Prices, stock, show/hide, reorder categories" },
  },
  mainsite: { label: "Main Site & Fonts", group: "Catalog", desc: "Homepage, SEO, thank-you page, fonts", actions: ["view", "edit"] },
  landing: { label: "Landing Pages & Pages", group: "Marketing", desc: "Landing pages, content pages, landing settings", actions: ["view", "create", "edit", "delete"] },
  marketing: { label: "Coupons & Reviews", group: "Marketing", desc: "Coupons and customer reviews", actions: ["view", "create", "edit", "delete"] },
  visitors: { label: "Live Visitors", group: "Marketing", desc: "Real-time visitor tracking", actions: ["view"] },
  reports: { label: "Reports & Fraud", group: "Marketing", desc: "Sales reports and fraud checker", actions: ["view", "export"] },
  payments: { label: "Payments & Delivery", group: "Settings", desc: "Payment methods, delivery charges, courier keys", actions: ["view", "edit"] },
  system: { label: "System Settings", group: "Settings", desc: "SMS, email, Facebook pixel, invoice, general settings, activity log", actions: ["view", "edit"] },
  users: {
    label: "Users & Roles",
    group: "Settings",
    desc: "Team members and their permissions",
    actions: ["view", "create", "edit", "delete"],
    hints: { edit: "Change roles, reset passwords, sign users out" },
  },
} satisfies Record<string, ModuleDef>;

export type Section = keyof typeof MODULES;
export const SECTION_KEYS = Object.keys(MODULES) as Section[];
/** module → label (kept for older imports) */
export const SECTIONS = Object.fromEntries(SECTION_KEYS.map((k) => [k, MODULES[k].label])) as Record<Section, string>;

export const perm = (s: Section, a: Action) => `${s}.${a}`;
/** Every permission that exists */
export const ALL_PERMISSIONS = SECTION_KEYS.flatMap((s) => (MODULES[s].actions as readonly Action[]).map((a) => perm(s, a)));
export const isValidPermission = (p: string) => ALL_PERMISSIONS.includes(p);

/** Everything in these modules (all their actions) */
export const fullAccess = (...mods: Section[]) => mods.flatMap((s) => (MODULES[s].actions as readonly Action[]).map((a) => perm(s, a)));

export function can(user: { role: string; permissions?: string[] }, section: Section, action: Action = "view") {
  if (user.role === "ADMIN") return true;
  if (section === "dashboard" && action === "view") return true;
  const p = user.permissions ?? [];
  // an action implies view; legacy plain "orders" = full module
  return p.includes(perm(section, action)) || p.includes(section);
}

export const ROLE_COLORS = ["emerald", "sky", "violet", "amber", "rose", "teal", "indigo", "orange"] as const;

/** Ready-made roles (created on first run, fully editable afterwards) */
export const DEFAULT_ROLES: { name: string; description: string; color: (typeof ROLE_COLORS)[number]; permissions: string[] }[] = [
  {
    name: "Manager",
    description: "Runs the shop day to day — everything except users and system settings.",
    color: "sky",
    permissions: [...fullAccess("orders", "customers", "products", "mainsite", "landing", "marketing", "visitors", "reports"), perm("payments", "view")],
  },
  {
    name: "Call Center",
    description: "Confirms orders on the phone and handles customers.",
    color: "emerald",
    permissions: [perm("orders", "view"), perm("orders", "edit"), perm("customers", "view"), perm("customers", "edit"), perm("products", "view")],
  },
  {
    name: "Inventory",
    description: "Keeps products, prices and stock up to date.",
    color: "amber",
    permissions: [perm("orders", "view"), ...fullAccess("products")],
  },
  {
    name: "Marketing",
    description: "Landing pages, coupons, reviews and ad performance.",
    color: "violet",
    permissions: [...fullAccess("landing", "marketing", "visitors"), perm("reports", "view"), perm("products", "view"), perm("mainsite", "view"), perm("mainsite", "edit")],
  },
  {
    name: "Accounts",
    description: "Sales reports, payments and order exports — read only elsewhere.",
    color: "rose",
    permissions: [perm("orders", "view"), perm("orders", "export"), ...fullAccess("reports"), perm("payments", "view")],
  },
];
