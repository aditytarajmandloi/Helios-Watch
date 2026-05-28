const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini
let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } else {
    console.warn("⚠️ GEMINI_API_KEY is missing. AI features will be disabled.");
  }
} catch (e) {
  console.error("Failed to initialize Google Gen AI", e);
}

// Model fallback chain — tries each in order until one succeeds
const MODEL_CHAIN = ['gemini-flash-latest', 'gemini-pro-latest'];

/**
 * Core function: sends a prompt through the model chain with automatic fallback.
 * Retries on 503/429 errors (temporary overload).
 */
async function callGemini(prompt) {
  if (!ai) return null;

  for (const model of MODEL_CHAIN) {
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        return response.text;
      } catch (error) {
        const status = error.status || error.code;
        console.warn(`[AI] ${model} failed (${status}), attempt ${attempts}...`);
        if (status === 503 || status === 429) {
          if (attempts < 3) {
            await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
            continue; // retry same model
          } else {
            break; // move to next model
          }
        }
        // Non-retryable error — log and break to next model
        console.error(`[AI] Non-retryable error on ${model}:`, error.message);
        break;
      }
    }
  }
  console.error('[AI] All models exhausted. No response generated.');
  return null;
}

/**
 * Generate a Flash Report for critical anomalies.
 */
async function generateFlashReport(alertData, recentTelemetry) {
  const prompt = `
You are an expert space weather analyst working at a mission control center.
A CRITICAL anomaly has just been detected by our autonomous systems.

RAW ALERT TRIGGER:
Type: ${alertData.type}
Severity: ${alertData.severity}
Value: ${alertData.value}
Trigger Message: ${alertData.message}

CURRENT TELEMETRY SUMMARY:
${JSON.stringify(recentTelemetry, null, 2)}

TASK:
Write a fast, professional, and concise "Flash Warning" (2-3 sentences max) explaining what this event means, what potentially caused it based on the telemetry, and the immediate real-world impacts (e.g., radio blackouts, satellite drag, power grids).
Do NOT use markdown. Do NOT use greetings. Be analytical and direct.
`;
  return callGemini(prompt);
}

/**
 * Generate a Daily Summary summarizing 24 hours of data.
 */
async function generateDailySummary(daySummary) {
  const prompt = `
You are the lead space weather scientist providing the morning debrief for aviation, satellite operators, and power grid managers.

LAST 24 HOURS TELEMETRY:
${JSON.stringify(daySummary, null, 2)}

TASK:
Write a professional "Daily Space Weather Briefing" (3-4 sentences). 
Summarize the overall tranquility or volatility of the last 24 hours. Highlight any notable peaks (e.g., High Kp or fast solar wind). Tell operational teams what to expect if these conditions hold.
Do NOT use markdown. Be authoritative and concise.
`;
  return callGemini(prompt);
}

/**
 * Generate AI Correlation Insight from selected multi-metric data.
 */
async function generateCorrelationInsight(selectedMetrics, summaryStats, timeRange) {
  const prompt = `
You are a senior space weather scientist analyzing a multi-metric correlation chart.

SELECTED METRICS: ${selectedMetrics.join(', ')}
TIME WINDOW: ${timeRange}

SUMMARY STATISTICS:
${JSON.stringify(summaryStats, null, 2)}

TASK:
Provide a brief expert correlation analysis (3-4 sentences max). Identify any notable relationships between the selected metrics — for example, does rising solar wind speed correlate with southward Bz? Is electron flux building after a high-speed stream? Are conditions consistent with a developing geomagnetic storm or recovery phase?
Be scientific, concise, and actionable. Do NOT use markdown or greetings.
`;
  return callGemini(prompt);
}

module.exports = {
  generateFlashReport,
  generateDailySummary,
  generateCorrelationInsight
};
