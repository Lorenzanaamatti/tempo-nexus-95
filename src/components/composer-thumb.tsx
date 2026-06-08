import { useComposerPhotoUrl } from "@/lib/composers-api";

export function ComposerThumb({
  path,
  alt,
  fallback,
  className,
  imgClassName,
}: {
  path?: string | null;
  alt?: string;
  fallback: React.ReactNode;
  className?: string;
  imgClassName?: string;
}) {
  const { data: url } = useComposerPhotoUrl(path);
  if (!path || !url) {
    return <div className={className}>{fallback}</div>;
  }
  return (
    <div className={className}>
      <img src={url} alt={alt ?? ""} className={imgClassName} />
    </div>
  );
}