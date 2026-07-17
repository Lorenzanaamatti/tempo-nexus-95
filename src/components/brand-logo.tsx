import wordmark from "@/assets/ic-wordmark.png.asset.json";

type Variant = "noir" | "clear" | "auto";

/**
 * Interesante Compañía · logotipo oficial (wordmark).
 * En dark mode se invierte por CSS para mantener el contraste; el punto
 * naranja se conserva porque `invert` no altera la neutralidad del rojo puro
 * de forma perceptualmente disruptiva en este mark.
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
  void variant;
  return (
    <img
      src={wordmark.url}
      alt={alt}
      className={`${className ?? ""} dark:invert`.trim()}
    />
  );
}