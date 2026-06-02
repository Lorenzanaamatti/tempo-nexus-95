export const SOCIAL_CHANNELS = ["instagram", "facebook", "linkedin", "youtube", "tiktok", "otra"] as const;
export type SocialChannel = (typeof SOCIAL_CHANNELS)[number];

export const SOCIAL_CHANNEL_LABEL: Record<SocialChannel, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  otra: "Otras",
};

export const SOCIAL_FORMATS = ["feed", "reel", "story", "carousel", "video", "live", "articulo"] as const;
export type SocialFormat = (typeof SOCIAL_FORMATS)[number];

export const SOCIAL_FORMAT_LABEL: Record<SocialFormat, string> = {
  feed: "Feed",
  reel: "Reel",
  story: "Story",
  carousel: "Carrusel",
  video: "Vídeo",
  live: "Directo",
  articulo: "Artículo",
};

export const SOCIAL_POST_STATUSES = ["borrador", "en_revision", "aprobado", "programado", "publicado", "archivado"] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const SOCIAL_POST_STATUS_LABEL: Record<SocialPostStatus, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  programado: "Programado",
  publicado: "Publicado",
  archivado: "Archivado",
};

export const SOCIAL_ASSET_KINDS = ["image", "video", "audio", "gif", "documento"] as const;
export type SocialAssetKind = (typeof SOCIAL_ASSET_KINDS)[number];