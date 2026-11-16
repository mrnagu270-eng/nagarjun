import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import {
  addMealLog,
  createCustomDietItem,
  deleteMealLog,
  listDietItems,
  listMealLogs,
} from '../lib/firestoreService';
import type { DietCategory, DietItem, MealLogItem, MealSlot, UserProfile } from '../types';

interface DietNutritionViewProps {
  user: UserProfile;
  onMealsChanged: () => void;
}

const CATEGORIES: Array<'All' | DietCategory> = [
  'All',
  'Protein',
  'Complex Carbs',
  'Healthy Fats',
  'Vegetables & Greens',
  'Fruits',
  'Dairy & Alternatives',
  'Hydration & Recovery',
];

const MEAL_SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export function DietNutritionView({ user, onMealsChanged }: DietNutritionViewProps) {
  const [items, setItems] = useState<DietItem[]>([]);
  const [meals, setMeals] = useState<MealLogItem[]>([]);
  const [category, setCategory] = useState<'All' | DietCategory>('All');
  const [search, setSearch] = useState('');
  const [activeSlot, setActiveSlot] = useState<MealSlot>('Lunch');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddFood, setShowAddFood] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState<DietCategory>('Protein');
  const [servingSize, setServingSize] = useState('100g');
  const [calories, setCalories] = useState('180');
  const [protein, setProtein] = useState('22');
  const [carbs, setCarbs] = useState('4');
  const [fat, setFat] = useState('6');
  const [fiber, setFiber] = useState('1');
  const [description, setDescription] = useState('');
  const [savingFood, setSavingFood] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function loadDietData() {
    setLoading(true);
    setError(null);
    try {
      const [dietList, mealList] = await Promise.all([
        listDietItems(user.uid, { category, q: search }),
        listMealLogs(user.uid, today),
      ]);
      setItems(dietList);
      setMeals(mealList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load nutrition database.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDietData();
  }, [user.uid, category, search]);

  async function handleLogFood(item: DietItem) {
    setError(null);
    try {
      await addMealLog(user.uid, {
        food_name: item.name,
        category: item.category,
        servings: 1,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        logged_date: today,
        meal_slot: activeSlot,
      });
      const updatedMeals = await listMealLogs(user.uid, today);
      setMeals(updatedMeals);
      onMealsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log meal item.');
    }
  }

  async function handleRemoveMeal(id: string) {
    try {
      await deleteMealLog(user.uid, id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
      onMealsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove meal entry.');
    }
  }

  async function handleCreateFood(e: FormEvent) {
    e.preventDefault();
    setSavingFood(true);
    try {
      await createCustomDietItem(user.uid, {
        name: foodName,
        category: foodCategory,
        serving_size: servingSize,
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
        fiber_g: Number(fiber) || 0,
        description: description || 'Custom food entry.',
      });
      setShowAddFood(false);
      setFoodName('');
      setDescription('');
      await loadDietData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save food item.');
    } finally {
      setSavingFood(false);
    }
  }

  const totalCalories = meals.reduce((sum, m) => sum + Number(m.calories), 0);
  const totalProtein = Math.round(meals.reduce((sum, m) => sum + Number(m.protein_g), 0) * 10) / 10;
  const totalCarbs = Math.round(meals.reduce((sum, m) => sum + Number(m.carbs_g), 0) * 10) / 10;
  const totalFat = Math.round(meals.reduce((sum, m) => sum + Number(m.fat_g), 0) * 10) / 10;
  const calPct = Math.min(
    100,
    Math.round((totalCalories / Math.max(1, user.daily_calorie_target)) * 100)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Daily Nutrition Log
              </h2>
              <p className="font-mono text-xs text-slate-500 tabular-nums">{today}</p>
            </div>
            <span className="font-mono text-xs font-semibold text-teal-700 tabular-nums">
              {totalCalories} / {user.daily_calorie_target} kcal
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-700 transition-all"
              style={{ width: `${calPct}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 pb-3 text-center">
            <div>
              <div className="text-[11px] text-slate-500">Protein</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {totalProtein} g
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Carbs</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {totalCarbs} g
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Fat</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {totalFat} g
              </div>
            </div>
          </div>

          <div className="mt-3">
            {meals.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">
                No foods logged today. Add a serving from the nutrition directory.
              </p>
            ) : (
              <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{meal.food_name}</div>
                      <div className="text-slate-500">
                        {meal.meal_slot} · {meal.protein_g}g P · {meal.carbs_g}g C · {meal.fat_g}g F
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-medium text-slate-900 tabular-nums">
                        {meal.calories} kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMeal(meal.id)}
                        aria-label={`Remove ${meal.food_name}`}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Food &amp; Nutrition Reference
              </h2>
              <p className="text-xs text-slate-500">
                Browse categories and macronutrient profiles per serving
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="meal-slot-select" className="text-xs text-slate-500">
                Log to:
              </label>
              <select
                id="meal-slot-select"
                value={activeSlot}
                onChange={(e) => setActiveSlot(e.target.value as MealSlot)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-none"
              >
                {MEAL_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddFood(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Food</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search food name or nutritional benefit..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-4 space-y-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">No foods found</p>
              <p className="mt-1 text-xs text-slate-500">
                Try another category or add a custom food item.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-3 font-medium">Food &amp; Notes</th>
                    <th className="py-2.5 pr-3 font-medium whitespace-nowrap">Serving</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Kcal</th>
                    <th className="py-2.5 pr-3 text-right font-medium">P / C / F (g)</th>
                    <th className="py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-slate-50/70">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {item.category} · Fiber {item.fiber_g}g
                        </div>
                        <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-600">
                          {item.description}
                        </p>
                      </td>
                      <td className="py-3 pr-3 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {item.serving_size}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {item.calories}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {item.protein_g} / {item.carbs_g} / {item.fat_g}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleLogFood(item)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-50"
                        >
                          + Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showAddFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Add Custom Food Item
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFood(false)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700">Food Name</label>
                <input
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. Turkey Meatballs"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Category</label>
                  <select
                    value={foodCategory}
                    onChange={(e) => setFoodCategory(e.target.value as DietCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Serving Size</label>
                  <input
                    type="text"
                    required
                    value={servingSize}
                    onChange={(e) => setServingSize(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700">Kcal</label>
                  <input
                    type="number"
                    min={0}
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700">Prot (g)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700">Carb (g)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700">Fat (g)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700">Fiber (g)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs tabular-nums focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Nutrition Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key nutrients or meal pairing notes..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFood(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFood}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {savingFood ? 'Saving...' : 'Save Food'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
