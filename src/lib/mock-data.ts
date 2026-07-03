import type { PostStatus, PostType, Post, Highlight, Profile } from "./types";

// Curated Unsplash photo IDs — cohesive lifestyle/architecture feed
const IMG = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const profile: Profile = {
  name: "Evollutti",
  handle: "evollutti",
  category: "Marketing Digital · Agência",
  bio: "Estratégias que transformam marcas em experiências.\nConteúdo · Performance · Branding",
  location: "São Paulo, BR",
  site: "evollutti.com.br",
  avatar: IMG("1600880292203-757bb62b4baf", 300),
  posts: 12,
  followers: "48,2k",
  following: 312,
};

export const highlights: Highlight[] = [
  { id: "h1", name: "Cases", cover: IMG("1522199755839-a2bacb67c546", 300), tint: "#7c3aed" },
  { id: "h2", name: "Bastidores", cover: IMG("1521737604893-d14cc237f11d", 300), tint: "#f97316" },
  { id: "h3", name: "Time", cover: IMG("1529333166437-7750a6dd5a70", 300), tint: "#ec4899" },
  { id: "h4", name: "Eventos", cover: IMG("1511578314322-379afb476865", 300), tint: "#0ea5e9" },
  { id: "h5", name: "Prêmios", cover: IMG("1519681393784-d120267933ba", 300), tint: "#eab308" },
  { id: "h6", name: "Clientes", cover: IMG("1517245386807-bb43f82c33c4", 300), tint: "#22c55e" },
];

const types: PostType[] = ["carousel", "image", "video", "reel", "story", "image", "carousel", "image", "reel", "image", "video", "carousel"];
const statuses: PostStatus[] = [
  "approved", "approved", "pending", "pending", "revision",
  "draft", "pending", "approved", "pending", "draft", "revision", "pending",
];

const photos = [
  "1618005182384-a83a8bd57fbe",
  "1531403009284-440f080d1e12",
  "1497436072909-60f360e1d4b1",
  "1441974231531-c6227db76b6e",
  "1519681393784-d120267933ba",
  "1470252649378-9c29740c9fa8",
  "1500534314209-a25ddb2bd429",
  "1493246507139-91e8fad9978e",
  "1476514525535-07fb3b4ae5f1",
  "1447752875215-b2761acb3c5d",
  "1517649763962-0c623066013b",
  "1526401485004-46910ecc8e51",
];

const titles = [
  "Lançamento da nova campanha",
  "Bastidores do shooting",
  "Case: +230% em conversões",
  "Reels: 3 erros que travam sua marca",
  "Convite para o workshop",
  "Ensaio para a coleção 2026",
  "Depoimento do cliente Aurora",
  "Reflexão de segunda-feira",
  "Reels: passo a passo em 30s",
  "Novos serviços da agência",
  "Vídeo institucional 2026",
  "Carrossel: 7 princípios de branding",
];

const captions = [
  "Uma nova era começa aqui. Preparamos cada detalhe pensando em você.",
  "Nada acontece sem processo. Veja o que rola por trás das câmeras.",
  "Resultados que falam por si só. Vem entender como chegamos lá.",
  "Salve esse reels — vai mudar sua forma de criar conteúdo.",
  "Vagas limitadas. Garanta a sua no link da bio.",
  "Uma coleção pensada para quem constrói o próprio caminho.",
  "Clientes que se tornam família. Obrigado, Aurora ✨",
  "Comece leve. Continue firme.",
  "Curto, direto e pra você aplicar hoje mesmo.",
  "Estamos ampliando nossa entrega. Descubra os novos serviços.",
  "Um manifesto em movimento. Dê o play.",
  "Princípios que estruturam marcas duradouras. Salve para depois.",
];

const dates = [
  "2026-07-02", "2026-07-04", "2026-07-06", "2026-07-08",
  "2026-07-10", "2026-07-12", "2026-07-14", "2026-07-16",
  "2026-07-18", "2026-07-20", "2026-07-22", "2026-07-24",
];

const times = ["09:00", "11:30", "14:00", "17:00", "19:30", "20:00", "09:30", "12:00", "15:30", "18:00", "10:00", "16:00"];

export const initialPosts: Post[] = photos.map((id, i) => ({
  id: `p${i + 1}`,
  media: IMG(id, 800),
  thumb: IMG(id, 400),
  type: types[i],
  status: statuses[i],
  title: titles[i],
  caption: captions[i],
  objective: i % 3 === 0 ? "Reconhecimento de marca" : i % 3 === 1 ? "Engajamento" : "Conversão",
  notes: "",
  date: dates[i],
  time: times[i],
  approvalStatus: "pending",
  clientComment: "",
}));