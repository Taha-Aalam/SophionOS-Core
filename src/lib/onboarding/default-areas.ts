interface DefaultArea {
  name: string;
  description: string;
  icon: string;
  color: string;
  type: string;
}

const DEFAULT_AREAS: DefaultArea[] = [
  {
    name: "Work",
    description: "Professional responsibilities, workstreams, and business priorities.",
    icon: "💼",
    color: "#6366F1",
    type: "Business",
  },
  {
    name: "Health",
    description: "Physical health, routines, appointments, and wellbeing goals.",
    icon: "🏥",
    color: "#22C55E",
    type: "Personal",
  },
  {
    name: "Finances",
    description: "Money management, savings, planning, and financial maintenance.",
    icon: "💰",
    color: "#F59E0B",
    type: "Business",
  },
  {
    name: "Personal Growth",
    description: "Learning, skills, reflection, and long-term self-improvement.",
    icon: "📚",
    color: "#3B82F6",
    type: "Studies",
  },
  {
    name: "Family & Friends",
    description: "Relationships, connection, and the people who matter most.",
    icon: "👥",
    color: "#EC4899",
    type: "Personal",
  },
  {
    name: "Home",
    description: "Household responsibilities, maintenance, and day-to-day life admin.",
    icon: "🏠",
    color: "#14B8A6",
    type: "Personal",
  },
  {
    name: "Travel",
    description: "Trips, planning, itineraries, and places you want to explore.",
    icon: "✈️",
    color: "#06B6D4",
    type: "Personal",
  },
  {
    name: "Career",
    description: "Career development, opportunities, networking, and advancement.",
    icon: "🎯",
    color: "#8B5CF6",
    type: "Studies",
  },
];

export type { DefaultArea };
export { DEFAULT_AREAS };
