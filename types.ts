
// export interface SmartCard {
//   type: 'facts' | 'advice' | 'routine';
//   title: string;
//   content: string;
// }

// export interface AnalysisResult {
//   category: 'Nutrition' | 'Skincare' | 'Medicine' | 'General' | 'Alert';
//   cards: SmartCard[];
//   fromCache?: boolean;
// }

// export interface ComparisonResult {
//   severityA: string;
//   severityB: string;
//   progression: 'Improving' | 'Worsening' | 'Stable' | 'Cannot Compare';
//   changeScore: number;
//   suggestion: string;
//   observationA?: string;
//   observationB?: string;
//   medicineSuggestion?: string;
// }

// export interface HistoryItem {
//   id: string;
//   timestamp: number;
//   imageUrl?: string;
//   query: string;
//   result: AnalysisResult;
// }

// export interface UserProfile {
//   conditions: string;
//   allergies: string;
//   history: string;
// }

// export type LoadingState = 'idle' | 'analyzing' | 'success' | 'error';

// // --- Treatment Planner Types ---

// export interface RoutineItem {
//   id: string;
//   title: string;
//   rationale: string;
//   effort: 'Low' | 'Medium' | 'High';
//   completed: boolean;
// }

// export interface TreatmentPlan {
//   id: string;
//   createdAt: number;
//   skinType: string;
//   topSymptoms: string[];
//   severityLevel: string;
//   confidence: string;
//   morning: RoutineItem[];
//   night: RoutineItem[];
//   weekly: RoutineItem[];
//   avoidance: RoutineItem[];
//   triggers?: string[];
// }

// // --- Zone Mapping Types ---

// export interface ZoneInsight {
//   id: string;
//   label: string;
//   box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
//   findings: string;
//   severity: 'Low' | 'Medium' | 'High';
//   insight: string;
// }

// export interface ZoneAnalysisResult {
//   isValid: boolean;
//   errorReason?: string;
//   overall_summary: string;
//   zones: ZoneInsight[];
// }

// // --- Lifestyle Trigger Analysis Types ---

// export interface DailyHabits {
//   sleep_hours_avg: number;
//   dairy_intake: 'None' | 'Low' | 'Moderate' | 'High';
//   sugar_intake: 'None' | 'Low' | 'Moderate' | 'High';
//   water_intake: 'Low' | 'Medium' | 'High';
//   mask_use: 'None' | 'Occasional' | 'Frequent';
// }

// export interface EnvironmentalFactors {
//   uv_index: number;
//   humidity: string;
//   pollution_index: string;
// }

// export interface SymptomData {
//   lesion_count: string; // e.g., "approx 5"
//   redness_score: number; // 1-10
//   zones: string[]; // e.g., ["cheek", "chin"]
//   duration_days: number;
// }

// export interface TriggerSuggestion {
//   name: string;
//   likelihood: 'Low' | 'Medium' | 'High';
//   rationale: string;
//   suggestion: string;
// }

// export interface TriggerAnalysisResult {
//   triggers: TriggerSuggestion[];
// }

// // --- Environmental Skincare Types ---

// export interface EnvironmentalContext {
//   location: string;
//   date: string;
//   uv_index: number;
//   humidity: number; // percentage (0-100)
//   pollution_aqi: number;
// }

// export interface EnvironmentalInsightsResult {
//   suggestions: string[];
// }

// // --- Product Safety Check Types ---

// export interface ProductData {
//   name: string;
//   ingredients: string[]; // List of ingredient names
//   concentration?: Record<string, string>; // e.g., { "benzoyl peroxide": "10%" }
// }

// export interface SafetyCheckResult {
//   warnings: string[]; // List of critical warnings (allergies, high concentration, duplicates)
//   safe: string[]; // List of ingredients or aspects deemed safe
//   notes: string[]; // General usage notes or mild cautions
// }





export interface SmartCard {
  type: 'facts' | 'advice' | 'routine';
  title: string;
  content: string;
}

export interface AnalysisResult {
  category: 'Nutrition' | 'Skincare' | 'Medicine' | 'General' | 'Alert';
  cards: SmartCard[];
  fromCache?: boolean;
}

export interface ComparisonResult {
  severityA: string;
  severityB: string;
  progression: 'Improving' | 'Worsening' | 'Stable' | 'Cannot Compare';
  changeScore: number;
  suggestion: string;
  observationA?: string;
  observationB?: string;
  medicineSuggestion?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  imageUrl?: string; // Kept for backward compatibility (primary image)
  imageUrls?: string[]; // New: support for multiple images
  query: string;
  result: AnalysisResult;
}

export interface UserProfile {
  conditions: string;
  allergies: string;
  history: string;
}

export type LoadingState = 'idle' | 'analyzing' | 'success' | 'error';

// --- Treatment Planner Types ---

export interface RoutineItem {
  id: string;
  title: string;
  rationale: string;
  effort: 'Low' | 'Medium' | 'High';
  completed: boolean;
}

export interface TreatmentPlan {
  id: string;
  createdAt: number;
  skinType: string;
  topSymptoms: string[];
  severityLevel: string;
  confidence: string;
  morning: RoutineItem[];
  night: RoutineItem[];
  weekly: RoutineItem[];
  avoidance: RoutineItem[];
  triggers?: string[];
}

// --- Zone Mapping Types ---

export interface ZoneInsight {
  id: string;
  label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
  findings: string;
  severity: 'Low' | 'Medium' | 'High';
  insight: string;
}

export interface ZoneAnalysisResult {
  isValid: boolean;
  errorReason?: string;
  overall_summary: string;
  zones: ZoneInsight[];
}

// --- Lifestyle Trigger Analysis Types ---

export interface DailyHabits {
  sleep_hours_avg: number;
  dairy_intake: 'None' | 'Low' | 'Moderate' | 'High';
  sugar_intake: 'None' | 'Low' | 'Moderate' | 'High';
  water_intake: 'Low' | 'Medium' | 'High';
  mask_use: 'None' | 'Occasional' | 'Frequent';
}

export interface EnvironmentalFactors {
  uv_index: number;
  humidity: string;
  pollution_index: string;
}

export interface SymptomData {
  lesion_count: string; // e.g., "approx 5"
  redness_score: number; // 1-10
  zones: string[]; // e.g., ["cheek", "chin"]
  duration_days: number;
}

export interface TriggerSuggestion {
  name: string;
  likelihood: 'Low' | 'Medium' | 'High';
  rationale: string;
  suggestion: string;
}

export interface TriggerAnalysisResult {
  triggers: TriggerSuggestion[];
}

// --- Environmental Skincare Types ---

export interface EnvironmentalContext {
  location: string;
  date: string;
  uv_index: number;
  humidity: number; // percentage (0-100)
  pollution_aqi: number;
}

export interface EnvironmentalInsightsResult {
  suggestions: string[];
}

// --- Product Safety Check Types ---

export interface ProductData {
  name: string;
  ingredients: string[]; // List of ingredient names
  concentration?: Record<string, string>; // e.g., { "benzoyl peroxide": "10%" }
}

export interface SafetyCheckResult {
  warnings: string[]; // List of critical warnings (allergies, high concentration, duplicates)
  safe: string[]; // List of ingredients or aspects deemed safe
  notes: string[]; // General usage notes or mild cautions
}
