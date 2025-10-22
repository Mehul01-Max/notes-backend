import express from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { supabase } from "../lib/supabaseClient.js";

const notesRouter = express.Router();

notesRouter.get("/", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);

  try {
    const { data, error } = await supabase
      .from("Notes")
      .select(
        `
        id, 
        title, 
        body, 
        created_at,
        notes_tags ( 
          tags ( tag_name ) 
        )
      `
      )
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform the data to match frontend expectations
    const notes = data.map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
      created_at: note.created_at,
      tags: note.notes_tags?.map((nt) => nt.tags.tag_name) || [],
    }));

    res.json({ notes });
  } catch (error) {
    console.error("GET notes error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ CREATE a new note
notesRouter.post("/new", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { title, body, tags = [] } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  try {
    const { data, error } = await supabase.rpc("create_note_with_tags", {
      note_title: title,
      note_body: body || "",
      user_id: userId,
      tag_names: tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("No data returned from function");
    }

    res.status(201).json(data[0]);
  } catch (error) {
    console.error("POST note error:", error);
    res.status(500).json({ error: "Failed to create note: " + error.message });
  }
});

// ✅ UPDATE a note
notesRouter.put("/:id", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { id } = req.params;
  const { title, body, tags = [] } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  try {
    const { data, error } = await supabase.rpc("update_note_with_tags", {
      note_id_to_update: parseInt(id),
      note_title: title,
      note_body: body || "",
      user_id: userId,
      tag_names: tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res
        .status(404)
        .json({ error: "Note not found or you lack permission to edit it." });
    }

    res.status(200).json(data[0]);
  } catch (error) {
    console.error("PUT note error:", error);
    res.status(500).json({ error: "Failed to update note: " + error.message });
  }
});

// ✅ DELETE a note
notesRouter.delete("/:id", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { id } = req.params;

  try {
    const { error, count } = await supabase
      .from("Notes")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("clerk_user_id", userId);

    if (error) throw error;

    if (count === 0) {
      return res
        .status(404)
        .json({ error: "Note not found or you lack permission to delete it." });
    }

    res.status(204).send();
  } catch (error) {
    console.error("DELETE note error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default notesRouter;
