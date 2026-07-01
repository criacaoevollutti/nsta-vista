export type PostStatus =
  | "draft"
  | "pending"
  | "revision"
  | "approved"
  | "published";

export type PostType = "image" | "carousel" | "video" | "reel" | "story";

export interface Post {
  id: string;
  media: string;
  thumb: string;
  type: PostType;
  status: PostStatus;
  title: string;
  caption: string;
  objective: string;
  notes: string;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:mm
}

export interface Highlight {
  id: string;
  name: string;
  cover: string;
  tint: string;
}

export interface Profile {
  name: string;
  handle: string;
  category: string;
  bio: string;
  location: string;
  site: string;
  avatar: string;
  posts: number;
  followers: string;
  following: number;
}

export const STATUS_META: Record<
  PostStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  draft: {
    label: "Em criação",
    color: "text-muted-foreground",
    bg: "bg-surface-2",
    dot: "bg-status-draft",
  },
  pending: {
    label: "Aguardando aprovação",
    color: "text-status-pending",
    bg: "bg-brand-orange-soft/30",
    dot: "bg-status-pending",
  },
  revision: {
    label: "Correção solicitada",
    color: "text-status-revision",
    bg: "bg-status-revision/10",
    dot: "bg-status-revision",
  },
  approved: {
    label: "Aprovado",
    color: "text-status-approved",
    bg: "bg-success-soft",
    dot: "bg-status-approved",
  },
  published: {
    label: "Publicado",
    color: "text-status-published",
    bg: "bg-brand-purple/10",
    dot: "bg-status-published",
  },
};

export const TYPE_LABEL: Record<PostType, string> = {
  image: "Imagem",
  carousel: "Carrossel",
  video: "Vídeo",
  reel: "Reels",
  story: "Stories",
};