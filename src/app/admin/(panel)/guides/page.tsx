import { redirect } from "next/navigation";

/** Guide Pages became Pages */
export default function OldGuidesAdmin() {
  redirect("/admin/pages");
}
