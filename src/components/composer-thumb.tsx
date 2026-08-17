import { useComposerPhotoUrl } from "@/lib/composers-api";

export function ComposerThumb({
  path,
  alt,
  fallback,
  className,
  imgClassName,
  fallbackClassName,
}: {
  path?: string | null;
  alt?: string;
  fallback: React.ReactNode;
  className?: string;
  imgClassName?: string;
  /** Clases alternativas cuando no hay foto (evita huecos vacíos grandes). */
  fallbackClassName?: string;
}) {
  const { data: url } = useComposerPhotoUrl(path);
  if (!path || !url) {
    return <div className={fallbackClassName ?? className}>{fallback}</div>;
  }
  return (
    <div className={className}>
      <img src={url} alt={alt ?? ""} className={imgClassName} />
    </div>
  );
}