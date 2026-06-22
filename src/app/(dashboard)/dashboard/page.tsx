import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { DashboardContent } from "./dashboard-content"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  return <DashboardContent />
}
