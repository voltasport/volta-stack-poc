import Image from "next/image";
import type {CSSProperties} from "react";

type MarketingPhotoProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  sizes?: string;
};

export function MarketingPhoto({
  src,
  alt,
  className = "ph ph-d",
  style,
  priority,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: MarketingPhotoProps) {
  return (
    <div className={`${className} ph-img`.trim()} style={style}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} />
    </div>
  );
}
