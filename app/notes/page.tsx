"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Note = { id: string; content: string; created_at: string };

export default function NotesPage() {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("notes")
      .select("id, content, created_at")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setNotes(data ?? []);
  }

  async function add() {
    if (!text.trim()) return;
    const { error } = await supabase.from("notes").insert({ content: text });
    if (error) return console.error(error);
    setText("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8 space-y-4">
      <h1 className="text-2xl font-bold">Notes</h1>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write something..."
        />
        <Button onClick={add}>Add</Button>
      </div>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-md border p-3">
            {n.content}
          </li>
        ))}
      </ul>
    </main>
  );
}
