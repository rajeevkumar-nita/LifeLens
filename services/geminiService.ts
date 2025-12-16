import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ComparisonResult, UserProfile, TreatmentPlan, ZoneAnalysisResult, SymptomData, DailyHabits, EnvironmentalFactors, TriggerAnalysisResult, EnvironmentalContext, EnvironmentalInsightsResult, ProductData, SafetyCheckResult } from "../types";
import { normalizeImage, generateImageHash } from "./imageUtils";
import { getCachedAnalysis, cacheAnalysis } from "./cacheService";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the response schema for structured output
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ["Nutrition", "Skincare", "Medicine", "Alert", "General"],
      description: "The overall category of the analysis based on the input type.",
    },
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["facts", "advice", "routine"],
            description: "The type of card: 'facts' for factual info, 'advice' for tips, 'routine' for lifestyle integration.",
          },
          title: {
            type: Type.STRING,
            description: "A short, catchy title for the card.",
          },
          content: {
            type: Type.STRING,
            description: "Detailed content for this card.",
          },
        },
        required: ["type", "title", "content"],
      },
    },
  },
  required: ["category", "cards"],
};

const comparisonSchema = {
  type: Type.OBJECT,
  properties: {
    severityA: { type: Type.STRING, description: "Short severity assessment for Image A" },
    severityB: { type: Type.STRING, description: "Short severity assessment for Image B" },
    progression: { type: Type.STRING, enum: ["Improving", "Worsening", "Stable", "Cannot Compare"] },
    changeScore: { type: Type.NUMBER, description: "-1 for improvement, 0 for stable, 1 for worsening" },
    suggestion: { type: Type.STRING, description: "1-2 short doctor-style lines, safe and non-medical" },
    observationA: { type: Type.STRING, description: "Full observation for Scan A" },
    observationB: { type: Type.STRING, description: "Full observation for Scan B" },
    medicineSuggestion: { type: Type.STRING, description: "Safe OTC suggestion or empty string if not applicable" }
  },
  required: ["severityA", "severityB", "progression", "changeScore", "suggestion", "observationA", "observationB", "medicineSuggestion"]
};

// Schema for Treatment Plan
const treatmentPlanSchema = {
  type: Type.OBJECT,
  properties: {
    skinType: { type: Type.STRING, description: "Derived skin type (e.g. Oily, Dry, Sensitive)" },
    topSymptoms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 2 most visible symptoms identified" },
    severityLevel: { type: Type.STRING, description: "Mild, Moderate, or Severe" },
    confidence: { type: Type.STRING, description: "High, Medium, or Low" },
    morning: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: {
          title: { type: Type.STRING },
          rationale: { type: Type.STRING, description: "One line explanation linked to observable findings" },
          effort: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
        },
        required: ["title", "rationale", "effort"]
      } 
    },
    night: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: {
          title: { type: Type.STRING },
          rationale: { type: Type.STRING },
          effort: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
        },
        required: ["title", "rationale", "effort"]
      } 
    },
    weekly: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: {
          title: { type: Type.STRING },
          rationale: { type: Type.STRING },
          effort: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
        },
        required: ["title", "rationale", "effort"]
      } 
    },
    avoidance: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: {
          title: { type: Type.STRING },
          rationale: { type: Type.STRING },
          effort: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
        },
        required: ["title", "rationale", "effort"]
      } 
    }
  },
  required: ["skinType", "topSymptoms", "morning", "night", "weekly", "avoidance"]
};

// Schema for Zone Mapping
const zoneAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN, description: "True if a valid, clear, front-facing face is detected. False otherwise." },
    errorReason: { type: Type.STRING, description: "If isValid is false, explain why (e.g. 'Face not clearly visible', 'Side profile detected', 'Blurry')." },
    overall_summary: { type: Type.STRING, description: "Summary of analysis if valid, or corrective instructions if invalid." },
    zones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, enum: ["forehead", "left_cheek", "right_cheek", "chin", "jawline"] },
          label: { type: Type.STRING },
          box_2d: { 
            type: Type.ARRAY, 
            items: { type: Type.NUMBER }, 
            description: "[ymin, xmin, ymax, xmax] in 0-1000 coordinate space" 
          },
          findings: { type: Type.STRING, description: "Brief visual finding (e.g. '3 papules, mild redness')" },
          severity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          insight: { type: Type.STRING, description: "Lifestyle inference (e.g. 'Possible contact with phone')" }
        },
        required: ["id", "label", "box_2d", "findings", "severity", "insight"]
      }
    }
  },
  required: ["isValid", "overall_summary", "zones"]
};

// Schema for Lifestyle Trigger Analysis
const triggerAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    triggers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The name of the suspected trigger." },
          likelihood: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "Estimated likelihood." },
          rationale: { type: Type.STRING, description: "Why this trigger is suspected based on symptoms/habits." },
          suggestion: { type: Type.STRING, description: "Safe, non-medical lifestyle suggestion." }
        },
        required: ["name", "likelihood", "rationale", "suggestion"]
      }
    }
  },
  required: ["triggers"]
};

// Schema for Environmental Insights
const envInsightsSchema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of actionable skincare suggestions based on environment."
    }
  },
  required: ["suggestions"]
};

// Schema for Product Safety Check
const safetyCheckSchema = {
  type: Type.OBJECT,
  properties: {
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of critical warnings (allergies, high concentration, duplicates)."
    },
    safe: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of ingredients or aspects deemed safe."
    },
    notes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "General usage notes or mild cautions."
    }
  },
  required: ["warnings", "safe", "notes"]
};

// Helper to estimate severity from text for prompt context
const getSeverityLabel = (result: AnalysisResult): string => {
  const text = JSON.stringify(result.cards).toLowerCase();
  if (text.includes('severe') || text.includes('high severity') || text.includes('consult a doctor')) return 'Severe';
  if (text.includes('moderate') || text.includes('inflammation')) return 'Moderate';
  return 'Mild';
};

/**
 * Ensures a deterministic SeverityScore exists in the facts card.
 * If model fails to generate it, computes it based on content keywords.
 */
const ensureSeverityScore = (result: AnalysisResult) => {
  const factsCard = result.cards.find(c => c.type === 'facts');
  if (!factsCard) return;

  // Check if score exists (N from 1-10)
  if (!factsCard.content.match(/SeverityScore:\s*\d+/i)) {
    // Deterministic fallback computation
    const text = JSON.stringify(result.cards).toLowerCase();
    let score = 2; // Default Mild
    
    if (text.includes('severe') || text.includes('urgent') || text.includes('emergency') || text.includes('consult a doctor') || text.includes('deep inflammation')) {
      score = 8;
    } else if (text.includes('moderate') || text.includes('inflammation') || text.includes('redness') || text.includes('multiple lesions')) {
      score = 5;
    }

    // Append computed score to maintain data consistency
    factsCard.content += `\nSeverityScore: ${score} (computed)`;
  }
};

export const analyzeHealthQuery = async (
  text: string,
  base64Image?: string,
  userProfile?: UserProfile,
  mimeType: string = "image/jpeg"
): Promise<AnalysisResult> => {
  try {
    let normalizedImage = base64Image;
    let imgHash: string | null = null;

    // --- STEP 1: Normalize & Hash Image (Deterministic Cache Key) ---
    if (base64Image) {
      try {
        normalizedImage = await normalizeImage(base64Image);
        imgHash = await generateImageHash(normalizedImage);
        
        // --- STEP 2: Check Cache ---
        const cachedResult = getCachedAnalysis(imgHash);
        if (cachedResult) {
          console.log(`[Cache Hit] Using cached analysis for hash: ${imgHash.substring(0,8)}`);
          return cachedResult;
        }
      } catch (e) {
        console.warn("Image normalization/cashing failed, proceeding with raw image.", e);
        // Fallback to raw if normalization fails
        normalizedImage = base64Image;
      }
    }

    // Construct text prompt with user profile if available
    let promptText = text || "Analyze this for health insights.";
    
    if (userProfile && (userProfile.conditions || userProfile.allergies || userProfile.history)) {
      promptText += `\n\n[USER MEDICAL PROFILE START]\n`;
      if (userProfile.conditions) promptText += `CONDITIONS: ${userProfile.conditions}\n`;
      if (userProfile.allergies) promptText += `ALLERGIES: ${userProfile.allergies}\n`;
      if (userProfile.history) promptText += `HISTORY: ${userProfile.history}\n`;
      promptText += `[USER MEDICAL PROFILE END]\n\nTASK: Analyze the input. You MUST tailor the 'advice' and 'routine' cards to this specific user profile, checking for any contraindications, allergens, or relevant history.`;
    }

    const parts: any[] = [{ text: promptText }];

    if (normalizedImage) {
      // Remove data URL prefix if present (normalized image usually has it)
      const base64Data = normalizedImage.split(",")[1] || normalizedImage;
      parts.push({
        inlineData: {
          mimeType: mimeType, // Normalized is always jpeg, but keeping generic if fallback used
          data: base64Data,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: `DETERMINISTIC OUTPUT MANDATE — LifeLens

You are LifeLens. Your priority is MAXIMUM ACCURACY, TRANSPARENCY, and SAFETY.
You must output consistent, repeatable analysis for the same image.

Do NOT change the JSON output structure. Always return results in this exact format:
{
  "category": "...",
  "cards": [
    {"type": "facts", "title": "...", "content": "..."},
    {"type": "advice", "title": "...", "content": "..."},
    {"type": "routine", "title": "...", "content": "..."}
  ]
}

Strict Rules for Deterministic Output:

1. Deterministic Facts:
   - Produce facts strictly from directly observable image elements.
   - Use deterministic phrasing and ordering (e.g., list top-to-bottom or most prominent to least prominent).
   - Do NOT include timestamps, session IDs, or random variable content in facts.

2. Deterministic Severity (MANDATORY):
   - You MUST include a "SeverityScore: N" line in the 'facts' card content, where N is an integer from 1 to 10.
     - 1-3: Mild (Minor discoloration, few small lesions, dry skin)
     - 4-6: Moderate (Visible inflammation, multiple lesions, clear redness)
     - 7-10: Severe (Deep inflammation, widespread infection, urgent care needed)
   - Example line: "SeverityScore: 5"

3. No Randomness:
   - Do not use words implying uncertainty (e.g., "perhaps") as primary claims.
   - Uncertainty must only appear in the "Evidence confidence" line.

4. Observable Metrics:
   - Include measurable estimates (count, area %) with the method used.
   - Example: "Estimated lesion count: ~8 (visual count)."

5. Low Quality Images:
   - If image is blurry/dark, still emit a conservative SeverityScore based on what IS visible, but mark "Evidence confidence: LOW" and suggest retake.

Analysis Procedure:

Pass 1 — Visible Evidence Extraction
1. Describe observable elements using short numbered lines. Label as "Observable:".
2. Add the SeverityScore line.
3. Add the Evidence confidence line.
   - Example Facts Content:
     "1) Observable: Erythema on right cheek covering ~10% area.
      2) Observable: 5-8 small papules on forehead.
      SeverityScore: 4
      Evidence confidence: MEDIUM — slight blur on jawline."

Pass 2 — Advice & Routine
1. Tie every advice item to an Observable fact.
2. Be actionable and safe. Use "consider", "may help".

Safety:
- Append this exact line at the end of every response (after JSON generation logic handles it, ensure it's conceptually part of the output content where appropriate or handled by UI, but for this JSON task, ensure the content strings are safe):
  "I am an AI assistant, not a medical professional. Please consult a doctor for medical advice."
  (Include this in the content strings of advice/routine cards).

Follow these rules strictly.`,
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(response.text) as AnalysisResult;

    // --- STEP 3: Deterministic Fallback & Cache Store ---
    ensureSeverityScore(result);

    if (imgHash) {
      cacheAnalysis(imgHash, result);
    }

    return result;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const compareSkinAnalysis = async (
  imageA: string,
  imageB: string
): Promise<ComparisonResult> => {
  try {
    const dataA = imageA.split(",")[1] || imageA;
    const dataB = imageB.split(",")[1] || imageB;

    const parts = [
      { text: "Compare Scan A (first image) and Scan B (second image) strictly." },
      { inlineData: { mimeType: "image/jpeg", data: dataA } },
      { inlineData: { mimeType: "image/jpeg", data: dataB } }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: comparisonSchema,
        systemInstruction: `You are a hyper-strict dermatology comparison engine with additional duties:
1) Detect mismatched persons.
2) Detect mismatched body regions.
3) Offer accurate observations.
4) Offer strict progression analysis.
5) Provide a safe, non-prescription-only, harm-free general medicine suggestion when relevant.

Your behavior must be deterministic, conservative, and medically cautious.

=====================================================================
A) PERSON & BODY-PART VALIDATION (MANDATORY)
=====================================================================
Before ANY comparison:
- Check if Scan A and Scan B show the SAME PERSON.
- Check if both show the SAME BODY REGION (e.g., both cheeks, both forehead, both hand).

If faces, bone structure, facial proportions, or features clearly do not match → treat as DIFFERENT PERSON.

If body regions differ (face vs. hand, cheek vs. chin, arm vs. leg) → treat as DIFFERENT BODY PARTS.

In these cases:
- Progression = “Cannot Compare”
- Score = 0
- Provide FULL observations for both images independently.
- Final suggestion: 
  “These two scans appear to be from different people or different body areas. Please compare scans of the same region for accurate tracking.”

No progression analysis should be attempted when mismatched.

=====================================================================
B) OBSERVATION RULES (DETAILED – NEVER TRUNCATE)
=====================================================================
For BOTH Scan A and Scan B provide:
- Complete lesion description (count range, size range).
- Redness scale.
- Inflammation pattern.
- Affected zones (cheek, chin, jaw, forehead, etc.).
- Texture changes.
- Distribution pattern.

Observations MUST be complete and MUST NOT truncate (no “…”) under any circumstances. 
UI truncation is allowed, but your output must always contain the full text.

=====================================================================
C) PROGRESSION LOGIC (ULTRA-STRICT)
=====================================================================
Only perform progression analysis when SAME PERSON + SAME REGION is confirmed.

Default → “Stable / No Meaningful Change”.

Declare “Improving” ONLY IF:
- Lesion count is CLEARLY lower.
- Redness is CLEARLY reduced.
- Inflammation visibly decreases.
- Texture smoothness improves.
- Multiple strong indicators appear together.

Declare “Worsening” ONLY IF:
- Lesion count CLEARLY increases.
- New areas become affected.
- Redness or swelling visibly intensifies.
- Texture becomes rougher.
- Differences are undeniable.

If ANY uncertainty exists → set Progression = “Stable”.

If Scan A and Scan B appear identical or nearly identical → ALWAYS Progression = “Stable”, Score = 0.

=====================================================================
D) SAFE GENERAL MEDICINE RECOMMENDER (MANDATORY)
=====================================================================
After giving comparison and observations, include a short medicine suggestion ONLY IF:
- SAME PERSON + SAME REGION.
- Lesions or irritation are visible.
- The medicine is globally considered mild, OTC, and very safe.

Allowed OTC suggestions:
- Benzoyl Peroxide 2.5% (low strength only)
- Salicylic Acid 0.5–1%
- Niacinamide 2–5%
- Hydrocortisone 0.5–1% (short term, only for irritation/redness)
- Basic moisturizers (non-comedogenic)
- Calamine lotion (for soothing)

Rules:
- DO NOT recommend prescription-strength treatments.
- DO NOT recommend antibiotics, retinoids, isotretinoin, steroids above 1%, or hormonal treatments.
- DO NOT make medical diagnosis or strong claims.

Medicine suggestion format:
“Safe, mild OTC options that may help include: <list>. If symptoms persist or worsen, consider consulting a dermatologist.”

If no medicine is relevant, return an empty string.

=====================================================================
E) OUTPUT FORMAT (STRICT)
=====================================================================
1. Severity_A (short)
2. Severity_B (short)
3. Progression: Improving / Worsening / Stable / Cannot Compare
4. Numeric Score: -1 / 0 / +1
5. Full Observation_A (complete)
6. Full Observation_B (complete)
7. Short doctor-style suggestion (1–2 lines)
8. Safe general OTC medicine suggestion (if applicable, 1 line, or empty string)

=====================================================================
F) DOCTOR-STYLE FINAL SUGGESTION
=====================================================================
Your tone must sound like a gentle dermatologist:
- Calm
- Professional
- Non-alarming
- Clear
- Actionable
- Safe

Examples:
- “Changes appear minimal. Continue gentle care and avoid friction.”
- “There is mild improvement. Maintain a consistent skincare routine.”
- “Some worsening is visible. Keeping the area clean and monitoring symptoms is advised.”

Never prescribe. Never diagnose. Never claim certainty. Keep advice safe.`,
      },
    });

    if (!response.text) {
      throw new Error("No comparison response from AI");
    }

    return JSON.parse(response.text) as ComparisonResult;
  } catch (error) {
    console.error("Comparison Error:", error);
    // Fallback if comparison fails
    return {
      severityA: "Unknown",
      severityB: "Unknown",
      progression: "Stable",
      changeScore: 0,
      suggestion: "Comparison unavailable. Please verify manually."
    };
  }
};

export const predictTriggers = async (
  result: AnalysisResult,
  userProfile?: UserProfile,
  selectedTriggers: string[] = []
): Promise<string> => {
  try {
    const factsCard = result.cards.find(c => c.type === 'facts');
    const facts = factsCard ? factsCard.content : "No observable facts found.";
    const severity = getSeverityLabel(result);
    
    let userContext = "";
    if (userProfile) {
      userContext = `User Profile: Conditions: ${userProfile.conditions}, Allergies: ${userProfile.allergies}`;
    }

    const selectedTriggersContext = selectedTriggers.length > 0 
      ? `User-Selected Triggers (User suspects these): ${selectedTriggers.join(', ')}` 
      : "No user-selected triggers yet.";

    const prompt = `Trigger Prediction Engine — Safe, Evidence-linked suggestions

    Context:
    - Facts (Observable): ${facts}
    - Severity: ${severity}
    - User Selected Triggers: ${selectedTriggersContext}
    - User Profile: ${userContext}

    Task:
    Based on facts and selected_triggers (if any), generate a concise "Possible Triggers" output: 3–6 items ranked by likelihood.
    
    Constraints:
    1. Do NOT diagnose or claim causation. Use phrasing like "may contribute", "possible association", "worth checking".
    2. Only suggest triggers that reasonably connect to the observed facts.
    3. If user provided selected_triggers, prioritize those in explanation.
    4. If facts include "Overall image confidence: LOW", mark all suggestions as "Provisional" and recommend retake.
    5. Professional, empathetic, conservative tone.

    Output format:
    Return a short plain-text block (no markdown) suitable to render inside a card. Format as numbered lines.
    Example: "1) Dairy (MEDIUM) — May contribute because Observable: increased oiliness on forehead."
    
    Always append: "I am an AI assistant, not a medical professional. Please consult a doctor for medical advice."
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });

    if (!response.text) {
      return "Unable to predict triggers at this time.";
    }

    return response.text;
  } catch (error) {
    console.error("Trigger Prediction Error:", error);
    return "Trigger prediction unavailable.";
  }
};

export const refineAnalysisWithTriggers = async (
  currentResult: AnalysisResult,
  triggers: string[],
  userProfile?: UserProfile
): Promise<AnalysisResult> => {
  try {
    const analysisContext = JSON.stringify(currentResult);
    const triggersContext = triggers.join(", ");
    
    let userContext = "";
    if (userProfile && (userProfile.conditions || userProfile.allergies || userProfile.history)) {
      userContext = `\nUser Profile: Conditions: ${userProfile.conditions}, Allergies: ${userProfile.allergies}, History: ${userProfile.history}`;
    }

    const prompt = `Refine the current health analysis advice based on new user-selected triggers.
    
    CURRENT ANALYSIS:
    ${analysisContext}

    USER SELECTED TRIGGERS (Suspected factors):
    ${triggersContext}
    ${userContext}

    TASK:
    1. Keep the 'facts' card exactly the same or summarized similarly.
    2. Update the 'advice' and 'routine' cards to specifically address the selected triggers (e.g., if 'Dairy' is selected, suggest cutting dairy or alternatives; if 'Stress', suggest management techniques).
    3. Ensure recommendations are linked to both the visual observations (from facts) AND the selected triggers.
    4. Maintain the "Safe, Non-medical" tone.

    OUTPUT FORMAT:
    Return valid JSON matching the exact same schema as the input.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: `You are LifeLens. Refine advice based on user triggers.
        
        Rules:
        1. Do NOT diagnose.
        2. Be practical and empathetic.
        3. Always append the safety disclaimer at the end of content strings.
        4. JSON keys must match exactly: category, cards (type, title, content).
        `,
      }
    });

    if (!response.text) {
      throw new Error("Failed to refine analysis");
    }

    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Refinement Error:", error);
    throw error;
  }
};

export const generateTreatmentPlan = async (
  analysisResult: AnalysisResult,
  userProfile?: UserProfile,
  triggers?: string[]
): Promise<TreatmentPlan> => {
  try {
    const analysisContext = JSON.stringify(analysisResult);
    
    let userContext = "";
    if (userProfile) {
      userContext = `User Profile: Conditions: ${userProfile.conditions}, Allergies: ${userProfile.allergies}, History: ${userProfile.history}`;
    }

    let triggersContext = "";
    if (triggers && triggers.length > 0) {
      triggersContext = `User Identified Potential Triggers: ${triggers.join(", ")}`;
    }

    const prompt = `Generate a Personalized Treatment Planner (Safe, Non-medical) based on the inputs.

    INPUT CONTEXT:
    Analysis JSON: ${analysisContext}
    ${userContext}
    ${triggersContext}

    STRICT RULES:
    1. Safety first:
       - Never diagnose or prescribe medication.
       - Avoid recommending prescription drugs or clinical procedures.
       - Use language: "consider", "may help", "avoid", "gentle".

    2. Evidence-linked recommendations:
       - Each routine item must include a 1-line rationale tied to an Observable from facts (e.g., "Because Observable: increased redness on cheeks").
       - If a trigger is identified (e.g., Dairy), include specific avoidance or lifestyle steps in the relevant sections.
       - If an inference is used, label it "Inference (low confidence): ..." and keep suggestion conservative.

    3. Personalization:
       - Use user profile if provided (e.g., if known allergies, avoid relevant ingredients).
       - If unknown, offer one conservative, universally safe option.

    4. Severity-aware adjustments:
       - If severity = mild: propose conservative maintenance steps.
       - If severity = moderate: include soothing measures and suggest monitoring.
       - If severity = severe: emphasize immediate professional consultation and include supportive general measures (cool compress, avoid new products), but do NOT instruct specific treatments.

    5. Unclear image handling:
       - If facts include "Overall image confidence: LOW", provide a short retake checklist first and mark items as "Provisional".

    OUTPUT FORMAT:
    Return valid JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: treatmentPlanSchema,
      }
    });

    if (!response.text) {
      throw new Error("Failed to generate treatment plan");
    }

    const rawPlan = JSON.parse(response.text);
    
    // Enrich with IDs and completion state. Add safety check for undefined arrays.
    const processItems = (items: any[]) => (items || []).map((item, idx) => ({
      ...item,
      id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      completed: false
    }));

    return {
      id: `plan_${Date.now()}`,
      createdAt: Date.now(),
      skinType: rawPlan.skinType,
      topSymptoms: rawPlan.topSymptoms,
      severityLevel: rawPlan.severityLevel,
      confidence: rawPlan.confidence,
      morning: processItems(rawPlan.morning),
      night: processItems(rawPlan.night),
      weekly: processItems(rawPlan.weekly),
      avoidance: processItems(rawPlan.avoidance),
      triggers: triggers // Pass triggers through to the plan object
    };

  } catch (error) {
    console.error("Planner Generation Error:", error);
    throw error;
  }
};

export const generateZoneInsights = async (
  base64Image: string,
  existingFacts: string
): Promise<ZoneAnalysisResult> => {
  try {
    const base64Data = base64Image.split(",")[1] || base64Image;
    
    const prompt = `You are a medical-grade skin analysis assistant.

CRITICAL RULES FOR SKIN ZONE MAP GENERATION:

1. Face Detection Gate (MANDATORY)
- Before generating any Skin Zone Map, you MUST verify that:
  - A full or near-full human face is clearly visible
  - Key landmarks are detectable: forehead, both cheeks, chin/jawline
- If facial landmarks are NOT confidently detectable, DO NOT generate zone overlays.

2. Invalid Image Conditions
If ANY of the following are true:
- The image primarily contains hair, scalp, hand, background, or partial face
- The face is heavily occluded, blurred, cropped, or poorly lit
- Facial orientation is incorrect (extreme tilt, side profile, upside down)
- Facial features cannot be confidently segmented

Then:
- Return isValid: false
- Return errorReason with the specific issue
- Return empty zones array
- Provide friendly corrective instructions in overall_summary

3. Valid Face Analysis
If a clear face IS detected:
- Return isValid: true
- Detect facial zones: Forehead, Left Cheek, Right Cheek, Chin, Jawline.
- Return 2D bounding boxes [ymin, xmin, ymax, xmax] for each zone (0-1000 scale).
- Generate specific insights using ONLY observable data.

CONTEXT:
Existing Analysis Facts: ${existingFacts}

BEHAVIOR RULES (For Valid Faces):
1. Use ONLY observable data. Never invent lesions.
2. For each region:
   - Provide finding (e.g., 'Scattered papules') and severity.
   - Provide a short insight linking finding to lifestyle.
   - If a zone is clear, state 'No significant findings'.
3. SAFETY:
   - Use "may relate to", "possible correlation". No diagnosis.
   - Always append this safety line to the overall_summary: "I am an AI assistant, not a medical professional. Please consult a doctor for medical advice."

OUTPUT: JSON matching schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Data } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: zoneAnalysisSchema,
      }
    });

    if (!response.text) throw new Error("No zone data returned");
    return JSON.parse(response.text) as ZoneAnalysisResult;

  } catch (error) {
    console.error("Zone Analysis Error:", error);
    throw error;
  }
};

/**
 * Advanced Lifestyle Trigger Analysis based on strict inputs for habits and environment.
 */
export const analyzeLifestyleTriggers = async (
  symptoms: SymptomData,
  habits: DailyHabits,
  changes: { new_products: string[]; medication_changes: string[] },
  environment: EnvironmentalFactors
): Promise<TriggerAnalysisResult> => {
  try {
    // Construct the strict User prompt format
    const userPrompt = `
- symptoms: {lesion_count: "${symptoms.lesion_count}", redness_score: ${symptoms.redness_score}, zones: [${symptoms.zones.join(', ')}], duration_days: ${symptoms.duration_days}}
- habits: {sleep_hours_avg: ${habits.sleep_hours_avg}, dairy_intake: "${habits.dairy_intake}", sugar_intake: "${habits.sugar_intake}", water_intake: "${habits.water_intake}", mask_use: "${habits.mask_use}"}
- recent_changes: {new_products: [${changes.new_products.join(', ')}], medication_changes: [${changes.medication_changes.join(', ')}]}
- environment: {uv_index: ${environment.uv_index}, humidity: "${environment.humidity}", pollution_index: "${environment.pollution_index}"}

Task: Return up to 5 likely triggers with reasons and a safe, non-medical suggestion each.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: userPrompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: triggerAnalysisSchema,
        systemInstruction: `You are a non-diagnostic health-assistant. Provide possible lifestyle/environmental triggers for a skin condition. Use cautious language ("may", "could"). Output JSON: {triggers: [{name, likelihood, rationale, suggestion}]}.
        
        Rules:
        1. Base analysis ONLY on the provided JSON-like input structure.
        2. Likelihood must be Low, Medium, or High based on established correlations (e.g., high sugar -> high likelihood for acne).
        3. Suggestion must be safe lifestyle advice (e.g., "Consider reducing dairy"), NOT medical advice.
        `,
      }
    });

    if (!response.text) {
      throw new Error("No response for lifestyle triggers");
    }

    return JSON.parse(response.text) as TriggerAnalysisResult;
  } catch (error) {
    console.error("Lifestyle Trigger Analysis Error:", error);
    throw error;
  }
};

/**
 * Generates environment-based skincare suggestions based on specific weather thresholds.
 */
export const getEnvironmentalInsights = async (
  ctx: EnvironmentalContext
): Promise<EnvironmentalInsightsResult> => {
  try {
    const userPrompt = `
- location: "${ctx.location}"
- date: "${ctx.date}"
- uv_index: ${ctx.uv_index}
- humidity: ${ctx.humidity}
- pollution_aqi: ${ctx.pollution_aqi}

Task: If UV > 6 recommend sunscreen. If humidity < 30% recommend moisturizer increase. If AQI > 100 recommend reducing outdoor exposure and cleansing face after going outside.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: userPrompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: envInsightsSchema,
        systemInstruction: `Non-diagnostic. Provide environment-based skincare suggestions using UV/humidity/pollution. Output short actionable lines.`,
      }
    });

    if (!response.text) {
      throw new Error("No response for environmental insights");
    }

    return JSON.parse(response.text) as EnvironmentalInsightsResult;
  } catch (error) {
    console.error("Environmental Insights Error:", error);
    throw error;
  }
};

/**
 * Checks product safety based on user profile and OTC medication usage.
 */
export const checkProductSafety = async (
  product: ProductData,
  userProfile: UserProfile,
  currentOTC: string[] = []
): Promise<SafetyCheckResult> => {
  try {
    const userPrompt = `
- product: {name: "${product.name}", ingredients: [${product.ingredients.join(', ')}], concentration: ${JSON.stringify(product.concentration || {})}}
- user_allergies: [${userProfile.allergies}]
- current_OTC: [${currentOTC.join(', ')}]

Task: Flag allergenic ingredients, high-concentration cautions (e.g., benzoyl peroxide >5%), duplicate active ingredients, and suggest "consult doctor" only when serious risk detected.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: userPrompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: safetyCheckSchema,
        systemInstruction: `Safety-first assistant. Check for common allergenic or high-risk ingredient combinations within non-prescription scope only. Do NOT give prescriptions or drug interactions for prescription meds. Output JSON: {warnings: [], safe: [], notes: []}`,
      }
    });

    if (!response.text) {
      throw new Error("No response for product safety check");
    }

    return JSON.parse(response.text) as SafetyCheckResult;
  } catch (error) {
    console.error("Product Safety Check Error:", error);
    throw error;
  }
};
