/**
 * Shared TypeScript types for Packing Checklist PWA
 *
 * Re-exports types from data model for use across services and components
 */

// Re-export database types (these would be imported from src/db/schema.ts in actual implementation)
export interface Checklist {
  id?: number; // Always 1 (singleton pattern)
  start_date: string;
  end_date: string;
  buffer_days: number; // Additional days to pack for beyond trip duration
  formal_attire: boolean;
  swimming: boolean;
  hot_weather: boolean;
  washing_machine_available: boolean;
  max_days_before_washing?: number;
  created_at: string;
}

export interface ChecklistItem {
  id?: number;
  checklist_id: number;
  name: string; // Copied from ItemTemplate at generation
  category_name: string; // Copied from Category at generation (for display if category deleted)
  category_id: number; // Reference to original category
  quantity: number;
  day?: number;
  checked: boolean;
}

export interface ItemTemplate {
  id?: number;
  name: string;
  category_id: number;
  enabled: boolean; // Whether item is included by default in generation (managed in settings)
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
  id?: number;
  buffer_days_ratio: number; // 1 buffer day per N trip days (e.g., 7 means 1 buffer day per week)
  min_buffer_days: number; // Minimum buffer days regardless of trip length (default: 1)
  category_defaults: Record<number, boolean>;
  preferred_categories: number[];
}

// Domain-specific types for services

/**
 * Questionnaire input data from user
 */
export interface QuestionnaireInput {
  start_date: string; // ISO 8601 date (filled first)
  end_date: string; // ISO 8601 date (filled first)
  buffer_days: number; // Auto-calculated from preferences, user can override
  formal_attire: boolean;
  swimming: boolean;
  hot_weather: boolean;
  washing_machine_available: boolean;
  max_days_before_washing?: number;
  selected_categories: number[]; // Category IDs to include in checklist
}

/**
 * Checklist with items (joined data for display)
 */
export interface ChecklistWithItems {
  checklist: Checklist;
  items: ChecklistItem[]; // Generated instances, immutable after creation
  categories: Category[];
}

/**
 * Category with items (for settings management)
 */
export interface CategoryWithItems {
  category: Category;
  items: ItemTemplate[]; // Editable templates in settings
}

/**
 * Per-day item breakdown for display
 */
export interface DayBreakdown {
  day: number; // 1-indexed day number
  date: string; // ISO 8601 date
  items: {
    category_id: number;
    category_name: string;
    items: Array<{
      name: string;
      quantity: number;
      checked: boolean;
    }>;
  }[];
}

/**
 * Category summary for checklist overview
 */
export interface CategorySummary {
  category_id: number;
  category_name: string;
  total_items: number;
  checked_items: number;
  percentage: number; // 0-100
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Service operation result
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
