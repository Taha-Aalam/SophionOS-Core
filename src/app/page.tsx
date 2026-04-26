import { redirect } from "next/navigation";

import { DEFAULT_POST_LOGIN_PATH } from "@/lib/auth/auth-routing";

export default function Home() {
  redirect(DEFAULT_POST_LOGIN_PATH);
}
