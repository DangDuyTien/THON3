import { forwardRef } from "react";
import {
  getImageAttributes,
  getCmsImagePosition,
  resolveCmsImage,
} from "../media.js";

const AdaptiveImage = forwardRef(function AdaptiveImage(
  {
    alt,
    colorVariant = "base",
    imagePosition,
    imageVariant = "full",
    loading,
    media,
    placeholderBackground = true,
    priority = false,
    sizes = "100vw",
    src,
    style,
    ...imageProps
  },
  ref,
) {
  const cmsImage = resolveCmsImage(media || src);
  const attributes = getImageAttributes(cmsImage || src, imageVariant, colorVariant);
  const backgroundColor = placeholderBackground && cmsImage?.placeholder
    ? cmsImage.placeholder
    : undefined;
  const image = (
    <img
      {...imageProps}
      ref={ref}
      alt={alt ?? cmsImage?.alt ?? ""}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      height={attributes?.height}
      loading={priority ? "eager" : loading ?? "lazy"}
      sizes={attributes ? sizes : undefined}
      src={attributes?.src || src}
      srcSet={attributes?.srcSet || undefined}
      style={{
        backgroundColor,
        objectPosition: imagePosition || getCmsImagePosition(cmsImage),
        ...style,
      }}
      width={attributes?.width}
    />
  );

  if (!attributes?.avifSrcSet) return image;

  return (
    <picture>
      <source srcSet={attributes.avifSrcSet} sizes={sizes} type="image/avif" />
      {image}
    </picture>
  );
});

export default AdaptiveImage;
