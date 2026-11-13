import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  // Only logged-in users can use the AI (protects your credits)
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = await req.json();
  if (!prompt) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  // Try models in order; if one is overloaded, use the next
  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

  let lastError = "AI request failed";
  for (const id of models) {
    try {
      const { text } = await generateText({
        model: google(id),
        system: "You are a helpful assistant. Answer concisely.",
        prompt,
        maxRetries: 1,
      });
      return Response.json({ text });
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    }
  }
  return Response.json({ error: lastError }, { status: 503 });
}
