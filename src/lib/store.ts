import { create } from "zustand";
import { toast } from "sonner";
import type { Post, PostStatus } from "./types";
import { initialPosts } from "./mock-data";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

export const MAX_POSTS = 12;


interface PostsState {
  posts: Post[];
  userId: string | null;
  loaded: boolean;
  celebrated: boolean;
  setCelebrated: (v: boolean) => void;
  hydrate: (userId: string) => Promise<void>;
  reset: () => void;
  reorder: (fromId: string, toId: string) => void;
  update: (id: string, patch: Partial<Post>) => void;
  setStatus: (id: string, status: PostStatus) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
}

type PostRow = {
  id: string;
  media: string;
  thumb: string;
  type: Post["type"];
  status: PostStatus;
  title: string;
  caption: string;
  objective: string;
  notes: string;
  date: string;
  time: string;
  position: number;
};

const rowToPost = (r: PostRow): Post => ({
  id: r.id,
  media: r.media,
  thumb: r.thumb,
  type: r.type,
  status: r.status,
  title: r.title,
  caption: r.caption,
  objective: r.objective,
  notes: r.notes,
  date: r.date,
  time: r.time,
});

const DB_COLUMNS = [
  "media",
  "thumb",
  "type",
  "status",
  "title",
  "caption",
  "objective",
  "notes",
  "date",
  "time",
] as const;

export const usePosts = create<PostsState>((set, get) => ({
  posts: [],
  userId: null,
  loaded: false,
  celebrated: false,
  setCelebrated: (v) => set({ celebrated: v }),
  reset: () => set({ posts: [], userId: null, loaded: false, celebrated: false }),

  hydrate: async (userId: string) => {
    if (get().userId === userId && get().loaded) return;
    set({ userId });

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true });

    if (error) {
      console.error("[posts.hydrate]", error);
      return;
    }

    if (!data || data.length === 0) {
      // Seed initial demo posts on first sign-in
      const seed = initialPosts.slice(0, MAX_POSTS).map((p, i) => ({
        user_id: userId,
        media: p.media,
        thumb: p.thumb,
        type: p.type,
        status: p.status,
        title: p.title,
        caption: p.caption,
        objective: p.objective,
        notes: p.notes,
        date: p.date,
        time: p.time,
        position: i,
      }));
      const { data: inserted, error: insertError } = await supabase
        .from("posts")
        .insert(seed)
        .select()
        .order("position", { ascending: true });
      if (insertError) {
        console.error("[posts.seed]", insertError);
        return;
      }
      set({ posts: (inserted ?? []).map((r) => rowToPost(r as PostRow)), loaded: true });
      return;
    }

    set({ posts: data.map((r) => rowToPost(r as PostRow)), loaded: true });
  },

  reorder: (fromId, toId) => {
    const state = get();
    const from = state.posts.findIndex((p) => p.id === fromId);
    const to = state.posts.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = state.posts.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set({ posts: next });

    if (!state.userId) return;
    // Persist new positions for every changed row.
    const updates = next.map((p, i) =>
      supabase.from("posts").update({ position: i }).eq("id", p.id),
    );
    void Promise.all(updates).then((results) => {
      const failed = results.find((r) => r.error);
      if (failed?.error) console.error("[posts.reorder]", failed.error);
    });
  },

  update: (id, patch) => {
    set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

    const dbPatch: TablesUpdate<"posts"> = {};
    for (const key of DB_COLUMNS) {
      if (key in patch) (dbPatch as Record<string, unknown>)[key] = patch[key as keyof Post];
    }
    if (Object.keys(dbPatch).length === 0) return;

    void supabase
      .from("posts")
      .update(dbPatch)
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[posts.update]", error);
      });
  },

  setStatus: (id, status) => {
    set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, status } : p)) }));
    void supabase
      .from("posts")
      .update({ status })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[posts.setStatus]", error);
      });
  },

  duplicate: (id) => {
    const state = get();
    const idx = state.posts.findIndex((p) => p.id === id);
    if (idx < 0 || !state.userId) return;
    if (state.posts.length >= MAX_POSTS) {
      toast.error(`Limite de ${MAX_POSTS} postagens por feed atingido`);
      return;
    }
    const orig = state.posts[idx];
    const tempId = crypto.randomUUID();
    const copy: Post = {
      ...orig,
      id: tempId,
      status: "draft",
      title: `${orig.title} (cópia)`,
    };
    const next = state.posts.slice();
    next.splice(idx + 1, 0, copy);
    set({ posts: next });

    void supabase
      .from("posts")
      .insert({
        id: tempId,
        user_id: state.userId,
        media: copy.media,
        thumb: copy.thumb,
        type: copy.type,
        status: copy.status,
        title: copy.title,
        caption: copy.caption,
        objective: copy.objective,
        notes: copy.notes,
        date: copy.date,
        time: copy.time,
        position: idx + 1,
      })
      .then(({ error }) => {
        if (error) console.error("[posts.duplicate]", error);
      });
  },

  remove: (id) => {
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
    void supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[posts.remove]", error);
      });
  },
}));
