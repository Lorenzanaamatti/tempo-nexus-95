import wordmarkLight from "@/assets/ic-wordmark.png.asset.json";
import wordmarkDark from "@/assets/ic-wordmark-dark.png.asset.json";

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
  const base = className ?? "";
  return (
    <>
      <img
        src={wordmarkLight.url}
        alt={alt}
        className={`${base} block dark:hidden`.trim()}
      />
      <img
        src={wordmarkDark.url}
        alt=""
        aria-hidden="true"
        className={`${base} hidden dark:block`.trim()}
      />
    </>
  );
}