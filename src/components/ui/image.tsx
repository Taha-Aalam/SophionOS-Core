import Image from "next/image";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

/**
 * Project-standard image component wrapping next/image.
 * Enforces modern formats (WebP/AVIF), lazy loading by default,
 * and requires dimensions to prevent CLS.
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  priority = false,
  className,
  sizes,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
