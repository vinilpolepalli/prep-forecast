// SAMPLE / DEMO DATA ONLY. Invented for illustration; not from any real restaurant.

export type Ingredient = {
  id: string;
  name: string;
  unit: string; // purchase & recipe unit
  yieldPct: number; // usable fraction after trim/cook loss (0-1)
  onHand: number;
  par: number; // safety stock to hold at week end
  packSize: number; // order multiple
  shelfLifeDays: number;
  unitCost: number; // $ per unit
  perishable: boolean;
};

export type MenuItem = {
  id: string;
  name: string;
  mixShare: number; // share of items sold; sums to 1
  recipe: Record<string, number>; // ingredient id -> qty (net, usable) per portion
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DEFAULT_COVERS = [170, 160, 185, 210, 330, 390, 280];
export const ITEMS_PER_COVER = 1.3;

export const INGREDIENTS: Ingredient[] = [
  { id: "chicken", name: "Chicken thigh", unit: "lb", yieldPct: 0.82, onHand: 20, par: 15, packSize: 10, shelfLifeDays: 3, unitCost: 2.9, perishable: true },
  { id: "beef", name: "Ground beef", unit: "lb", yieldPct: 0.85, onHand: 12, par: 10, packSize: 10, shelfLifeDays: 3, unitCost: 5.4, perishable: true },
  { id: "tofu", name: "Firm tofu", unit: "lb", yieldPct: 0.95, onHand: 6, par: 5, packSize: 5, shelfLifeDays: 5, unitCost: 2.2, perishable: true },
  { id: "rice", name: "Jasmine rice", unit: "lb", yieldPct: 1, onHand: 40, par: 20, packSize: 25, shelfLifeDays: 365, unitCost: 0.8, perishable: false },
  { id: "tortilla", name: "Flour tortilla", unit: "each", yieldPct: 1, onHand: 120, par: 100, packSize: 100, shelfLifeDays: 14, unitCost: 0.18, perishable: false },
  { id: "lettuce", name: "Romaine", unit: "lb", yieldPct: 0.75, onHand: 8, par: 6, packSize: 5, shelfLifeDays: 4, unitCost: 1.9, perishable: true },
  { id: "tomato", name: "Roma tomato", unit: "lb", yieldPct: 0.9, onHand: 10, par: 6, packSize: 5, shelfLifeDays: 4, unitCost: 1.7, perishable: true },
  { id: "avocado", name: "Avocado", unit: "each", yieldPct: 0.7, onHand: 30, par: 24, packSize: 24, shelfLifeDays: 3, unitCost: 1.05, perishable: true },
  { id: "cheese", name: "Shredded cheese", unit: "lb", yieldPct: 1, onHand: 8, par: 6, packSize: 5, shelfLifeDays: 21, unitCost: 4.1, perishable: false },
  { id: "beans", name: "Black beans (dry)", unit: "lb", yieldPct: 1, onHand: 15, par: 8, packSize: 10, shelfLifeDays: 365, unitCost: 1.3, perishable: false },
  { id: "onion", name: "Yellow onion", unit: "lb", yieldPct: 0.88, onHand: 14, par: 8, packSize: 10, shelfLifeDays: 14, unitCost: 0.9, perishable: false },
  { id: "lime", name: "Lime", unit: "each", yieldPct: 0.9, onHand: 60, par: 40, packSize: 50, shelfLifeDays: 10, unitCost: 0.2, perishable: false },
  { id: "cilantro", name: "Cilantro", unit: "bunch", yieldPct: 0.7, onHand: 5, par: 4, packSize: 6, shelfLifeDays: 3, unitCost: 1.1, perishable: true },
  { id: "salsa", name: "Salsa base (house)", unit: "qt", yieldPct: 1, onHand: 6, par: 4, packSize: 4, shelfLifeDays: 5, unitCost: 3.2, perishable: true },
  { id: "bun", name: "Brioche bun", unit: "each", yieldPct: 1, onHand: 60, par: 40, packSize: 48, shelfLifeDays: 4, unitCost: 0.45, perishable: true },
];

export const MENU: MenuItem[] = [
  { id: "chicken-bowl", name: "Chicken Rice Bowl", mixShare: 0.2, recipe: { chicken: 0.4, rice: 0.35, beans: 0.1, salsa: 0.06, cilantro: 0.04, lime: 0.25 } },
  { id: "beef-bowl", name: "Beef Rice Bowl", mixShare: 0.12, recipe: { beef: 0.38, rice: 0.35, beans: 0.1, cheese: 0.06, onion: 0.08 } },
  { id: "tofu-bowl", name: "Tofu Rice Bowl", mixShare: 0.07, recipe: { tofu: 0.35, rice: 0.35, tomato: 0.1, cilantro: 0.04, lime: 0.25 } },
  { id: "chicken-burrito", name: "Chicken Burrito", mixShare: 0.15, recipe: { chicken: 0.35, tortilla: 1, rice: 0.25, beans: 0.1, cheese: 0.08, salsa: 0.05 } },
  { id: "beef-burrito", name: "Beef Burrito", mixShare: 0.08, recipe: { beef: 0.33, tortilla: 1, rice: 0.25, cheese: 0.08, onion: 0.06 } },
  { id: "veggie-taco", name: "Veggie Tacos (2)", mixShare: 0.08, recipe: { tortilla: 2, beans: 0.12, avocado: 0.5, tomato: 0.1, lettuce: 0.05, lime: 0.25 } },
  { id: "chicken-taco", name: "Chicken Tacos (2)", mixShare: 0.1, recipe: { tortilla: 2, chicken: 0.28, onion: 0.05, cilantro: 0.04, salsa: 0.05, lime: 0.25 } },
  { id: "burger", name: "Smash Burger", mixShare: 0.1, recipe: { beef: 0.3, bun: 1, cheese: 0.05, lettuce: 0.06, tomato: 0.08, onion: 0.04 } },
  { id: "salad", name: "Chicken Caesar-ish Salad", mixShare: 0.06, recipe: { chicken: 0.3, lettuce: 0.35, cheese: 0.03, tomato: 0.08 } },
  { id: "guac", name: "Guac & Chips", mixShare: 0.04, recipe: { avocado: 1.5, lime: 0.5, onion: 0.03, cilantro: 0.03, tomato: 0.05 } },
];
