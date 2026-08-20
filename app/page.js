import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth";

export default function Home() {
  const session = getUserSession();
  if (session) redirect("/dashboard");
  redirect("/login");
}
