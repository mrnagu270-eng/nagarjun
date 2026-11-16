export type FitnessGoal =
  | 'Lose Weight'
  | 'Build Muscle'
  | 'Maintain Fitness'
  | 'Improve Endurance';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Full Body';

export type DietCategory =
  | 'Protein'
  | 'Complex Carbs'
  | 'Healthy Fats'
  | 'Vegetables & Greens'
  | 'Fruits'
  | 'Dairy & Alternatives'
  | 'Hydration & Recovery';

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type ActivityType =
  | 'Strength Training'
  | 'Cardio'
  | 'Mobility & Recovery'
  | 'Weigh-In';

export type BmiCategory =
  | 'Underweight'
  | 'Normal weight'
  | 'Overweight'
  | 'Obesity';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  goal: FitnessGoal;
  daily_calorie_target: number;
  created_at: string;
}

export interface WorkoutItem {
  id: string;
  title: string;
  muscle_group: MuscleGroup;
  difficulty: DifficultyLevel;
  duration_min: number;
  calories_est: number;
  equipment: string;
  target_muscles: string;
  instructions: string[];
  is_custom: boolean;
}

export interface DietItem {
  id: string;
  name: string;
  category: DietCategory;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  description: string;
  is_custom: boolean;
}

export interface MealLogItem {
  id: string;
  uid: string;
  food_name: string;
  category: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_date: string;
  meal_slot: MealSlot;
}

export interface ProgressRecord {
  id: string;
  uid: string;
  recorded_date: string;
  weight_kg: number | null;
  activity_type: ActivityType;
  workout_title: string;
  duration_min: number;
  calories_burned: number;
  notes: string;
}

export interface DashboardSummary {
  user: UserProfile;
  bmi: BmiResult;
  weightStats: {
    currentKg: number;
    startingKg: number;
    deltaKg: number;
    targetKg: number;
    remainingKg: number;
  };
  workoutStats: {
    totalSessions: number;
    sessionsThisWeek: number;
    totalMinutes: number;
    totalCaloriesBurned: number;
    lastWorkoutTitle: string | null;
    lastWorkoutDate: string | null;
  };
  nutritionToday: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    entriesCount: number;
  };
  recentProgress: ProgressRecord[];
  recommendedWorkouts: WorkoutItem[];
}

export interface BmiResult {
  value: number;
  category: BmiCategory;
  healthyMinKg: number;
  healthyMaxKg: number;
  summary: string;
}

export function calculateBmi(heightCm: number, weightKg: number): BmiResult {
  const safeHeightCm = Math.max(50, Math.min(260, Number(heightCm) || 170));
  const safeWeightKg = Math.max(20, Math.min(350, Number(weightKg) || 70));
  const heightM = safeHeightCm / 100;
  const rawBmi = safeWeightKg / (heightM * heightM);
  const value = Math.round(rawBmi * 10) / 10;

  let category: BmiCategory = 'Normal weight';
  let summary =
    'Your body mass index falls within the standard healthy weight range for your height.';

  if (value < 18.5) {
    category = 'Underweight';
    summary =
      'Below the standard 18.5 threshold. Focus on nutrient-dense meals and progressive strength training.';
  } else if (value < 25) {
    category = 'Normal weight';
    summary =
      'Within the 18.5 to 24.9 healthy weight band. Maintain balanced nutrition and consistent activity.';
  } else if (value < 30) {
    category = 'Overweight';
    summary =
      'In the 25.0 to 29.9 band. A steady calorie deficit paired with regular resistance and cardio work supports reduction.';
  } else {
    category = 'Obesity';
    summary =
      'At or above 30.0. Prioritize sustainable daily movement, low-impact conditioning, and structured nutrition.';
  }

  const healthyMinKg = Math.round(18.5 * heightM * heightM * 10) / 10;
  const healthyMaxKg = Math.round(24.9 * heightM * heightM * 10) / 10;

  return {
    value,
    category,
    healthyMinKg,
    healthyMaxKg,
    summary,
  };
}
