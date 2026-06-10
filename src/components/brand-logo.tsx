import noir from "@/assets/ic-logo-noir.png.asset.json";
import clear from "@/assets/ic-logo-clear.png.asset.json";

type Variant = "noir" | "clear" | "auto";

/**
 * Interesante Compañía wordmark.
 * variant="noir"  → para fondos oscuros (tipografía blanca + acento coral)
 * variant="clear" → para fondos claros (tipografía negra + acento coral)
 * variant="auto"  → elige según `prefers-color-scheme` (renderiza ambos vía <picture>)
 */
export function BrandLogo({
  variant = "auto",
  className,
  alt = "Interesante Compañía",
}: {
  variant?: Variant;
  className?: string;
  alt?: string;
}) {
  if (variant === "noir") {
    return <img src={noir.url} alt={alt} className={className} />;
  }
  if (variant === "clear") {
    return <img src={clear.url} alt={alt} className={className} />;
  }
  return (
    <picture>
      <source srcSet={noir.url} media="(prefers-color-scheme: dark)" />
      <img src={clear.url} alt={alt} className={className} />
    </picture>
  );
}