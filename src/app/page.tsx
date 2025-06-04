import { redirect } from "next/navigation";

export default async function Home() {
  // Redirect directly to dashboard to show your admin panel
  redirect("/dashboard");
}
