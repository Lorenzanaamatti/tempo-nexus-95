import { useMediaUrl, type OnboardingMedia } from "@/lib/onboarding";

function One({ m, className, contain }: { m: OnboardingMedia; className?: string; contain?: boolean }) {
  const url = useMediaUrl(m);
  const fit = contain ? "object-contain" : "object-cover";
  if (!url) return <div className={`animate-pulse bg-muted ${className ?? ""}`} />;
  if (m.kind === "video")
    return <video src={url} autoPlay loop muted playsInline className={`${fit} ${className ?? ""}`} />;
  return <img src={url} alt="" loading="lazy" className={`${fit} ${className ?? ""}`} />;
}

/** fill: ocupa todo el alto disponible (dentro de la diapositiva). */
export function OnboardingMediaGrid({ media, fill, stretch }: { media: OnboardingMedia[]; fill?: boolean; stretch?: boolean }) {
  if (!media.length) return null;
  if (stretch) return <One m={media[0]} contain className="h-full w-full" />;
  if (media.length === 1)
    return <One m={media[0]} contain={fill} className={fill ? "h-full w-full rounded-2xl" : "aspect-video w-full rounded-lg"} />;
  const cols = media.length <= 4 ? "grid-cols-2" : media.length <= 6 ? "grid-cols-3" : "grid-cols-4";
  return (
    <div className={`grid gap-4 ${cols} ${fill ? "h-full auto-rows-fr" : "content-start"}`}>
      {media.map((m, i) => (
        <One key={i} m={m} className={fill ? "h-full min-h-0 w-full rounded-xl" : "aspect-video w-full rounded-lg"} />
      ))}
    </div>
  );
}
