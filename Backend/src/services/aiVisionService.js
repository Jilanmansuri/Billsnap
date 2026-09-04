import { GoogleGenAI } from '@google/genai';

/**
 * Service to extract structured handwritten bill data using Vision AI with per-field confidence scoring.
 */
export async function extractBillWithVision(imageBuffer, mimeType = 'image/jpeg') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn(
      '⚠️ [aiVisionService] GEMINI_API_KEY is not set in Backend/.env. Using fallback simulated extraction with confidence scores.'
    );
    return getFallbackExtractionWithConfidence();
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
You are a specialized Vision OCR AI expert trained on handwritten Indian retail bills, cash memos, grocery slips, and invoices.
Your job is to read handwritten text with extreme diligence and precision.

MULTILINGUAL & HANDWRITING GUIDELINES:
1. Handwriting Languages: Understand and transcribe handwritten text in English, Hindi (Devanagari script like 'दूध', 'चावल', 'शक्कर', 'दाल', 'तेल'), and Gujarati ('દૂધ', 'તેલ', 'ખાંડ', 'ચોખા', 'શાકભાજી').
2. Indian Currency & Formats:
   - Handle Indian Rupee symbols (₹, Rs, Re, /- suffix such as '120/-', '50.00').
   - Differentiate quantity units: kg, gm, g, ltr, ml, pcs, pkt, box, or bare number.
3. Number & Digit Precision:
   - Carefully distinguish visually similar digits in handwriting: 1 vs 7, 0 vs 6 vs 8, 4 vs 9, 3 vs 5.
   - Separate Quantity, Unit Price (rate/@), and Item Total columns accurately.
4. STRICT TRUTH-TELLING RULES (CRITICAL):
   - DO NOT GUESS OR INVENT: Never invent missing items, unwritten prices, or hallucinate text that is not visible.
   - If an item description, quantity, price, or date is genuinely illegible, smudged, crossed-out, or cut off, set its value to null.
   - Do NOT assume a calculation if the handwritten digit is unreadable; return null.
5. PER-FIELD CONFIDENCE RATINGS:
   For every extracted field, provide a confidence rating:
   - "high": The handwritten text or digit is crisp, unambiguous, and clearly readable.
   - "medium": The handwriting is somewhat slanted, cramped, cursive, or faint, but identifiable with reasonable certainty.
   - "low": The handwriting is heavily faded, ambiguous, scratched out, partially torn, or borderline illegible.

RETURN ONLY VALID JSON (NO MARKDOWN FENCES, NO CHAT):
{
  "date": {
    "value": "YYYY-MM-DD or raw date string found on bill, or null if illegible/absent",
    "confidence": "high" | "medium" | "low"
  },
  "customerName": {
    "value": "Merchant/Store or Customer name, or null if illegible/absent",
    "confidence": "high" | "medium" | "low"
  },
  "billNumber": {
    "value": "Bill/Invoice number if written, or null",
    "confidence": "high" | "medium" | "low"
  },
  "items": [
    {
      "name": {
        "value": "Exact item name as written (or null if illegible)",
        "confidence": "high" | "medium" | "low"
      },
      "quantity": {
        "value": 1.0 (number or null if illegible),
        "confidence": "high" | "medium" | "low"
      },
      "unitPrice": {
        "value": 450.0 (number or null if illegible),
        "confidence": "high" | "medium" | "low"
      },
      "total": {
        "value": 450.0 (number or null if illegible),
        "confidence": "high" | "medium" | "low"
      }
    }
  ],
  "subtotal": {
    "value": 0.0 (number or null),
    "confidence": "high" | "medium" | "low"
  },
  "tax": {
    "value": 0.0 (number or null),
    "confidence": "high" | "medium" | "low"
  },
  "discount": {
    "value": 0.0 (number or null),
    "confidence": "high" | "medium" | "low"
  },
  "grandTotal": {
    "value": 0.0 (number or null),
    "confidence": "high" | "medium" | "low"
  },
  "currency": "INR",
  "notes": "Any handwritten notes or remarks observed on the bill, or null"
}
`;

  try {
    const base64Data = imageBuffer.toString('base64');

    // 35-second timeout promise to prevent hanging connections
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('AI Vision request timed out after 35 seconds.'));
      }, 35000);
      // Ensure timer doesn't keep node process alive
      if (timer.unref) timer.unref();
    });

    const generatePromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemInstruction },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.05, // Low temperature for maximum deterministic OCR fidelity
      },
    });

    // Race against 35s timeout
    const response = await Promise.race([generatePromise, timeoutPromise]);

    const responseText = response?.text?.trim();
    if (!responseText) {
      throw new Error('Empty response received from Vision AI model.');
    }

    // Resilient JSON extraction: Find the outermost JSON object
    let cleanedJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const firstBrace = cleanedJson.indexOf('{');
    const lastBrace = cleanedJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedJson = cleanedJson.slice(firstBrace, lastBrace + 1);
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.warn('⚠️ [aiVisionService] JSON parsing failed, attempting repair:', parseErr.message);
      throw new Error(`Failed to parse AI response into valid JSON: ${parseErr.message}`);
    }

    // Ensure parsedData is an object
    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error('Vision model returned invalid data structure.');
    }

    return parsedData;
  } catch (error) {
    console.error('❌ [aiVisionService] Error in Vision model call:', error.message);

    // Categorized, user-friendly error messages
    if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Gemini Vision quota/rate limit exceeded. Please wait a moment and try again.');
    } else if (error.message.includes('503') || error.message.includes('UNAVAILABLE')) {
      throw new Error('Gemini Vision service temporarily unavailable. Please retry in a few seconds.');
    } else if (error.message.includes('timed out')) {
      throw new Error('Gemini Vision extraction timed out. Please check network or try a clearer image.');
    }

    throw new Error(`AI Vision extraction failed: ${error.message}`);
  }
}

/**
 * Fallback realistic simulated extraction with field-level confidence ratings.
 * Used when GEMINI_API_KEY is not configured so development & testing can proceed smoothly.
 */
function getFallbackExtractionWithConfidence() {
  return {
    date: {
      value: new Date().toISOString().split('T')[0],
      confidence: 'high',
    },
    customerName: {
      value: 'Shree Balaji Traders (किराना & जनरल)',
      confidence: 'high',
    },
    billNumber: {
      value: 'MEMO-2026-402',
      confidence: 'medium',
    },
    items: [
      {
        name: { value: 'Basmati Rice (बासमती चावल)', confidence: 'high' },
        quantity: { value: 2, confidence: 'high' },
        unitPrice: { value: 110, confidence: 'high' },
        total: { value: 220, confidence: 'high' },
      },
      {
        name: { value: 'Sunflower Oil (1L)', confidence: 'high' },
        quantity: { value: 1, confidence: 'medium' },
        unitPrice: { value: 165, confidence: 'high' },
        total: { value: 165, confidence: 'high' },
      },
      {
        name: { value: 'Toor Dal (તુવેર દાળ)', confidence: 'medium' },
        quantity: { value: 2, confidence: 'low' }, // Low confidence demo
        unitPrice: { value: 175, confidence: 'high' },
        total: { value: 350, confidence: 'high' },
      },
      {
        name: { value: 'Refined Sugar', confidence: 'high' },
        quantity: { value: 3, confidence: 'high' },
        unitPrice: { value: 48, confidence: 'medium' },
        total: { value: 144, confidence: 'high' },
      },
    ],
    subtotal: {
      value: 879,
      confidence: 'high',
    },
    tax: {
      value: 0,
      confidence: 'high',
    },
    discount: {
      value: 0,
      confidence: 'high',
    },
    grandTotal: {
      value: 879,
      confidence: 'high',
    },
    currency: 'INR',
    notes: 'Payment received in cash',
  };
}
