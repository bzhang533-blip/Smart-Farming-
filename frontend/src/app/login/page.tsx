import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LoginContent from "./LoginContent";

// Server component — redirect authenticated users straight to the app.
export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) redirect("/farm");
  return <LoginContent />;
}
