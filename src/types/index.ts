/**
 * Shared TypeScript types for Packing Checklist PWA
 *
 * Re-exports types from contracts for use across services and components
 */

// Core database entity types
export interface Checklist {
  id?: number;
  title: string;
  start_date: string; // ISO 8601 date string
  end_date: string; // ISO 8601 date string
  buffer_days: number;
  formal_attire: boolean;
  swimming: boolean;
  hot_weather: boolean;
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
  day?: number; // Optional: 1-indexed day number
  checked: boolean;
}

export interface ItemTemplate {
  id?: number;
  name: string;
  category_id: number;
  enabled: boolean;
}

export interface Category {
  id?: number;
  name: string;
  type: 'daily' | 'singular';
  default_included: boolean;
  sort_order: number;
  icon?: string;
}

export interface Preference {
  id?: number; // Always 1 (singleton)
  buffer_days_ratio: number;
  min_buffer_days: number;
  category_defaults: Record<number, boolean>;
  preferred_categories: number[];
  welcome_seen?: boolean; // First-visit flag
}

// Domain-specific types

export interface QuestionnaireInput {
  start_date: string;
  end_date: string;
  buffer_days: number;
  formal_attire: boolean;
  swimming: boolean;
  hot_weather: boolean;
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

export interface DayBreakdown {
  day: number;
  date: string;
  dayLabel: string;
  items: ChecklistItem[];
  categories: {
    category_id: number;
    category_name: string;
    items: ChecklistItem[];
  }[];
}

export interface CategorySummary {
  category_id: number;
  category_name: string;
  icon?: string;
  total_items: number;
  checked_items: number;
  percentage: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
