import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "@tanstack/react-router";
import { Check, Clock, Film, Images, MessageSquareWarning, Rss, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePosts } from "@/lib/store";
import { MediaThumb } from "@/components/MediaThumb";
import type { Post, PostStatus } from "@/lib/types";

const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);

const TYPE_ICON: Partial<Record<Post["type"], React.ReactNode>> = {
  carousel: <Images className="h-3.5 w-3.5" />,
  video: <Film className="h-3.5 w-3.5" />,
  reel: <Film className="h-3.5 w-3.5" />,
  story: <Rss className="h-3.5 w-3.5" />,
};

const STATUS_BADGE: Record<PostStatus, { icon: React.ReactNode; bg: string }> = {
  approved: { icon: <Check className="h-3 w-3" strokeWidth={3} />, bg: "bg-status-approved" },
  pending: { icon: <Clock className="h-3 w-3" strokeWidth={3} />, bg: "bg-status-pending" },
  revision: { icon: <MessageSquareWarning className="h-3 w-3" strokeWidth={2.5} />, bg: "bg-status-revision" },
  draft: { icon: null, bg: "bg-status-draft" },
  published: { icon: <Check className="h-3 w-3" strokeWidth={3} />, bg: "bg-status-published" },
};

export function PostGrid() {
  const posts = usePosts((s) => s.posts.slice(0, 12));
  const reorder = usePosts((s) => s.reorder);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    reorder(String(e.active.id), String(e.over.id));
  };

  // Render static grid on SSR to avoid dnd-kit's dynamic aria IDs mismatching.
  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-[2px] bg-background">
        {posts.map((p) => (
          <div key={p.id} className="relative aspect-[4/5] overflow-hidden">
            <FeedCover post={p} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={posts.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-[2px] bg-background">
          {posts.map((p, i) => (
            <GridCell key={p.id} post={p} index={i} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function GridCell({ post, index }: { post: Post; index: number }) {
  const navigate = useNavigate();
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  const badge = STATUS_BADGE[post.status];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: isDragging ? 1.04 : 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 30, delay: index * 0.02 }}
      className={`relative aspect-[4/5] overflow-hidden touch-none select-none ${
        isDragging ? "shadow-[var(--shadow-lg)] rounded-md" : ""
      }`}
      onClick={() => {
        if (isDragging) return;
        navigate({ to: "/post/$id", params: { id: post.id } });
      }}
    >
      <FeedCover post={post} />

      {/* Type icon top-right */}
      {TYPE_ICON[post.type] ? (
        <div className="absolute top-1.5 right-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
          {TYPE_ICON[post.type]}
        </div>
      ) : null}

      {/* Status dot bottom-left */}
      <div
        className={`absolute bottom-1.5 left-1.5 h-5 min-w-5 px-1 rounded-full grid place-items-center text-white ${badge.bg} shadow-[0_2px_6px_rgba(0,0,0,0.25)]`}
      >
        {badge.icon}
      </div>

      {/* Dim overlay when dragging */}
      {isDragging ? <div className="absolute inset-0 bg-background/10" /> : null}
    </motion.div>
  );
}

function FeedCover({ post }: { post: Post }) {
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const cover = post.thumb || post.media;
  const hasVideoMedia = isVideoUrl(post.media);

  if (isVideoUrl(cover) || useVideoFallback) {
    return (
      <video
        src={post.media}
        className="h-full w-full object-cover bg-surface-2"
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <img
      src={cover}
      alt={post.title}
      className="h-full w-full object-cover bg-surface-2"
      draggable={false}
      onError={() => {
        if (hasVideoMedia) setUseVideoFallback(true);
      }}
    />
  );
}