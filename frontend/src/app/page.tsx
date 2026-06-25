import { redirect } from "next/navigation";

// Root route — send everyone to /farm.
// Unauthenticated users are caught by middleware and sent to /login first.
export default function RootPage() {
  redirect("/farm");
}
