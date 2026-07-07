import logo from "@/assets/ic-logo.png.asset.json";

type Variant = "noir" | "clear" | "auto";

/**
 * Interesante Compañía wordmark.
 * variant is kept for backward compatibility; the current mark works on
 * both light and dark surfaces.
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
  // The new "int" mark is used for every variant.
  void variant;
  return <img src={logo.url} alt={alt} className={className} />;
}