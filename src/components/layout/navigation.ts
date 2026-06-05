import { AreaEmoji } from "@/components/layout/area-emoji";
import { ContactsEmoji } from "@/components/layout/contacts-emoji";
import { DashboardEmoji } from "@/components/layout/dashboard-emoji";
import { GoalEmoji } from "@/components/layout/goal-emoji";
import { InboxTrayEmoji } from "@/components/layout/inbox-tray-emoji";
import { KnowledgeEmoji } from "@/components/layout/knowledge-emoji";
import { MyDayEmoji } from "@/components/layout/my-day-emoji";
import { NoteEmoji } from "@/components/layout/note-emoji";
import { ProjectEmoji } from "@/components/layout/project-emoji";
import { ResourceEmoji } from "@/components/layout/resource-emoji";
import { TagEmoji } from "@/components/layout/tag-emoji";
import { TaskEmoji } from "@/components/layout/task-emoji";

const coreNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardEmoji },
  { href: "/areas", label: "Areas", icon: AreaEmoji },
  { href: "/goals", label: "Goals", icon: GoalEmoji },
  { href: "/projects", label: "Projects", icon: ProjectEmoji },
  { href: "/tasks", label: "Tasks", icon: TaskEmoji },
  { href: "/notes", label: "Notes", icon: NoteEmoji },
  { href: "/resources", label: "Resources", icon: ResourceEmoji },
  { href: "/topics", label: "Topics", icon: TagEmoji },
  { href: "/contacts", label: "Contacts", icon: ContactsEmoji },
] as const;

const systemNavItems = [
  { href: "/my-day", label: "My Day", icon: MyDayEmoji },
  { href: "/inbox", label: "Inbox", icon: InboxTrayEmoji },
  { href: "/knowledge", label: "Knowledge Hub", icon: KnowledgeEmoji },
] as const;

const breadcrumbLabels: Record<string, string> = {
  areas: "Areas",
  contacts: "Contacts",
  dashboard: "Dashboard",
  "forgot-password": "Forgot Password",
  goals: "Goals",
  inbox: "Inbox",
  knowledge: "Knowledge Hub",
  login: "Login",
  "my-day": "My Day",
  notes: "Notes",
  projects: "Projects",
  "reset-password": "Reset Password",
  resources: "Resources",
  settings: "Settings",
  signup: "Sign Up",
  tasks: "Tasks",
  topics: "Topics",
};

export { breadcrumbLabels, coreNavItems, systemNavItems };
