import type { Product } from "@/app/lib/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const toAbsoluteUrl = (value: string) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (!siteUrl) return value;
  return new URL(value, siteUrl).toString();
};

export function generateProductSchema(product: Product) {
  const image = toAbsoluteUrl(product.images?.[0] ?? "");

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: image ? [image] : [],
    sku: product.sku ?? product.id,
    brand: {
      "@type": "Brand",
      name: "SHIDS STYLE",
    },
    aggregateRating: typeof product.rating === "number"
      ? {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: 1,
      }
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: Number(product.price ?? 0),
      availability: Number(product.stock ?? 0) > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: product.slug ? toAbsoluteUrl(`/products/${product.slug}`) : undefined,
    },
  };
}
