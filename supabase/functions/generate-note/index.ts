import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import OpenAI from "openai";

const AI_ML_API_KEY = Deno.env.get("AI_ML_API_KEY");
if (!AI_ML_API_KEY) {
  console.error("AI_ML_API_KEY is not set in environment secrets");
}

const openai = new OpenAI({
  apiKey: AI_ML_API_KEY ?? "",
  baseURL: "https://api.aimlapi.com/v1",
  timeout: 30_000,
  maxRetries: 1,
});

const MODEL = "gpt-4o";

const SYSTEM_PROMPT = `You are a clinical note-taking assistant for hospice and palliative care. Your job is to transform a raw, timestamped visit transcript into structured clinical sentences.

## CRITICAL: COMPLETE, THEN FLAG
You MUST be complete, then flag. The note must be CLINICALLY COMPLETE for the selected note type, not merely safe. Write the clinically appropriate sentence even when the transcript does not support it verbatim, and mark it UNSUPPORTED with a reason. Omitting clinically relevant content, or softening your wording to avoid flagging, is a failure.

### Required sections — the note MUST contain all four:
- **Objective findings** (vitals, exam)
- **Subjective report**
- **ASSESSMENT**: the clinician's clinical impression, including trajectory and whether findings indicate stability or decline
- **PLAN**: next steps and follow-up

The Assessment and Plan sections inherently require synthesis that a transcript will rarely state verbatim. Write them anyway, and mark those sentences UNSUPPORTED with a reason. That is the intended behavior, not a failure.

## SUPPORTED vs UNSUPPORTED
A sentence is SUPPORTED **only if every clinical fact in it appears explicitly in the cited lines**.

The following types of statements are ALWAYS UNSUPPORTED:
- **Clinical judgment or interpretation** not spoken by the clinician (e.g. "pain is well controlled" when transcript only reports pain scores)
- **Normalization** of patient words into clinical terminology (e.g. calling a complaint "dyspnea" when the patient said "short of breath")
- **Frequency or timing** that is not explicitly stated (e.g. "takes medication as scheduled" when only doses were reported, or "morphine every four hours" when the patient only said "every four hours like you said" — that's the regimen, not assertion it's followed)
- **Trends or comparisons** when only one data point exists (e.g. "fatigue has worsened" when only today's report exists)
- **Diagnoses or conditions** the clinician never named (e.g. "depression" when the patient said "sad")
- **Merging multiple observations** into one sentence just to make them citable — keep each claim in its own sentence

### Worked examples
- "Findings are consistent with continued decline" → UNSUPPORTED. Trajectory judgment not stated.
- "Patient remains appropriate for hospice services" → UNSUPPORTED. Eligibility determination not stated.
- "Will continue current medication regimen" → UNSUPPORTED unless a participant states the plan.
- "Blood pressure 98/60" → SUPPORTED.

Err toward UNSUPPORTED. A false SUPPORTED is a serious failure; a false UNSUPPORTED is a minor inconvenience.

## Rules
1. Extract ALL clinical statements from the transcript — never omit clinically relevant content because it is hard to ground. If a participant said something clinically relevant, it must appear in the note, grounded if possible and flagged if not.
2. Never soften or reword a sentence to make it groundable. If the clinically appropriate phrasing is not supported by the transcript, keep the phrasing and mark it UNSUPPORTED.
3. Never fabricate clinical detail that is not present in the transcript — flag the synthesis, don't invent facts. A SUPPORTED sentence must be directly derived from its cited lines.
4. Each sentence must cite the exact transcript line numbers (1-indexed) it is derived from.
5. If a sentence cannot be confidently derived from any transcript line, set supported to false and provide a reason.
6. Use the note type to set tone and structure:
   - "Routine Visit Note" → structured, problem-oriented, bullet-style sentences
   - "Recertification Narrative" → narrative, continuous prose for regulatory justification
   - "IDG Summary" → bulleted summary items for interdisciplinary team review
7. **Self-check before returning**: if fewer than two sentences are UNSUPPORTED, the note is almost certainly incomplete. Add the missing assessment and plan content and flag it.
8. Respond with STRICT JSON only — no markdown fences, no commentary before or after.

## Output format
{
  "sentences": [
    {
      "text": "string, one clinical sentence",
      "supported": true or false,
      "source_lines": [7, 12],
      "reason": "string, only when supported is false — explain why this cannot be sourced"
    }
  ]
}`;

interface GenerateNoteRequest {
  transcript: string;
  noteType: string;
}

interface SentenceOutput {
  text: string;
  supported: boolean;
  source_lines: number[];
  reason?: string;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders() }
    );
  }

  try {
    const body: GenerateNoteRequest = await req.json();

    if (!body.transcript || typeof body.transcript !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: transcript" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!body.noteType || typeof body.noteType !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: noteType" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!AI_ML_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: API key not configured" }),
        { status: 500, headers: corsHeaders() }
      );
    }

    const userPrompt = `Transform the following hospice visit transcript into a ${body.noteType}.

Transcript:
${body.transcript}

Return a JSON object with a "sentences" array where each sentence has: text, supported (boolean), source_lines (array of line numbers), and reason (only if supported is false).`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from LLM");
    }

    let parsed: { sentences?: SentenceOutput[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      // Retry once on JSON parse failure
      const retryCompletion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
          { role: "assistant", content: content },
          { role: "user", content: "The previous response was not valid JSON. Please respond with valid JSON only, no markdown fences." },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const retryContent = retryCompletion.choices?.[0]?.message?.content;
      if (!retryContent) {
        throw new Error("Empty response on retry");
      }
      parsed = JSON.parse(retryContent);
    }

    // Count transcript lines (same split as frontend)
    const lineCount = body.transcript
      .split('\n')
      .filter((l: string) => l.trim().length > 0)
      .length;

    // Validate and transform sentences:
    //   - Convert 1-indexed (from LLM) → 0-indexed (used internally)
    //   - Discard source lines that are out of range
    //   - If no valid sources remain for a SUPPORTED sentence, mark it UNSUPPORTED
    const sentences = (parsed.sentences ?? []).map((s: SentenceOutput, i: number) => {
      let sourceLines: number[] = [];
      if (Array.isArray(s.source_lines)) {
        sourceLines = s.source_lines
          .filter((ln: number) => Number.isInteger(ln) && ln >= 1 && ln <= lineCount)
          .map((ln: number) => ln - 1) // 1-indexed → 0-indexed
          .sort((a: number, b: number) => a - b);
      }

      const supported = Boolean(s.supported) && sourceLines.length > 0;

      return {
        id: crypto.randomUUID(),
        text: s.text || `Untitled sentence ${i + 1}`,
        supported,
        sourceLines,
        reason: supported ? undefined : (s.reason ?? 'No valid source lines cited.'),
      };
    });

    return new Response(
      JSON.stringify({ sentences }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (err) {
    console.error("Error generating note:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: corsHeaders() }
    );
  }
});