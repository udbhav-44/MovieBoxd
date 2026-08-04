import Image from "next/image";
import { posterUrl } from "@/lib/images";

export function Poster({
  path,
  title,
  className = "",
}: {
  path: string | null | undefined;
  title: string;
  className?: string;
}) {
  const src = posterUrl(path, "w342");

  return (
    <div
      className={`poster-frame relative aspect-[2/3] overflow-hidden bg-[#ddd6c8] ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={`${title} poster`}
          fill
          sizes="(max-width: 640px) 45vw, 180px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-end p-3">
          <span className="display text-lg leading-tight text-[var(--ink-soft)]">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
