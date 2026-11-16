import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { BUILTIN_DIET_ITEMS, BUILTIN_WORKOUTS } from '../data/catalog';
import {
  calculateBmi,
  type ActivityType,
  type DashboardSummary,
  type DietCategory,
  type DietItem,
  type DifficultyLevel,
  type FitnessGoal,
  type MealLogItem,
  type MealSlot,
  type MuscleGroup,
  type ProgressRecord,
  type UserProfile,
  type WorkoutItem,
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';

function clampNumber(val: number, min: number, max: number): number {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function clampString(val: string, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function formatCreatedAt(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export async function fetchUserProfile(
  uid: string,
  fallbackEmail: string,
  photoUrl?: string | null
): Promise<UserProfile | null> {
  const userPath = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();

    let email = fallbackEmail;
    try {
      const privateSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
      if (privateSnap.exists() && typeof privateSnap.data().email === 'string') {
        email = privateSnap.data().email;
      }
    } catch {
      // Keep Auth email if private info doc isn't read
    }

    return {
      uid,
      name: String(data.name || 'Athlete'),
      email,
      photoUrl: photoUrl ?? null,
      age: Number(data.age || 28),
      height_cm: Number(data.heightCm || 172),
      weight_kg: Number(data.weightKg || 70),
      target_weight_kg: Number(data.targetWeightKg || 70),
      goal: (data.goal as FitnessGoal) || 'Maintain Fitness',
      daily_calorie_target: Number(data.dailyCalorieTarget || 2200),
      created_at: formatCreatedAt(data.createdAt),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }
}

export async function createUserProfile(input: {
  uid: string;
  email: string;
  photoUrl?: string | null;
  name: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  goal: FitnessGoal;
}): Promise<UserProfile> {
  const userPath = `users/${input.uid}`;
  const cleanName = clampString(input.name, 80) || 'Athlete';
  const cleanEmail = clampString(input.email, 160) || 'user@formline.app';
  const age = Math.round(clampNumber(input.age, 13, 110));
  const heightCm = Math.round(clampNumber(input.height_cm, 100, 250) * 10) / 10;
  const weightKg = Math.round(clampNumber(input.weight_kg, 25, 320) * 10) / 10;
  const targetWeightKg = Math.round(clampNumber(input.target_weight_kg, 25, 320) * 10) / 10;
  const dailyCalorieTarget =
    input.goal === 'Lose Weight' ? 1950 : input.goal === 'Build Muscle' ? 2650 : 2250;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', input.uid);
    const privateRef = doc(db, 'users', input.uid, 'private', 'info');
    const baselineRef = doc(collection(db, 'users', input.uid, 'progressRecords'));

    batch.set(userRef, {
      uid: input.uid,
      name: cleanName,
      age,
      heightCm,
      weightKg,
      targetWeightKg,
      goal: input.goal,
      dailyCalorieTarget,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(privateRef, {
      uid: input.uid,
      email: cleanEmail,
      updatedAt: serverTimestamp(),
    });

    batch.set(baselineRef, {
      uid: input.uid,
      recordedDate: today,
      weightKg,
      activityType: 'Weigh-In',
      workoutTitle: 'Account Baseline',
      durationMin: 0,
      caloriesBurned: 0,
      notes: 'Initial profile weight recorded at account setup.',
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      uid: input.uid,
      name: cleanName,
      email: cleanEmail,
      photoUrl: input.photoUrl ?? null,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      target_weight_kg: targetWeightKg,
      goal: input.goal,
      daily_calorie_target: dailyCalorieTarget,
      created_at: today,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

export async function updateUserProfile(
  uid: string,
  email: string,
  photoUrl: string | null | undefined,
  createdAt: string,
  payload: {
    name: string;
    age: number;
    height_cm: number;
    weight_kg: number;
    target_weight_kg: number;
    goal: FitnessGoal;
    daily_calorie_target: number;
  }
): Promise<UserProfile> {
  const userPath = `users/${uid}`;
  const cleanName = clampString(payload.name, 80) || 'Athlete';
  const age = Math.round(clampNumber(payload.age, 13, 110));
  const heightCm = Math.round(clampNumber(payload.height_cm, 100, 250) * 10) / 10;
  const weightKg = Math.round(clampNumber(payload.weight_kg, 25, 320) * 10) / 10;
  const targetWeightKg = Math.round(clampNumber(payload.target_weight_kg, 25, 320) * 10) / 10;
  const dailyCalorieTarget = Math.round(clampNumber(payload.daily_calorie_target, 1000, 6000));

  try {
    await updateDoc(doc(db, 'users', uid), {
      name: cleanName,
      age,
      heightCm,
      weightKg,
      targetWeightKg,
      goal: payload.goal,
      dailyCalorieTarget,
      updatedAt: serverTimestamp(),
    });

    return {
      uid,
      name: cleanName,
      email,
      photoUrl: photoUrl ?? null,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      target_weight_kg: targetWeightKg,
      goal: payload.goal,
      daily_calorie_target: dailyCalorieTarget,
      created_at: createdAt,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

export async function listWorkouts(
  uid: string,
  filters?: { muscle_group?: string; difficulty?: string; q?: string }
): Promise<WorkoutItem[]> {
  const colPath = `users/${uid}/customWorkouts`;
  let customWorkouts: WorkoutItem[] = [];

  try {
    const q = query(collection(db, 'users', uid, 'customWorkouts'), where('uid', '==', uid));
    const snap = await getDocs(q);
    customWorkouts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: String(data.title),
        muscle_group: data.muscleGroup as MuscleGroup,
        difficulty: data.difficulty as DifficultyLevel,
        duration_min: Number(data.durationMin),
        calories_est: Number(data.caloriesEst),
        equipment: String(data.equipment),
        target_muscles: String(data.targetMuscles),
        instructions: Array.isArray(data.instructions) ? data.instructions.map(String) : [],
        is_custom: true,
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }

  let combined = [...customWorkouts, ...BUILTIN_WORKOUTS];
  if (filters?.muscle_group && filters.muscle_group !== 'All') {
    combined = combined.filter((w) => w.muscle_group === filters.muscle_group);
  }
  if (filters?.difficulty && filters.difficulty !== 'All') {
    combined = combined.filter((w) => w.difficulty === filters.difficulty);
  }
  if (filters?.q && filters.q.trim()) {
    const term = filters.q.trim().toLowerCase();
    combined = combined.filter(
      (w) =>
        w.title.toLowerCase().includes(term) ||
        w.target_muscles.toLowerCase().includes(term) ||
        w.equipment.toLowerCase().includes(term)
    );
  }

  return combined;
}

export async function createCustomWorkout(
  uid: string,
  payload: {
    title: string;
    muscle_group: MuscleGroup;
    difficulty: DifficultyLevel;
    duration_min: number;
    calories_est: number;
    equipment: string;
    target_muscles: string;
    instructions: string[];
  }
): Promise<WorkoutItem> {
  const colPath = `users/${uid}/customWorkouts`;
  const cleanSteps = payload.instructions
    .map((s) => clampString(s, 400))
    .filter(Boolean)
    .slice(0, 20);
  if (cleanSteps.length === 0) {
    cleanSteps.push('Complete warm-up sets first, then perform working sets with controlled form.');
  }

  const docData = {
    uid,
    title: clampString(payload.title, 120) || 'Custom Routine',
    muscleGroup: payload.muscle_group,
    difficulty: payload.difficulty,
    durationMin: Math.round(clampNumber(payload.duration_min, 5, 300)),
    caloriesEst: Math.round(clampNumber(payload.calories_est, 10, 3000)),
    equipment: clampString(payload.equipment, 100) || 'Bodyweight',
    targetMuscles: clampString(payload.target_muscles, 160) || payload.muscle_group,
    instructions: cleanSteps,
    createdAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'customWorkouts'), docData);
    return {
      id: ref.id,
      title: docData.title,
      muscle_group: docData.muscleGroup,
      difficulty: docData.difficulty,
      duration_min: docData.durationMin,
      calories_est: docData.caloriesEst,
      equipment: docData.equipment,
      target_muscles: docData.targetMuscles,
      instructions: docData.instructions,
      is_custom: true,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, colPath);
  }
}

export async function deleteCustomWorkout(uid: string, workoutId: string): Promise<void> {
  const docPath = `users/${uid}/customWorkouts/${workoutId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'customWorkouts', workoutId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export async function listDietItems(
  uid: string,
  filters?: { category?: string; q?: string }
): Promise<DietItem[]> {
  const colPath = `users/${uid}/customDietItems`;
  let customItems: DietItem[] = [];

  try {
    const q = query(collection(db, 'users', uid, 'customDietItems'), where('uid', '==', uid));
    const snap = await getDocs(q);
    customItems = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name),
        category: data.category as DietCategory,
        serving_size: String(data.servingSize),
        calories: Number(data.calories),
        protein_g: Number(data.proteinG),
        carbs_g: Number(data.carbsG),
        fat_g: Number(data.fatG),
        fiber_g: Number(data.fiberG),
        description: String(data.description),
        is_custom: true,
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }

  let combined = [...customItems, ...BUILTIN_DIET_ITEMS];
  if (filters?.category && filters.category !== 'All') {
    combined = combined.filter((item) => item.category === filters.category);
  }
  if (filters?.q && filters.q.trim()) {
    const term = filters.q.trim().toLowerCase();
    combined = combined.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
  }

  return combined;
}

export async function createCustomDietItem(
  uid: string,
  payload: {
    name: string;
    category: DietCategory;
    serving_size: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    description: string;
  }
): Promise<DietItem> {
  const colPath = `users/${uid}/customDietItems`;
  const docData = {
    uid,
    name: clampString(payload.name, 120) || 'Custom Food',
    category: payload.category,
    servingSize: clampString(payload.serving_size, 80) || '100g',
    calories: Math.round(clampNumber(payload.calories, 0, 5000)),
    proteinG: Math.round(clampNumber(payload.protein_g, 0, 500) * 10) / 10,
    carbsG: Math.round(clampNumber(payload.carbs_g, 0, 1000) * 10) / 10,
    fatG: Math.round(clampNumber(payload.fat_g, 0, 500) * 10) / 10,
    fiberG: Math.round(clampNumber(payload.fiber_g, 0, 200) * 10) / 10,
    description: clampString(payload.description, 400) || 'Custom nutrition entry.',
    createdAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'customDietItems'), docData);
    return {
      id: ref.id,
      name: docData.name,
      category: docData.category,
      serving_size: docData.servingSize,
      calories: docData.calories,
      protein_g: docData.proteinG,
      carbs_g: docData.carbsG,
      fat_g: docData.fatG,
      fiber_g: docData.fiberG,
      description: docData.description,
      is_custom: true,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, colPath);
  }
}

export async function listMealLogs(uid: string, date: string): Promise<MealLogItem[]> {
  const colPath = `users/${uid}/mealLogs`;
  try {
    const q = query(
      collection(db, 'users', uid, 'mealLogs'),
      where('uid', '==', uid),
      where('loggedDate', '==', date)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid,
        food_name: String(data.foodName),
        category: String(data.category),
        servings: Number(data.servings),
        calories: Number(data.calories),
        protein_g: Number(data.proteinG),
        carbs_g: Number(data.carbsG),
        fat_g: Number(data.fatG),
        logged_date: String(data.loggedDate),
        meal_slot: data.mealSlot as MealSlot,
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }
}

export async function addMealLog(
  uid: string,
  payload: {
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
): Promise<MealLogItem> {
  const colPath = `users/${uid}/mealLogs`;
  const servings = Math.round(clampNumber(payload.servings, 0.25, 20) * 100) / 100;
  const docData = {
    uid,
    foodName: clampString(payload.food_name, 120),
    category: clampString(payload.category, 60) || 'Protein',
    servings,
    calories: Math.round(clampNumber(payload.calories * servings, 0, 5000)),
    proteinG: Math.round(clampNumber(payload.protein_g * servings, 0, 500) * 10) / 10,
    carbsG: Math.round(clampNumber(payload.carbs_g * servings, 0, 1000) * 10) / 10,
    fatG: Math.round(clampNumber(payload.fat_g * servings, 0, 500) * 10) / 10,
    loggedDate: /^\d{4}-\d{2}-\d{2}$/.test(payload.logged_date)
      ? payload.logged_date
      : new Date().toISOString().slice(0, 10),
    mealSlot: payload.meal_slot,
    createdAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'mealLogs'), docData);
    return {
      id: ref.id,
      uid,
      food_name: docData.foodName,
      category: docData.category,
      servings: docData.servings,
      calories: docData.calories,
      protein_g: docData.proteinG,
      carbs_g: docData.carbsG,
      fat_g: docData.fatG,
      logged_date: docData.loggedDate,
      meal_slot: docData.mealSlot,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, colPath);
  }
}

export async function deleteMealLog(uid: string, mealId: string): Promise<void> {
  const docPath = `users/${uid}/mealLogs/${mealId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'mealLogs', mealId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export async function listProgressRecords(uid: string): Promise<ProgressRecord[]> {
  const colPath = `users/${uid}/progressRecords`;
  try {
    const q = query(collection(db, 'users', uid, 'progressRecords'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const items: ProgressRecord[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid,
        recorded_date: String(data.recordedDate),
        weight_kg: data.weightKg === null || data.weightKg === undefined ? null : Number(data.weightKg),
        activity_type: data.activityType as ActivityType,
        workout_title: String(data.workoutTitle || ''),
        duration_min: Number(data.durationMin || 0),
        calories_burned: Number(data.caloriesBurned || 0),
        notes: String(data.notes || ''),
      };
    });

    items.sort((a, b) => {
      if (a.recorded_date !== b.recorded_date) {
        return b.recorded_date.localeCompare(a.recorded_date);
      }
      return b.id.localeCompare(a.id);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colPath);
  }
}

export async function addProgressRecord(
  uid: string,
  payload: {
    recorded_date: string;
    weight_kg: number | null;
    activity_type: ActivityType;
    workout_title: string;
    duration_min: number;
    calories_burned: number;
    notes: string;
  }
): Promise<ProgressRecord> {
  const colPath = `users/${uid}/progressRecords`;
  const recordedDate = /^\d{4}-\d{2}-\d{2}$/.test(payload.recorded_date)
    ? payload.recorded_date
    : new Date().toISOString().slice(0, 10);
  const weightKg =
    payload.weight_kg !== null && payload.weight_kg !== undefined && payload.weight_kg > 0
      ? Math.round(clampNumber(payload.weight_kg, 25, 320) * 10) / 10
      : null;

  const docData = {
    uid,
    recordedDate,
    weightKg,
    activityType: payload.activity_type,
    workoutTitle: clampString(payload.workout_title, 120),
    durationMin: Math.round(clampNumber(payload.duration_min, 0, 600)),
    caloriesBurned: Math.round(clampNumber(payload.calories_burned, 0, 5000)),
    notes: clampString(payload.notes, 500),
    createdAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'progressRecords'), docData);

    // Sync user's latest weight onto their profile if a weight was entered
    if (weightKg !== null) {
      await updateDoc(doc(db, 'users', uid), {
        weightKg,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      id: ref.id,
      uid,
      recorded_date: docData.recordedDate,
      weight_kg: docData.weightKg,
      activity_type: docData.activityType,
      workout_title: docData.workoutTitle,
      duration_min: docData.durationMin,
      calories_burned: docData.caloriesBurned,
      notes: docData.notes,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, colPath);
  }
}

export async function deleteProgressRecord(uid: string, recordId: string): Promise<void> {
  const docPath = `users/${uid}/progressRecords/${recordId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'progressRecords', recordId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export async function fetchDashboardSummary(user: UserProfile): Promise<DashboardSummary> {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [allProgressDesc, todayMeals, allWorkouts] = await Promise.all([
    listProgressRecords(user.uid),
    listMealLogs(user.uid, today),
    listWorkouts(user.uid),
  ]);

  const progressAsc = [...allProgressDesc].sort((a, b) =>
    a.recorded_date.localeCompare(b.recorded_date)
  );
  const weightEntries = progressAsc.filter((r) => r.weight_kg !== null);
  const startingKg =
    weightEntries.length > 0 ? Number(weightEntries[0].weight_kg) : user.weight_kg;
  const currentKg = user.weight_kg;
  const deltaKg = Math.round((currentKg - startingKg) * 10) / 10;
  const remainingKg = Math.round((user.target_weight_kg - currentKg) * 10) / 10;

  const workoutEntries = progressAsc.filter((r) => r.activity_type !== 'Weigh-In');
  const sessionsThisWeek = workoutEntries.filter((r) => r.recorded_date >= sevenDaysAgo).length;
  const totalMinutes = workoutEntries.reduce((acc, r) => acc + r.duration_min, 0);
  const totalCaloriesBurned = workoutEntries.reduce((acc, r) => acc + r.calories_burned, 0);
  const lastWorkout = workoutEntries.length > 0 ? workoutEntries[workoutEntries.length - 1] : null;

  const nutritionToday = {
    calories: Math.round(todayMeals.reduce((acc, m) => acc + m.calories, 0)),
    protein_g: Math.round(todayMeals.reduce((acc, m) => acc + m.protein_g, 0) * 10) / 10,
    carbs_g: Math.round(todayMeals.reduce((acc, m) => acc + m.carbs_g, 0) * 10) / 10,
    fat_g: Math.round(todayMeals.reduce((acc, m) => acc + m.fat_g, 0) * 10) / 10,
    entriesCount: todayMeals.length,
  };

  const recommendedWorkouts = allWorkouts
    .filter((w) => {
      if (user.goal === 'Lose Weight' || user.goal === 'Improve Endurance') {
        return w.calories_est >= 220;
      }
      return w.difficulty !== 'Advanced' || user.goal === 'Build Muscle';
    })
    .slice(0, 4);

  return {
    user,
    bmi: calculateBmi(user.height_cm, user.weight_kg),
    weightStats: {
      currentKg,
      startingKg,
      deltaKg,
      targetKg: user.target_weight_kg,
      remainingKg,
    },
    workoutStats: {
      totalSessions: workoutEntries.length,
      sessionsThisWeek,
      totalMinutes,
      totalCaloriesBurned,
      lastWorkoutTitle: lastWorkout ? lastWorkout.workout_title || lastWorkout.activity_type : null,
      lastWorkoutDate: lastWorkout ? lastWorkout.recorded_date : null,
    },
    nutritionToday,
    recentProgress: progressAsc.slice(-12),
    recommendedWorkouts,
  };
}
