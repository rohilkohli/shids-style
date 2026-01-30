import { defaultProducts } from "@/app/lib/data";
import ProductDetailClient from "./ProductDetailClient";

export const dynamicParams = true;

export function generateStaticParams() {
  return defaultProducts.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetailClient key={slug} slug={slug} />;
}
