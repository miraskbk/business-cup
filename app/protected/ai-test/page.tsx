"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AiTestPage() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!prompt.trim()) return;
    setLoading(true);
    setAnswer("");
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const { text, error } = await res.json();
    setLoading(false);
    if (error) return toast.error(error);
    setAnswer(text);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">AI test</h1>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask something..."
      />
      <Button onClick={ask} disabled={loading} className="w-fit">
        {loading ? "Thinking..." : "Ask"}
      </Button>
      {answer && (
        <div className="whitespace-pre-wrap rounded-md border p-4">
          {answer}
        </div>
      )}
    </div>
  );
}
