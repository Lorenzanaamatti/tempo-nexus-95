import wordmarkLight from "@/assets/ic-wordmark.png.asset.json";
import wordmarkDark from "@/assets/ic-wordmark-dark.png.asset.json";

type Variant = "noir" | "clear" | "auto";

/**
 * Interesante Compañía · logotipo oficial (wordmark).
 * "noir" para fondos claros, "clear" para fondos oscuros, "auto" sigue el tema.
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
  const base = className ?? "";

  if (variant === "clear") {
    return <img src={wordmarkDark.url} alt={alt} className={base} />;
  }

  if (variant === "noir") {
    return <img src={wordmarkLight.url} alt={alt} className={base} />;
  }

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