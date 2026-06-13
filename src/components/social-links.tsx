import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export type SocialKey =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "x"
  | "youtube"
  | "linkedin"
  | "whatsapp"
  | "imdb"
  | "tmdb"
  | "filmaffinity"
  | "spotify"
  | "soundcloud"
  | "bandcamp"
  | "website";

export const SOCIAL_PLATFORMS: { key: SocialKey; label: string; placeholder: string }[] = [
  { key: "instagram",    label: "Instagram",    placeholder: "https://instagram.com/usuario" },
  { key: "tiktok",       label: "TikTok",       placeholder: "https://tiktok.com/@usuario" },
  { key: "facebook",     label: "Facebook",     placeholder: "https://facebook.com/usuario" },
  { key: "x",            label: "X / Twitter",  placeholder: "https://x.com/usuario" },
  { key: "youtube",      label: "YouTube",      placeholder: "https://youtube.com/@canal" },
  { key: "linkedin",     label: "LinkedIn",     placeholder: "https://linkedin.com/in/usuario" },
  { key: "whatsapp",     label: "WhatsApp",     placeholder: "https://wa.me/34600000000" },
  { key: "imdb",         label: "IMDb",         placeholder: "https://imdb.com/name/nmXXXXXXX" },
  { key: "tmdb",         label: "TMDb",         placeholder: "https://themoviedb.org/person/XXXXXX" },
  { key: "filmaffinity", label: "FilmAffinity", placeholder: "https://filmaffinity.com/es/name.php?name-id=..." },
  { key: "spotify",      label: "Spotify",      placeholder: "https://open.spotify.com/artist/..." },
  { key: "soundcloud",   label: "SoundCloud",   placeholder: "https://soundcloud.com/usuario" },
  { key: "bandcamp",     label: "Bandcamp",     placeholder: "https://usuario.bandcamp.com" },
  { key: "website",      label: "Web personal", placeholder: "https://midominio.com" },
];

export type SocialLinks = Partial<Record<SocialKey, string>> & {
  custom?: { label: string; url: string }[];
};

export function SocialLinksEditor({
  value,
  onChange,
}: {
  value: SocialLinks | null | undefined;
  onChange: (next: SocialLinks) => void;
}) {
  const v: SocialLinks = value && typeof value === "object" ? value : {};
  const [customLabel, setCustomLabel] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  function setField(key: SocialKey, url: string) {
    const next: SocialLinks = { ...v };
    if (url.trim()) next[key] = url.trim();
    else delete next[key];
    onChange(next);
  }
  function addCustom() {
    if (!customLabel.trim() || !customUrl.trim()) return;
    onChange({
      ...v,
      custom: [...(v.custom ?? []), { label: customLabel.trim(), url: customUrl.trim() }],
    });
    setCustomLabel("");
    setCustomUrl("");
  }
  function removeCustom(idx: number) {
    onChange({ ...v, custom: (v.custom ?? []).filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {SOCIAL_PLATFORMS.map((p) => (
          <div key={p.key} className="space-y-1">
            <label className="smallcaps text-xs text-muted-foreground">{p.label}</label>
            <Input
              type="url"
              value={v[p.key] ?? ""}
              onChange={(e) => setField(p.key, e.target.value)}
              placeholder={p.placeholder}
              className="rounded-sm"
            />
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-dashed border-border p-3">
        <p className="smallcaps mb-2 text-xs text-muted-foreground">Otro portal</p>
        {(v.custom ?? []).length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {(v.custom ?? []).map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="min-w-[120px] font-medium">{c.label}</span>
                <a href={c.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-primary hover:underline">{c.url}</a>
                <button
                  type="button"
                  onClick={() => removeCustom(i)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Nombre (ej. Vimeo)"
            className="w-44 rounded-sm"
          />
          <Input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://…"
            className="flex-1 rounded-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustom}>
            Añadir
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SocialLinksBadges({
  value,
  className,
}: {
  value: SocialLinks | null | undefined;
  className?: string;
}) {
  const v: SocialLinks = value && typeof value === "object" ? value : {};
  const entries = SOCIAL_PLATFORMS.filter((p) => v[p.key]).map((p) => ({
    label: p.label,
    url: v[p.key]!,
  }));
  const customs = (v.custom ?? []).map((c) => ({ label: c.label, url: c.url }));
  const all = [...entries, ...customs];
  if (all.length === 0) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        Sin enlaces sociales registrados.
      </p>
    );
  }
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {all.map((e, i) => (
        <a key={i} href={e.url} target="_blank" rel="noreferrer">
          <Badge variant="outline" className="rounded-sm transition hover:bg-muted">
            {e.label}
          </Badge>
        </a>
      ))}
    </div>
  );
}