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

export function can(user: { role: string; permissions?: string[] }, section: Section) {
  if (user.role === "ADMIN") return true;
  if (user.role === "MANAGER") return section !== "system";
  return section === "dashboard" || !!user.permissions?.includes(section);
}
