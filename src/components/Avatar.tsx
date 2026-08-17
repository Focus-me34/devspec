import { initials, tint } from "@/lib/avatar";

/** A person's picture where they have one, their initials on a stable colour
 *  where they do not. Same element either way so the surrounding layout does
 *  not shift when somebody uploads a photo.
 *
 *  Plain <img> rather than next/image on purpose: the source is a data URL
 *  already sized by the browser, so there is nothing for the optimiser to do
 *  and routing it through /_next/image would only add a request. */
export default function Avatar({
  name, src, size, className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = size ? { width: size, height: size, borderRadius: Math.round(size / 3.4) } : undefined;

  if (src) {
    return (
      <img
        className={`av av-img ${className}`.trim()}
        src={src}
        alt=""
        aria-hidden="true"
        style={style}
      />
    );
  }

  return (
    <span
      className={`av ${className}`.trim()}
      aria-hidden="true"
      style={{ background: tint(name), ...style }}
    >
      {initials(name)}
    </span>
  );
}
