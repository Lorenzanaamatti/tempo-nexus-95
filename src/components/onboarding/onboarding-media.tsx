import { useMediaUrl, type OnboardingMedia } from "@/lib/onboarding";

function One({ m, className }: { m: OnboardingMedia; className?: string }) {
  const url = useMediaUrl(m);
  if (!url) return <div className={`animate-pulse bg-muted ${className ?? ""}`} />;
  if (m.kind === "video")
    return <video src={url} autoPlay loop muted playsInline className={`object-cover ${className ?? ""}`} />;
  return <img src={url} alt="" loading="lazy" className={`object-cover ${className ?? ""}`} />;
}

export function OnboardingMediaGrid({ media }: { media: OnboardingMedia[] }) {
  if (!media.length) return null;
  if (media.length === 1)
    return <One m={media[0]} className="h-full max-h-[60vh] w-full rounded-xl" />;
  const cols = media.length <= 2 ? "grid-cols-2" : media.length <= 4 ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4";
  return (
    <div className={`grid content-start gap-2 ${cols}`}>
      {media.map((m, i) => (
        <One key={i} m={m} className="aspect-video w-full rounded-lg" />
      ))}
    </div>
  );
}
