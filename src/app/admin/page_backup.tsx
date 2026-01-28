"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getProductPrice, useCommerceStore } from "@/app/lib/store";
import { formatCurrency, slugify } from "@/app/lib/utils";
import type { OrderStatus, Product } from "@/app/lib/types";

const statuses: OrderStatus[] = ["pending", "paid", "fulfilled", "shipped", "cancelled"];

type ProductFormState = {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  stock: number;
  colors: string;
  sizes: string;
  tags: string;
  highlights: string;
  images: string;
  badge?: string;
};

export default function AdminPage() {
  const {
    products,
    orders,
    updateProductStock,
    updateProductDiscount,
    updateProduct,
    createProduct,
    updateOrderStatus,
  } = useCommerceStore();

  const [productId, setProductId] = useState<string>(products[0]?.id ?? "");
  const [stock, setStock] = useState<number>(products[0]?.stock ?? 0);
  const [discount, setDiscount] = useState<number>(products[0]?.discountPercent ?? 0);
  const [flash, setFlash] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    description: "",
    category: "",
    price: 0,
    originalPrice: undefined,
    discountPercent: 0,
    stock: 0,
    colors: "",
    sizes: "",
    tags: "",
    highlights: "",
    images: "",
    badge: "",
  });

  useEffect(() => {
    const next = products.find((p) => p.id === productId);
    if (!next) return;
    setStock(next.stock);
    setDiscount(next.discountPercent ?? 0);
    setProductForm({
      id: next.id,
      name: next.name,
      description: next.description,
      category: next.category,
      price: next.price,
      originalPrice: next.originalPrice,
      discountPercent: next.discountPercent ?? 0,
      stock: next.stock,
      colors: next.colors.join(", "),
      sizes: next.sizes.join(", "),
      tags: next.tags.join(", "),
      highlights: next.highlights.join(";") || next.highlights.join(", "),
      images: next.images.join(", "),
      badge: next.badge ?? "",
    });
    setFormMode("edit");
  }, [productId, products]);

  const lowInventory = useMemo(() => products.filter((p) => p.stock <= 5), [products]);

  const handleUpdate = () => {
    if (!productId) return;
    updateProductStock(productId, stock);
    updateProductDiscount(productId, discount);
    setFlash("Inventory updated");
    setTimeout(() => setFlash(null), 1800);
  };

  const handleFormSubmit = () => {
    if (formMode === "create") {
      handleCreate();
    } else {
      handleEdit();
    }
  };

  const parseList = (value: string) =>
    value
      .split(/[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      category: "",
      price: 0,
      originalPrice: undefined,
      discountPercent: 0,
      stock: 0,
      colors: "",
      sizes: "",
      tags: "",
      highlights: "",
      images: "",
      badge: "",
    });
    setFormMode("create");
  };

  const handleCreate = () => {
    const payload: Product = {
      id: productForm.id || slugify(productForm.name || "new-product"),
      name: productForm.name,
      slug: slugify(productForm.name || "new-product"),
      description: productForm.description,
      category: productForm.category,
      price: Number(productForm.price) || 0,
      originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : undefined,
      discountPercent: productForm.discountPercent ? Number(productForm.discountPercent) : 0,
      stock: Number(productForm.stock) || 0,
      colors: parseList(productForm.colors),
      sizes: parseList(productForm.sizes),
      tags: parseList(productForm.tags),
      highlights: parseList(productForm.highlights),
      images: parseList(productForm.images),
      badge: productForm.badge?.trim() || undefined,
      rating: 4.5,
    };
    createProduct(payload);
    resetForm();
    setFlash("Product created");
    setTimeout(() => setFlash(null), 1800);
  };

  const handleEdit = () => {
    if (!productForm.id) return;
    const updates: Partial<Product> = {
      name: productForm.name,
      description: productForm.description,
      category: productForm.category,
      price: Number(productForm.price) || 0,
      originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : undefined,
      discountPercent: productForm.discountPercent ? Number(productForm.discountPercent) : 0,
      stock: Number(productForm.stock) || 0,
      colors: parseList(productForm.colors),
      sizes: parseList(productForm.sizes),
      tags: parseList(productForm.tags),
      highlights: parseList(productForm.highlights),
      images: parseList(productForm.images),
      badge: productForm.badge?.trim() || undefined,
    };
    updateProduct(productForm.id, updates);
    setFlash("Product updated");
    setTimeout(() => setFlash(null), 1800);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">Admin Panel</p>
            <h1 className="text-3xl font-display font-bold text-gray-900">Products, Orders & Inventory</h1>
          </div>
          <Link href="/" className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-400 transition">← Back to Store</Link>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-gray-900">Product Editor</h2>
              {flash && <span className="text-sm font-medium text-green-600">{flash}</span>}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-700 font-medium md:col-span-2">
                Mode
                <div className="mt-2 flex gap-2">
                  <button
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${formMode === "create" ? "bg-black text-white" : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"}`}
                    onClick={() => {
                      resetForm();
                      setFormMode("create");
                    }}
                  >
                    Create New
                  </button>
                  <button
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${formMode === "edit" ? "bg-black text-white" : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"}`}
                    onClick={() => setFormMode("edit")}
                  >
                    Edit Existing
                  </button>
                </div>
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Select product (for edit)
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id} className="bg-white text-gray-700">
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Name
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.name}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Category
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.category}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Description
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.description}
                  rows={3}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Price
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  type="number"
                  min={0}
                  value={productForm.price}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Compare at (original)
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  type="number"
                  min={0}
                  value={productForm.originalPrice ?? ""}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, originalPrice: Number(event.target.value) }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Discount %
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  type="number"
                  min={0}
                  max={90}
                  value={productForm.discountPercent ?? 0}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, discountPercent: Number(event.target.value) }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Stock
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  type="number"
                  min={0}
                  value={productForm.stock}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, stock: Number(event.target.value) }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Colors (comma/semicolon separated)
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.colors}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, colors: event.target.value }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Sizes (comma/semicolon separated)
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.sizes}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, sizes: event.target.value }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Tags (comma/semicolon separated)
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.tags}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, tags: event.target.value }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Highlights (comma/semicolon separated)
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.highlights}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, highlights: event.target.value }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Images (comma/semicolon separated URLs)
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.images}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, images: event.target.value }))}
                />
              </label>

              <label className="text-sm text-gray-700 font-medium">
                Badge (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  value={productForm.badge ?? ""}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, badge: event.target.value }))}
                />
              </label>

              <div className="md:col-span-2 flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={handleFormSubmit}
                  className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  {formMode === "create" ? "Create Product" : "Save Changes"}
                </button>
                <button
                  onClick={resetForm}
                  className="rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Reset Form
                </button>
                <button
                  onClick={handleUpdate}
                  className="rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Update Stock & Discount
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold text-gray-900">Low Stock Alert</h2>
              <span className="text-sm text-gray-500">{lowInventory.length} items</span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {lowInventory.length === 0 && <p className="text-gray-500">All products have sufficient stock.</p>}
              {lowInventory.map((product) => {
                const price = getProductPrice(product);
                return (
                  <div key={product.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-600">{product.stock} units • {formatCurrency(price.sale)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setProductId(product.id);
                        setStock(product.stock + 10);
                        setDiscount(product.discountPercent ?? 0);
                      }}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-white transition"
                    >
                      +10 units
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold text-gray-900">Orders</h2>
              <span className="text-sm text-gray-500">{orders.length} total</span>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-700">{orders.map((order) => (
                <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{order.id}</p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</div>
                    <select
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-gray-400 focus:outline-none"
                      value={order.status}
                      onChange={(event) => updateOrderStatus(order.id, event.target.value as OrderStatus)}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status} className="bg-white text-gray-700">
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{order.email} • {order.address}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                    {order.items.map((item) => {
                      const product = products.find((p) => p.id === item.productId);
                      return (
                        <span key={item.productId + item.size + item.color} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                          {product?.name ?? item.productId} × {item.quantity}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Product Catalog</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-700">{products.map((product) => {
                const price = getProductPrice(product);
                return (
                  <div key={product.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category} • {product.stock} in stock</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-gray-900">{formatCurrency(price.sale)}</p>
                      {product.discountPercent ? (
                        <p className="text-xs text-green-600">-{product.discountPercent}% active</p>
                      ) : (
                        <p className="text-xs text-gray-400">No discount</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
