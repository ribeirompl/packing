/**
 * Shared TypeScript types for Packing Checklist PWA
 */

// Trip characteristics. An item template with tags is only included when at least one
// of its tags is active for the trip; an item with no tags is always included.
export const TRIP_TAGS = [
  'flying',
  'road_trip',
  'international',
  'hot',
  'cold',
  'rain',
  'beach',
  'formal',
  'hiking',
  'work',
  'kids',
  'laundry',
] as const;

export type TripTag = (typeof TRIP_TAGS)[number];

export const TRIP_TAG_LABELS: Record<TripTag, string> = {
  flying: 'Flying',
  road_trip: 'Road trip',
  international: 'International',
  hot: 'Hot weather',
  cold: 'Cold weather',
  rain: 'Rain',
  beach: 'Beach & swimming',
  formal: 'Formal / business',
  hiking: 'Hiking & outdoors',
  work: 'Working (laptop)',
  kids: 'Kids / baby',
  laundry: 'Washing available',
};

// When an item should be packed or done
export const PACK_PHASES = ['ahead', 'last_minute', 'leaving'] as const;

export type PackPhase = (typeof PACK_PHASES)[number];

export const PACK_PHASE_LABELS: Record<PackPhase, string> = {
  ahead: 'Pack ahead',
  last_minute: 'Last-minute (morning of)',
  leaving: 'Leaving the house',
};

/**
 * How many of an item to pack. Quantities are computed against the "coverage days":
 * the trip length, or the washing interval if washing is available and shorter.
 */
export type QuantityRule =
  /** rate per coverage day, plus one per spare day if `spare` */
  | { kind: 'per_day'; rate: number; spare: boolean; min?: number; max?: number }
  /** one per `n` coverage days */
  | { kind: 'per_n_days'; n: number; min?: number; max?: number }
  | { kind: 'fixed'; count: number };

// Core database entity types
export interface Checklist {
  id?: number;
  title: string;
  start_date: string; // ISO 8601 date string
  end_date: string; // ISO 8601 date string
  spare_days: number;
  tags: TripTag[];
  washing_machine_available: boolean;
  max_days_before_washing?: number;
  created_at: string; // ISO 8601 timestamp
  updated_at?: string; // ISO 8601 timestamp
}

export interface ChecklistItem {
  id?: number;
  checklist_id: number;
  name: string; // Copied from ItemTemplate at generation
  category_name: string; // Copied from Category at generation
  category_id: number;
  quantity: number;
  phase: PackPhase;
  checked: boolean;
  custom?: boolean; // Added directly to the checklist rather than generated from a template
  sort_order: number;
}

export interface ItemTemplate {
  id?: number;
  name: string;
  category_id: number;
  enabled: boolean;
  tags: TripTag[];
  quantity: QuantityRule;
  phase: PackPhase;
  sort_order: number;
}

export interface Category {
  id?: number;
  name: string;
  default_included: boolean;
  sort_order: number;
  icon?: string;
}

export interface Preference {
  id?: number; // Always 1 (singleton)
  buffer_days_ratio: number; // One spare day per this many trip days
  min_buffer_days: number; // Minimum spare days
  category_defaults: Record<number, boolean>;
  preferred_categories: number[];
  welcome_seen?: boolean; // First-visit flag
}

// Domain-specific types

export interface QuestionnaireInput {
  start_date: string;
  end_date: string;
  spare_days: number;
  tags: TripTag[];
  washing_machine_available: boolean;
  max_days_before_washing?: number;
  selected_categories: number[];
}

export interface ChecklistWithItems {
  checklist: Checklist;
  items: ChecklistItem[];
  categories: Category[];
}

export interface CategoryWithItems {
  category: Category;
  items: ItemTemplate[];
}

export interface CategorySummary {
  category_id: number;
  category_name: string;
  icon?: string;
  total_items: number;
  checked_items: number;
  percentage: number;
}

/** A self-contained copy of a checklist, used for share links. Categories are by name. */
export interface ChecklistSnapshot {
  title: string;
  start_date: string;
  end_date: string;
  tags: TripTag[];
  items: {
    name: string;
    category_name: string;
    quantity: number;
    phase: PackPhase;
    checked?: boolean;
  }[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
