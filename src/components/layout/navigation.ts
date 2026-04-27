import {
  CheckSquare,
  FolderKanban,
  Globe,
  Inbox,
  LayoutDashboard,
  Map,
  NotebookPen,
  Sun,
  Target,
} from "lucide-react";

const coreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/areas", label: "Areas", icon: Map },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/resources", label: "Resources", icon: Globe },
] as const;

const systemNavItems = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/my-day", label: "My Day", icon: Sun },
] as const;

const breadcrumbLabels: Record<string, string> = {
  areas: "Areas",
  dashboard: "Dashboard",
  "forgot-password": "Forgot Password",
  goals: "Goals",
  inbox: "Inbox",
  login: "Login",
  "my-day": "My Day",
  notes: "Notes",
  projects: "Projects",
  "reset-password": "Reset Password",
  resources: "Resources",
  settings: "Settings",
  signup: "Sign Up",
  tasks: "Tasks",
};

const trackerSectionMessage = "Trackers return in later restoration batches.";

export { breadcrumbLabels, coreNavItems, systemNavItems, trackerSectionMessage };
