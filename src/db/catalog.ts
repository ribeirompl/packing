import type { PackPhase, QuantityRule, TripTag } from '@/types';

/**
 * Default categories and item templates. Seeded on first run and merged (by name) into
 * existing databases when CATALOG_VERSION increases.
 */
export const CATALOG_VERSION = 2;

export interface CatalogItem {
  name: string;
  quantity: QuantityRule;
  tags?: TripTag[];
  phase?: PackPhase;
  enabled?: boolean;
}

export interface CatalogCategory {
  name: string;
  icon: string;
  default_included: boolean;
  items: CatalogItem[];
}

const perDay: QuantityRule = { kind: 'per_day', rate: 1, spare: true };
const one: QuantityRule = { kind: 'fixed', count: 1 };
const fixed = (count: number): QuantityRule => ({ kind: 'fixed', count });
const everyNDays = (n: number, min?: number, max?: number): QuantityRule => ({
  kind: 'per_n_days',
  n,
  ...(min !== undefined && { min }),
  ...(max !== undefined && { max }),
});

export const DEFAULT_CATALOG: CatalogCategory[] = [
  {
    name: 'Clothes',
    icon: 'shirt',
    default_included: true,
    items: [
      { name: 'Underwear', quantity: perDay },
      { name: 'Socks', quantity: perDay },
      { name: 'T-shirts/tops', quantity: perDay },
      { name: 'Pants/trousers', quantity: everyNDays(3, 1, 3) },
      { name: 'Shorts', quantity: everyNDays(3, 1, 3), tags: ['hot', 'beach'] },
      { name: 'Sleepwear', quantity: everyNDays(4, 1, 2) },
      { name: 'Sweater/hoodie', quantity: one },
      { name: 'Light jacket', quantity: one },
      { name: 'Walking shoes', quantity: one },
      { name: 'Sandals/flip-flops', quantity: one, tags: ['hot', 'beach'] },
      { name: 'Swimsuit', quantity: fixed(2), tags: ['beach'] },
      { name: 'Formal outfit (suit/dress)', quantity: one, tags: ['formal'] },
      { name: 'Dress shirts/blouses', quantity: everyNDays(2, 1, 3), tags: ['formal'] },
      { name: 'Dress shoes', quantity: one, tags: ['formal'] },
      { name: 'Thermal base layers', quantity: everyNDays(3, 1, 3), tags: ['cold'] },
      { name: 'Warm coat', quantity: one, tags: ['cold'] },
      { name: 'Rain jacket', quantity: one, tags: ['rain'] },
      { name: 'Waterproof shoes', quantity: one, tags: ['rain'] },
      { name: 'Hiking boots', quantity: one, tags: ['hiking'] },
      { name: 'Hiking socks', quantity: everyNDays(2, 2, 4), tags: ['hiking'] },
      { name: 'Change of clothes in carry-on', quantity: one, tags: ['flying'] },
      {
        name: "Kids' outfits",
        quantity: { kind: 'per_day', rate: 1, spare: true, min: 3 },
        tags: ['kids'],
      },
      { name: "Kids' sleepwear", quantity: everyNDays(2, 2, 4), tags: ['kids'] },
    ],
  },
  {
    name: 'Toiletries',
    icon: 'droplet',
    default_included: true,
    items: [
      { name: 'Toothbrush', quantity: one, phase: 'last_minute' },
      { name: 'Toothpaste', quantity: one, phase: 'last_minute' },
      { name: 'Deodorant', quantity: one },
      { name: 'Shampoo', quantity: one },
      { name: 'Soap/body wash', quantity: one },
      { name: 'Razor', quantity: one },
      { name: 'Hairbrush/comb', quantity: one },
      { name: 'Clear liquids bag (100 ml bottles)', quantity: one, tags: ['flying'] },
      { name: 'Lip balm', quantity: one, tags: ['cold', 'hot'] },
      { name: 'Moisturiser', quantity: one, tags: ['cold'] },
    ],
  },
  {
    name: 'Electronics',
    icon: 'laptop',
    default_included: true,
    items: [
      { name: 'Phone', quantity: one, phase: 'last_minute' },
      { name: 'Phone charger', quantity: one, phase: 'last_minute' },
      { name: 'Headphones', quantity: one },
      { name: 'Power bank (carry-on only)', quantity: one },
      { name: 'Plug adapter', quantity: one, tags: ['international'] },
      { name: 'eSIM/roaming set up', quantity: one, tags: ['international'] },
      { name: 'Laptop', quantity: one, tags: ['work'] },
      { name: 'Laptop charger', quantity: one, tags: ['work'] },
      { name: 'Mouse', quantity: one, tags: ['work'] },
      { name: 'USB-C/HDMI adapter', quantity: one, tags: ['work'] },
      { name: 'Car phone mount & charger', quantity: one, tags: ['road_trip'] },
      { name: 'Offline maps downloaded', quantity: one, tags: ['road_trip', 'hiking'] },
      { name: 'Headlamp/torch', quantity: one, tags: ['hiking'] },
      { name: 'Waterproof phone pouch', quantity: one, tags: ['beach'] },
      { name: 'Camera', quantity: one, enabled: false },
    ],
  },
  {
    name: 'Documents',
    icon: 'file',
    default_included: true,
    items: [
      { name: 'Wallet', quantity: one, phase: 'last_minute' },
      { name: 'Keys', quantity: one, phase: 'last_minute' },
      { name: 'ID card', quantity: one },
      { name: 'Credit/debit cards', quantity: one },
      { name: 'Travel tickets/booking confirmations', quantity: one },
      { name: 'Boarding pass', quantity: one, tags: ['flying'] },
      { name: 'Passport (valid 6+ months)', quantity: one, tags: ['international'] },
      { name: 'Visa/entry documents', quantity: one, tags: ['international'] },
      { name: 'Copies of passport & insurance', quantity: one, tags: ['international'] },
      { name: 'Travel insurance details', quantity: one, tags: ['international'] },
      { name: 'Local currency', quantity: one, tags: ['international'] },
      { name: "Driver's licence", quantity: one, tags: ['road_trip'] },
      { name: 'Car registration & insurance', quantity: one, tags: ['road_trip'] },
      { name: 'Work badge', quantity: one, tags: ['work'] },
      { name: 'Business cards', quantity: one, tags: ['formal'] },
    ],
  },
  {
    name: 'Accessories',
    icon: 'watch',
    default_included: true,
    items: [
      { name: 'Sunglasses', quantity: one, tags: ['hot', 'beach', 'road_trip'] },
      { name: 'Sun hat/cap', quantity: one, tags: ['hot', 'beach'] },
      { name: 'Belt', quantity: one },
      { name: 'Reusable water bottle', quantity: one },
      { name: 'Earplugs & eye mask', quantity: one, tags: ['flying'] },
      { name: 'Neck pillow', quantity: one, tags: ['flying'] },
      { name: 'Compact umbrella', quantity: one, tags: ['rain'] },
      { name: 'Beanie', quantity: one, tags: ['cold'] },
      { name: 'Gloves', quantity: one, tags: ['cold'] },
      { name: 'Scarf', quantity: one, tags: ['cold'] },
      { name: 'Beach towel', quantity: one, tags: ['beach'] },
      { name: 'Daypack', quantity: one, tags: ['hiking'] },
      { name: 'Dry bag/zip-lock bags', quantity: one, tags: ['rain', 'hiking', 'beach'] },
      { name: 'Laundry kit (detergent, line)', quantity: one, tags: ['laundry'] },
      { name: 'Notebook & pen', quantity: one, tags: ['work'] },
      { name: 'Stroller/carrier', quantity: one, tags: ['kids'] },
      { name: 'Car seat', quantity: one, tags: ['kids'] },
      { name: 'Watch', quantity: one, enabled: false },
    ],
  },
  {
    name: 'Health & Safety',
    icon: 'heart',
    default_included: true,
    items: [
      { name: 'Prescription medications', quantity: one, phase: 'last_minute' },
      { name: 'Glasses/contact lenses', quantity: one, phase: 'last_minute' },
      { name: 'Painkillers & plasters', quantity: one },
      { name: 'Hand sanitiser', quantity: one },
      { name: 'Sunscreen', quantity: one, tags: ['hot', 'beach', 'hiking'] },
      { name: 'After-sun', quantity: one, tags: ['beach'] },
      { name: 'Insect repellent', quantity: one, tags: ['hot', 'hiking'] },
      { name: 'Blister plasters', quantity: one, tags: ['hiking'] },
      { name: 'Snacks', quantity: one, tags: ['road_trip', 'hiking', 'kids'] },
      { name: 'Wet wipes', quantity: one, tags: ['kids', 'road_trip'] },
      { name: 'Diapers', quantity: { kind: 'per_day', rate: 6, spare: true }, tags: ['kids'] },
      { name: "Kids' medicine & thermometer", quantity: one, tags: ['kids'] },
    ],
  },
  {
    name: 'Entertainment',
    icon: 'book',
    default_included: true,
    items: [
      { name: 'Book/e-reader', quantity: one },
      { name: 'Downloaded shows/podcasts', quantity: one, tags: ['flying', 'road_trip'] },
      { name: 'Toys/tablet for kids', quantity: one, tags: ['kids'] },
    ],
  },
  {
    name: 'Leaving the House',
    icon: 'home',
    default_included: true,
    items: [
      { name: 'Charge devices the night before', quantity: one, phase: 'leaving' },
      { name: 'Check in online', quantity: one, phase: 'leaving', tags: ['flying'] },
      { name: 'Tell bank about travel', quantity: one, phase: 'leaving', tags: ['international'] },
      { name: 'Arrange mail/package hold', quantity: one, phase: 'leaving' },
      { name: 'Arrange pet care', quantity: one, phase: 'leaving', enabled: false },
      { name: 'Water plants', quantity: one, phase: 'leaving' },
      { name: 'Empty fridge of perishables', quantity: one, phase: 'leaving' },
      { name: 'Empty/run dishwasher', quantity: one, phase: 'leaving' },
      { name: 'Take out all trash', quantity: one, phase: 'leaving' },
      { name: 'Set thermostat/heating', quantity: one, phase: 'leaving' },
      { name: 'Turn off water heater', quantity: one, phase: 'leaving' },
      { name: 'Unplug appliances', quantity: one, phase: 'leaving' },
      { name: 'Lock doors & windows', quantity: one, phase: 'leaving' },
    ],
  },
];

/** Case-insensitive lookup of a catalog item by name */
export function findCatalogItem(name: string): CatalogItem | undefined {
  const key = name.trim().toLowerCase();
  for (const category of DEFAULT_CATALOG) {
    const item = category.items.find((i) => i.name.toLowerCase() === key);
    if (item) return item;
  }
  return undefined;
}
