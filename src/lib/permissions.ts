/** Admin sections + who can open them. ADMIN = all, MANAGER = all except system, STAFF = custom list. */
export const SECTIONS = {
  dashboard: "Dashboard",
  orders: "Orders",
  customers: "Customers",
  products: "Products & Categories",
  mainsite: "Main Site Settings",
  payments: "Payments",
  landing: "Landing Pages",
  visitors: "Live Visitors",
  marketing: "Coupons & Reviews",
  reports: "Reports & Fraud",
  system: "System (users, SMS, pixel, settings)",
} as const;
export type Section = keyof typeof SECTIONS;

/** What each section unlocks — shown in the user editor */
export const SECTION_INFO: Record<Section, string> = {
  dashboard: "Sales overview (everyone)",
  orders: "View, confirm and ship orders, incomplete orders",
  customers: "Customer list and blocklist",
  products: "Products, stock, prices and categories",
  mainsite: "Homepage, SEO and thank-you page",
  payments: "Payment methods, delivery charges, courier keys",
  landing: "Landing pages, guide pages, landing settings",
  visitors: "Live visitor tracking",
  marketing: "Coupons and customer reviews",
  reports: "Sales reports and fraud checker",
  system: "Users, SMS, pixel, invoice and general settings",
};

export const ROLE_INFO = {
  ADMIN: { label: "Admin", desc: "Full access including users and system settings." },
  MANAGER: { label: "Manager", desc: "Runs the shop — everything except users and system settings." },
  STAFF: { label: "Staff", desc: "Only the sections you choose." },
} as const;

/** One-click permission sets for common staff jobs */
export const STAFF_TEMPLATES: { name: string; emoji: string; sections: Section[] }[] = [
  { name: "Call center", emoji: "📞", sections: ["orders", "customers"] },
  { name: "Inventory", emoji: "📦", sections: ["orders", "products"] },
  { name: "Marketing", emoji: "📣", sections: ["landing", "marketing", "visitors", "reports"] },
  { name: "Accounts", emoji: "💼", sections: ["orders", "reports", "payments"] },
];

export function can(user: { role: string; permissions?: string[] }, section: Section) {
  if (user.role === "ADMIN") return true;
  if (user.role === "MANAGER") return section !== "system";
  return section === "dashboard" || !!user.permissions?.includes(section);
}
