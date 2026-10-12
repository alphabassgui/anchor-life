/**
 * The 8 selectable campus dreams (TASK-ONBOARD-5).
 *
 * The `id` is the STORED value. Onboarding picks exactly 1. Display name +
 * description live here (UI only).
 */
export type DreamId =
  | "first_class_citizen"
  | "sug_president"
  | "campus_big_boss"
  | "most_popular"
  | "chapel_general"
  | "clean_record"
  | "hostel_landlord"
  | "departmental_genius";

export interface Dream {
  id: DreamId;
  name: string;
  description: string;
}

export const DREAMS: readonly Dream[] = [
  {
    id: "first_class_citizen",
    name: "First-Class Citizen",
    description: "Graduate with a first-class CGPA.",
  },
  {
    id: "sug_president",
    name: "SUG President",
    description: "Win the student union election.",
  },
  {
    id: "campus_big_boss",
    name: "Campus Big Boss",
    description: "Build up a big wallet balance on campus.",
  },
  {
    id: "most_popular",
    name: "Most Popular",
    description: "Become padi (close friends) with lots of people.",
  },
  {
    id: "chapel_general",
    name: "Chapel General",
    description: "Max out your Devotion and spiritual standing.",
  },
  {
    id: "clean_record",
    name: "Clean Record",
    description: "Graduate with zero SDC Heat — never get caught.",
  },
  {
    id: "hostel_landlord",
    name: "Hostel Landlord",
    description: "Run the biggest side-hustle empire on campus.",
  },
  {
    id: "departmental_genius",
    name: "Departmental Genius",
    description: "Top your department and master your field.",
  },
];
