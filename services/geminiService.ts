import { GoogleGenAI, Content, Part } from "@google/genai";
import { WebSource, GroundingChunk, Attachment } from '../types';
import { cleanSourceUrl } from '../utils';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const NEXT_STEP_INSTRUCTION = `You are a Strategic Research Lead. Your goal is to navigate a complex user request by deciding the next best step.
You have access to a "Google Search" tool.
You will receive:
1. The User's Original Request.
2. Context from previous searches (if any).

Your Output must be a JSON object with the following structure:
{
  "thought": "Your reasoning for the next step. Be explicit about what is missing and what needs to be checked next.",
  "action": "search" | "answer",
  "query": "specific search query (only if action is search)"
}

**STRATEGY FOR "INVESTIGATE" / "RESEARCH" REQUESTS:**
- **Do not stop at the first result.**
- **Explore multiple dimensions:**
    1. **General Info**: Website, Location, History.
    2. **Reputation**: Reviews, Scam checks, Forum discussions (Reddit, Trustpilot).
    3. **Legal/Official**: Registration data, Lawsuits, Scandals.
    4. **Products/Services**: Key offerings, Pricing, Quality.
- **If the user asks to "Investigate", you MUST perform at least 2-3 distinct search steps covering different angles before answering.**

Example 1:
User: "Investigate Company X"
Output: { 
  "thought": "I need to start by finding the official website and general background of Company X.",
  "action": "search", 
  "query": "Company X official website and history" 
}

Example 2 (After Step 1):
User: "Investigate Company X"
Context: "Company X is a construction firm in China..."
Output: { 
  "thought": "Now I need to check for any negative reviews, scams, or legal issues associated with Company X to provide a balanced report.",
  "action": "search", 
  "query": "Company X reviews scam complaints lawsuits" 
}

CRITICAL:
- Return ONLY raw JSON.
- The "thought" field is mandatory and should be displayed to the user.`;

const RESEARCHER_INSTRUCTION = `You are a Data Collector. use Google Search to find information.
Current Date: ${new Date().toISOString()}
Summarize the key findings relevant to the query. Focus on numbers, dates, prices, and facts.
Prioritize information from late 2024 and 2025. Ignore outdated rumors if official data is available.
If you find multiple sources, list the specific data points.`;

const ANALYST_INSTRUCTION = `You are a Senior Research Analyst. Your task is to synthesize multiple research notes into a coherent, professional High-Quality Report.
Current Date: ${new Date().toISOString()}

**Structure of the Report:**
1.  **# Title** (Professional & Descriptive)
2.  **## Executive Summary** (3-4 lines summarizing the verdict)
3.  **## Detailed Analysis** (Use bullet points, bold text for emphasis). 
    - *If comparing products/prices, YOU MUST USE A MARKDOWN TABLE.*
4.  **## Conclusion/Recommendation** (Actionable advice).

**Strict Formatting Rules (CRITICAL):**
- **NO EMOJIS**: Do not use icons like 🚀, 💡, 💰, ✅, ❌ in headings or text.
- **NO DECORATIVE SYMBOLS**: Do not use characters like ■, ◆, ➤. Use standard Markdown bullets (-) only.
- **Tone**: Professional, Objective, Academic, Business-like.
- **Language**: RESPOND IN THE SAME LANGUAGE AS THE USER'S ORIGINAL REQUEST (Vietnamese/English/etc).
- **Format**: Use clean standard Markdown. Use Bold (**) for key metrics.`;

/**
 * Step 1: Decide the next step (Search or Answer)
 */
const decideNextStep = async (
  userQuery: string,
  currentContext: string,
  attachments: Attachment[] = []
): Promise<{ action: 'search' | 'answer', query?: string, thought?: string }> => {
  try {
    const parts: Part[] = [
      { text: `Current Date: ${new Date().toISOString()}` },
      { text: `User Request: "${userQuery}"` },
      { text: `Current Knowledge Context: ${currentContext || "None"}` }
    ];

    attachments.forEach(att => {
      parts.push({
        inlineData: { mimeType: att.mimeType, data: att.data }
      });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
        systemInstruction: NEXT_STEP_INSTRUCTION
      },
      contents: { role: 'user', parts: parts }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.warn("Decision failed, defaulting to answer", error);
    return { action: 'answer', thought: "Error in decision making, proceeding to answer." };
  }
};

/**
 * Step 2: Execute a single search task
 */
const performSingleSearch = async (query: string): Promise<{ text: string, sources: WebSource[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts: [{ text: `Find detailed info for: ${query}` }] },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: RESEARCHER_INSTRUCTION,
      },
    });

    const text = response.text || "";

    // Extract sources and CLEAN them immediately
    const sources: WebSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
    if (groundingChunks) {
      groundingChunks.forEach(chunk => {
        if (chunk.web) {
          const originalUri = chunk.web.uri;
          const cleanUri = cleanSourceUrl(originalUri);

          // Only add if we have a valid URI
          if (cleanUri) {
            sources.push({
              title: chunk.web.title,
              uri: cleanUri
            });
          }
        }
      });
    }

    return { text: `### Research on "${query}":\n${text}`, sources };
  } catch (error) {
    console.error(`Search failed for "${query}"`, error);
    return { text: "", sources: [] };
  }
};

/**
 * Step 3: Main Orchestrator (Agentic Loop)
 */
export const sendMessageToGemini = async (
  currentHistory: Content[],
  newMessage: string,
  attachments: Attachment[],
  onProgress?: (status: string) => void
): Promise<{ text: string; sources: WebSource[] }> => {
  try {
    let loopCount = 0;
    const MAX_LOOPS = 5;
    let context = "";
    const allSources: WebSource[] = [];

    // --- AGENTIC LOOP ---
    while (loopCount < MAX_LOOPS) {
      loopCount++;

      // 1. Decide
      if (onProgress) onProgress("Đang phân tích và lập kế hoạch...");
      const decision = await decideNextStep(newMessage, context, attachments);

      // Display the thought if available
      if (decision.thought && onProgress) {
        onProgress(`Suy luận: "${decision.thought}"`);
      }

      if (decision.action === 'answer') {
        break; // Exit loop to synthesize answer
      }

      if (decision.action === 'search' && decision.query) {
        // 2. Execute Search
        if (onProgress) onProgress(`Đang tìm kiếm thông tin về: "${decision.query}"...`);
        const result = await performSingleSearch(decision.query);

        // 3. Update Context
        context += `\n\n${result.text}`;
        allSources.push(...result.sources);
      } else {
        break; // Fallback
      }
    }

    // 4. Synthesize Report
    if (onProgress) onProgress("Đang tổng hợp dữ liệu và viết báo cáo...");

    const finalPrompt = `
      Original User Request: "${newMessage}"
      
      Collected Research Data:
      ${context}
      
      Task: Write the final report now. Remember the formatting rules: NO EMOJIS, Professional Tone.
    `;

    const finalUserParts: Part[] = [{ text: finalPrompt }];
    attachments.forEach(att => {
      finalUserParts.push({
        inlineData: { mimeType: att.mimeType, data: att.data }
      });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...currentHistory,
        { role: 'user', parts: finalUserParts }
      ],
      config: {
        systemInstruction: ANALYST_INSTRUCTION,
      },
    });

    // Deduplicate sources based on the CLEANED uri
    const uniqueSources = allSources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

    return {
      text: response.text || "Could not generate report.",
      sources: uniqueSources
    };

  } catch (error) {
    console.error("Gemini Deep Research Error:", error);
    throw error;
  }
};