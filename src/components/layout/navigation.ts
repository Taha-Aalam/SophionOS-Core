import {
  CheckSquare,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Map,
  NotebookPen,
  Target,
} from "lucide-react";

const coreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/areas", label: "Areas", icon: Map },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/notes", label: "Notes", icon: NotebookPen },
] as const;

const systemNavItems = [
  { href: "/inbox", label: "Inbox", icon: Inbox, comingSoon: true },
  { href: "/my-day", label: "My Day", icon: CheckSquare, comingSoon: true },
] as const;

const breadcrumbLabels: Record<string, string> = {
  areas: "Areas",
  dashboard: "Dashboard",
  "forgot-password": "Forgot Password",
  goals: "Goals",
  login: "Login",
  notes: "Notes",
  projects: "Projects",
  "reset-password": "Reset Password",
  settings: "Settings",
  signup: "Sign Up",
  tasks: "Tasks",
};

const trackerSectionMessage = "Trackers return in later restoration batches.";

export { breadcrumbLabels, coreNavItems, systemNavItems, trackerSectionMessage };
