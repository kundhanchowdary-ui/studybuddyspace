// Edge function: AI doubt solver with step-by-step hints
// Accepts { question: string, imageBase64?: string (data URL), subject?: string }
// Streams an SSE response from Lovable AI Gateway (Gemini multimodal).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Study Buddy's AI tutor for students from class 9 to college.
Your goal is NOT to dump the final answer. Instead:

1. First, briefly identify what the question is about (1 line).
2. Give 3-5 progressive HINTS — each labeled "Hint 1:", "Hint 2:", etc.
   - Hint 1 = gentle nudge / what concept to recall.
   - Hint 2 = setup / which formula or method.
   - Hint 3+ = guided steps without revealing the final number.
3. After hints, provide a "Step-by-step solution:" section with clear steps.
4. End with "Final answer:" on its own line.
5. Use markdown. Use $...$ for inline math and $$...$$ for block math.
6. Be encouraging, warm, and concise. No fluff.

If an image is provided, read the question from it carefully (handwriting, diagrams, MCQs).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { question, imageBase64, subject } = await req.json();

    if (!question && !imageBase64) {
      return new Response(JSON.stringify({ error: "Provide a question or an image." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [];
    const ctx = subject ? `Subject: ${subject}\n\n` : "";
    userContent.push({
      type: "text",
      text: `${ctx}${question || "Solve the question shown in the image."}`,
    });
    if (imageBase64) {
      userContent.push({ type: "image_url", image_url: { url: imageBase64 } });
    }

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
      },
    );

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit. Try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("solve-doubt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
