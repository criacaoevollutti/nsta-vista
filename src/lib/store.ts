import { create } from "zustand";
import type { Post, PostStatus } from "./types";
import { initialPosts } from "./mock-data";

interface PostsState {
  posts: Post[];
  reorder: (fromId: string, toId: string) => void;
  update: (id: string, patch: Partial<Post>) => void;
  setStatus: (id: string, status: PostStatus) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  celebrated: boolean;
  setCelebrated: (v: boolean) => void;
}

export const usePosts = create<PostsState>((set) => ({
  posts: initialPosts,
  celebrated: false,
  setCelebrated: (v) => set({ celebrated: v }),
  reorder: (fromId, toId) =>
    set((s) => {
      const from = s.posts.findIndex((p) => p.id === fromId);
      const to = s.posts.findIndex((p) => p.id === toId);
      if (from < 0 || to < 0 || from === to) return s;
      const next = s.posts.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { posts: next };
    }),
  update: (id, patch) =>
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  setStatus: (id, status) =>
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? { ...p, status } : p)),
    })),
  duplicate: (id) =>
    set((s) => {
      const idx = s.posts.findIndex((p) => p.id === id);
      if (idx < 0) return s;
      const orig = s.posts[idx];
      const copy: Post = {
        ...orig,
        id: `${orig.id}-copy-${Date.now()}`,
        status: "draft",
        title: `${orig.title} (cópia)`,
      };
      const next = s.posts.slice();
      next.splice(idx + 1, 0, copy);
      return { posts: next };
    }),
  remove: (id) =>
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
}));