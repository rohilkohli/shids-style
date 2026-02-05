"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductPrice, useCommerceStore } from "@/app/lib/store";
import { formatCurrency, formatDate, formatDateTime, slugify } from "@/app/lib/utils";
import type { OrderStatus, Product, Order, Customer, DiscountCode } from "@/app/lib/types";

const statuses: OrderStatus[] = ["pending", "processing", "paid", "packed", "fulfilled", "shipped", "cancelled"];

type View = "dashboard" | "products" | "orders" | "customers" | "ledger" | "discounts" | "hero" | "newsletter";

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

type HeroEntry = {
  id: number;
  position: number;
  product_id: string;
  product: Product;
};

type NewsletterEntry = {
  id: number;
  email: string;
  created_at: string;
};

type ProfileSummary = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role?: "admin" | "customer" | null;
  createdAt?: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const {
    products,
    orders,
    discountCodes,
    user,
    ready,
    signOut,
    updateProduct,
    createProduct,
    deleteProduct,
    updateOrderStatus,
    verifyPayment,
    deleteOrder,
    deleteCustomer,
    createDiscountCode,
    updateDiscountCode,
    deleteDiscountCode,
    toggleDiscountCodeActive,
  } = useCommerceStore();

  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showProductPanel, setShowProductPanel] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [productStep, setProductStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showRawImages, setShowRawImages] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [awbNumber, setAwbNumber] = useState("");
  const [heroItems, setHeroItems] = useState<HeroEntry[]>([]);
  const [newsletterEmails, setNewsletterEmails] = useState<NewsletterEntry[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [heroProductId, setHeroProductId] = useState("");
  const [heroPosition, setHeroPosition] = useState(0);
  const [marketingMessage, setMarketingMessage] = useState<string | null>(null);
  const [discountForm, setDiscountForm] = useState({
    code: "",
    description: "",
    type: "percentage" as "percentage" | "fixed",
    value: 0,
    maxUses: undefined as number | undefined,
    expiryDate: "",
  });
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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedProduct && products.length) {
      setSelectedProduct(products[0]);
    }
  }, [products, selectedProduct]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/");
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user || user.role !== "admin") return;
    const loadProfiles = async () => {
      try {
        const response = await fetch("/api/users");
        const json = await response.json();
        if (response.ok && json?.ok) {
          setProfiles(json.data as ProfileSummary[]);
        }
      } catch (error) {
        console.warn("Failed to load profiles", error);
      }
    };
    loadProfiles();
  }, [ready, user]);

  useEffect(() => {
    if (currentView !== "hero" && currentView !== "newsletter") return;
    const loadMarketing = async () => {
      try {
        const [heroRes, newsletterRes] = await Promise.all([
          fetch("/api/hero"),
          fetch("/api/newsletter"),
        ]);
        const heroJson = await heroRes.json();
        const newsletterJson = await newsletterRes.json();
        if (heroJson?.ok) {
          setHeroItems(heroJson.data as HeroEntry[]);
        }
        if (newsletterJson?.ok) {
          setNewsletterEmails(newsletterJson.data as NewsletterEntry[]);
        }
      } catch (error) {
        console.warn("Failed to load marketing data", error);
      }
    };
    loadMarketing();
  }, [currentView]);

  const categories = useMemo(() => ["all", ...new Set(products.map((p) => p.category))], [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((product) => {
      const matchesTerm = term
        ? product.name.toLowerCase().includes(term) || product.category.toLowerCase().includes(term)
        : true;
      const matchesCategory = categoryFilter === "all" ? true : product.category === categoryFilter;
      return matchesTerm && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // Calculate stats
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  const totalOrders = orders.length;

  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= 5), [products]);

  const adminEmails = useMemo(() => {
    return new Set(
      profiles
        .filter((profile) => profile.role === "admin")
        .map((profile) => profile.email.toLowerCase())
    );
  }, [profiles]);

  const customers = useMemo((): Customer[] => {
    const customerMap = new Map<string, Customer>();

    profiles.forEach((profile) => {
      const email = profile.email?.toLowerCase();
      if (!email || profile.role === "admin") return;
      if (!customerMap.has(email)) {
        customerMap.set(email, {
          email,
          name: profile.name ?? email.split("@")[0],
          totalOrders: 0,
          totalSpent: 0,
          orders: [],
        });
      }
    });

    orders.forEach((order) => {
      const email = order.email.toLowerCase();
      if (adminEmails.has(email)) return;
      const existing = customerMap.get(email);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += order.total;
        existing.orders.push(order);
      } else {
        customerMap.set(email, {
          email,
          name: email.split("@")[0],
          totalOrders: 1,
          totalSpent: order.total,
          orders: [order],
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders, profiles, adminEmails]);

  const totalCustomers = customers.length;

  const toMonthKey = (value: string) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}`;
  };

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${lastMonth.getMonth()}`;

  const currentMonthOrders = orders.filter((order) => toMonthKey(order.createdAt) === currentMonthKey);
  const lastMonthOrders = orders.filter((order) => toMonthKey(order.createdAt) === lastMonthKey);
  const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => sum + order.total, 0);
  const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.total, 0);
  const currentMonthOrderCount = currentMonthOrders.length;
  const lastMonthOrderCount = lastMonthOrders.length;

  const currentMonthCustomers = profiles.filter(
    (profile) => profile.role !== "admin" && profile.createdAt && toMonthKey(profile.createdAt) === currentMonthKey
  ).length;
  const lastMonthCustomers = profiles.filter(
    (profile) => profile.role !== "admin" && profile.createdAt && toMonthKey(profile.createdAt) === lastMonthKey
  ).length;

  const percentChange = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  const revenueChange = percentChange(currentMonthRevenue, lastMonthRevenue);
  const orderChange = percentChange(currentMonthOrderCount, lastMonthOrderCount);
  const customerChange = percentChange(currentMonthCustomers, lastMonthCustomers);

  const formatChange = (value: number) => {
    const sign = value >= 0 ? "+" : "-";
    return `${sign}${Math.abs(value).toFixed(1)}%`;
  };

  if (!mounted || !ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-gray-600">
        Loading admin console...
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Admin Access Only</h1>
          <p className="mt-2 text-sm text-gray-600">Please sign in with an admin account.</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link href="/login" className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white">Go to Login</Link>
            <Link href="/" className="rounded-full border border-gray-300 px-5 py-2 text-xs font-semibold text-gray-700">Back Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const addHeroProduct = async () => {
    if (!heroProductId) {
      setMarketingMessage("Select a product to add.");
      return;
    }
    try {
      const response = await fetch("/api/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: heroProductId, position: heroPosition }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to add hero product.");
      }
      setMarketingMessage("Hero product saved.");
      setHeroProductId("");
      setHeroPosition(0);
      const refreshed = await fetch("/api/hero");
      const refreshedJson = await refreshed.json();
      if (refreshedJson?.ok) {
        setHeroItems(refreshedJson.data as HeroEntry[]);
      }
    } catch (error) {
      setMarketingMessage((error as Error).message);
    }
    setTimeout(() => setMarketingMessage(null), 1600);
  };

  const removeHeroProduct = async (id: number) => {
    try {
      const response = await fetch(`/api/hero?id=${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to remove hero product.");
      }
      setHeroItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setMarketingMessage((error as Error).message);
      setTimeout(() => setMarketingMessage(null), 1600);
    }
  };

  const parseList = (value: string) =>
    value
      .split(/[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const parseImages = (value: string) => {
    return value
      .split(/\n+/)
      .flatMap((line) => {
        const trimmed = line.trim();
        if (!trimmed) return [] as string[];
        if (trimmed.startsWith("data:image")) {
          return [trimmed];
        }
        return trimmed
          .split(/[;,]+/)
          .map((item) => item.trim())
          .filter(Boolean);
      });
  };

  const productSteps = [
    { title: "Basics", description: "Name, category, description" },
    { title: "Pricing", description: "Price, discount, stock" },
    { title: "Options", description: "Colors, sizes, tags, highlights" },
    { title: "Media", description: "Images and uploads" },
    { title: "Review", description: "Final check before save" },
  ];
  const productPresets: {
    label: string;
    helper: string;
    values: Partial<ProductFormState>;
  }[] = [
    {
      label: "Bestseller Tee",
      helper: "240 GSM cotton, evergreen streetwear",
      values: {
        category: "Oversized Tees",
        price: 699,
        originalPrice: 999,
        stock: 80,
        tags: "oversized,streetwear,unisex,summer",
        highlights: "240 GSM cotton;Boxy fit;Pre-shrunk;Bio-washed",
        badge: "Bestseller",
      },
    },
    {
      label: "Denim Cargo",
      helper: "Utility-forward fit with stretch",
      values: {
        category: "Cargo & Denims",
        price: 1499,
        originalPrice: 1999,
        stock: 60,
        tags: "cargo,denim,utility,stretch",
        highlights: "Stretch denim;Six pockets;YKK zippers;Tailored taper",
        badge: "New drop",
      },
    },
    {
      label: "Dress Drop",
      helper: "Occasion-ready, light and flowy",
      values: {
        category: "Summer Dresses",
        price: 1299,
        originalPrice: 1699,
        stock: 50,
        tags: "dress,summer,occasion,lightweight",
        highlights: "Lined;Wrinkle-resistant;Pockets;Breathable weave",
        badge: "Limited",
      },
    },
  ];
  const lastProductStep = productSteps.length - 1;

  const resetForm = () => {
    setProductForm({
      id: undefined,
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
    setSelectedProduct(null);
    setProductStep(0);
  };

  const goToNextProductStep = () => {
    if (productStep === 0) {
      if (!productForm.name.trim()) {
        alert("Product name is required");
        return;
      }
      if (!productForm.category.trim()) {
        alert("Category is required");
        return;
      }
    }
    if (productStep === 1) {
      const price = Number(productForm.price) || 0;
      if (price <= 0) {
        alert("Price must be greater than 0");
        return;
      }
    }
    if (productStep === 3) {
      const images = parseImages(productForm.images);
      if (images.length === 0) {
        alert("Please add at least one image URL");
        return;
      }
    }
    setProductStep((prev) => Math.min(prev + 1, lastProductStep));
  };

  const goToPrevProductStep = () => {
    setProductStep((prev) => Math.max(prev - 1, 0));
  };

  const goToProductStep = (nextStep: number) => {
    if (nextStep <= productStep) {
      setProductStep(nextStep);
      return;
    }

    if (productStep === 0) {
      if (!productForm.name.trim()) {
        alert("Product name is required");
        return;
      }
      if (!productForm.category.trim()) {
        alert("Category is required");
        return;
      }
    }
    if (productStep === 1) {
      const price = Number(productForm.price) || 0;
      if (price <= 0) {
        alert("Price must be greater than 0");
        return;
      }
    }
    if (productStep === 3) {
      const images = parseImages(productForm.images);
      if (images.length === 0) {
        alert("Please add at least one image URL");
        return;
      }
    }

    setProductStep(Math.min(nextStep, lastProductStep));
  };

  const applyPreset = (preset: (typeof productPresets)[number]) => {
    setProductForm((prev) => ({
      ...prev,
      ...preset.values,
    }));
    setFlash(`Preset "${preset.label}" applied`);
    setTimeout(() => setFlash(null), 1400);
    setProductStep(1);
  };

  const reviewGaps = (() => {
    const gaps: string[] = [];
    if (!productForm.name.trim()) gaps.push("Name");
    if (!productForm.category.trim()) gaps.push("Category");
    if (!productForm.description.trim()) gaps.push("Description");
    if (!(Number(productForm.price) > 0)) gaps.push("Price");
    if (!(Number(productForm.stock) > 0)) gaps.push("Stock");
    if (parseImages(productForm.images).length === 0) gaps.push("Images");
    return gaps;
  })();

  const populateForm = (product: Product) => {
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent ?? 0,
      stock: product.stock,
      colors: product.colors.join(", "),
      sizes: product.sizes.join(", "),
      tags: product.tags.join(", "),
      highlights: product.highlights.join("; ") || product.highlights.join(", "),
      images: product.images.join(", "),
      badge: product.badge ?? "",
    });
  };

  const handleCreateOrUpdate = async () => {
    const name = productForm.name.trim();
    const category = productForm.category.trim();
    const price = Number(productForm.price) || 0;
    const colors = parseList(productForm.colors);
    const sizes = parseList(productForm.sizes);
    const tags = parseList(productForm.tags);
    const highlights = parseList(productForm.highlights);
    const images = parseImages(productForm.images);

    if (!name) {
      alert("Product name is required");
      return;
    }
    if (!category) {
      alert("Category is required");
      return;
    }
    if (price <= 0) {
      alert("Price must be greater than 0");
      return;
    }
    if (images.length === 0) {
      alert("Please add at least one image URL");
      return;
    }

    if (formMode === "create") {
      const payload: Omit<Product, "id" | "slug"> & { id?: string; slug?: string } = {
        id: productForm.id || slugify(productForm.name || "new-product"),
        name,
        slug: slugify(name || "new-product"),
        description: productForm.description,
        category,
        price,
        originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : undefined,
        discountPercent: productForm.discountPercent ? Number(productForm.discountPercent) : 0,
        stock: Number(productForm.stock) || 0,
        colors,
        sizes,
        tags,
        highlights,
        images,
        badge: productForm.badge?.trim() || undefined,
        rating: 4.5,
      };
      try {
        const created = await createProduct(payload);
        setSelectedProduct(created ?? null);
        setFlash("Product created");
      } catch (error) {
        setFlash((error as Error).message);
      }
    } else if (formMode === "edit" && selectedProduct) {
      const updates: Partial<Product> = {
        name,
        description: productForm.description,
        category,
        price,
        originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : undefined,
        discountPercent: productForm.discountPercent ? Number(productForm.discountPercent) : 0,
        stock: Number(productForm.stock) || 0,
        colors,
        sizes,
        tags,
        highlights,
        images,
        badge: productForm.badge?.trim() || undefined,
      };
      try {
        const updated = await updateProduct(selectedProduct.id, updates);
        setSelectedProduct(updated ?? selectedProduct);
        setFlash("Product updated");
      } catch (error) {
        setFlash((error as Error).message);
      }
    }

    setShowProductPanel(false);
    setSearchTerm("");
    setCategoryFilter("all");
    setTimeout(() => setFlash(null), 1600);
  };

  const resizeImageToDataUrl = (file: File, maxSize = 1400) =>
    new Promise<string>((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Unsupported file type"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const width = img.width || maxSize;
          const height = img.height || maxSize;
          let targetWidth = width;
          let targetHeight = height;

          if (width >= height && width > maxSize) {
            targetWidth = maxSize;
            targetHeight = Math.round((height / width) * maxSize);
          } else if (height > width && height > maxSize) {
            targetHeight = maxSize;
            targetWidth = Math.round((width / height) * maxSize);
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to resize image"));
            return;
          }
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
          const dataUrl = canvas.toDataURL(mimeType, mimeType === "image/jpeg" ? 0.9 : undefined);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = String(reader.result);
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const results = await Promise.allSettled(
        Array.from(files).map(async (file) => {
          try {
            return await resizeImageToDataUrl(file);
          } catch {
            return await new Promise<string>((resolve, reject) => {
              const fallbackReader = new FileReader();
              fallbackReader.onload = () => resolve(String(fallbackReader.result));
              fallbackReader.onerror = () => reject(new Error("Failed to read image"));
              fallbackReader.readAsDataURL(file);
            });
          }
        })
      );

      const dataUrls = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
        .map((result) => result.value)
        .filter(Boolean);

      const failures = results.length - dataUrls.length;
      if (!dataUrls.length) {
        throw new Error("No images could be uploaded.");
      }
      setProductForm((prev) => {
        const existing = prev.images ? `${prev.images.trim()}\n` : "";
        return { ...prev, images: `${existing}${dataUrls.join("\n")}` };
      });
      if (failures > 0) {
        setFlash(`${failures} image(s) could not be processed and were skipped.`);
        setTimeout(() => setFlash(null), 1800);
      }
    } catch (error) {
      setFlash((error as Error).message);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const ok = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteProduct(product.id);
      setFlash("Product deleted");
      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null);
      }
      setTimeout(() => setFlash(null), 1600);
    } catch (error) {
      setFlash((error as Error).message);
    }
  };


  const handleOrderStatusUpdate = async (orderId: string, status: OrderStatus, awb?: string) => {
    if (status === "shipped" && !awb?.trim()) {
      alert("AWB Number is required to mark order as shipped");
      return;
    }
    try {
      const updated = await updateOrderStatus(orderId, status, awb);
      if (updated && selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
        setAwbNumber(updated.awbNumber || "");
      }
      if (awb) {
        setFlash(`Order ${orderId} updated to ${status} with AWB: ${awb}`);
      } else {
        setFlash(`Order ${orderId} updated to ${status}`);
      }
      setTimeout(() => setFlash(null), 2000);
    } catch (error) {
      setFlash((error as Error).message);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setAwbNumber(order.awbNumber || "");
    setShowOrderDetail(true);
  };

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetail(true);
  };

  const openProductCreate = () => {
    resetForm();
    setFormMode("create");
    setProductStep(0);
    setShowProductPanel(true);
  };

  const openProductEdit = (product: Product) => {
    setSelectedProduct(product);
    populateForm(product);
    setFormMode("edit");
    setProductStep(0);
    setShowProductPanel(true);
  };

  return (
    <div className="flex h-screen bg-slate-100/60">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col transform transition lg:static lg:translate-x-0 lg:w-64 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-indigo-400">SHIDS STYLE ADMIN</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <button
            onClick={() => setCurrentView("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === "dashboard"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </button>

          <button
            onClick={() => setCurrentView("products")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === "products"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Products
          </button>

          <button
            onClick={() => setCurrentView("orders")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === "orders"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Orders
          </button>

          <button
            onClick={() => setCurrentView("customers")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === "customers"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Customers
          </button>

          <button
            onClick={() => setCurrentView("discounts")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === "discounts"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Discount Codes
          </button>

          <button
            onClick={() => setCurrentView("hero")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === "hero"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Hero Carousel
          </button>

          <button
            onClick={() => setCurrentView("newsletter")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === "newsletter"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v12H4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m22 6-10 7L2 6" />
            </svg>
            Newsletter Emails
          </button>

          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Store
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "AD"}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.name ?? "Admin"}</p>
                  <p className="text-xs text-slate-400">{user?.email ?? "Store Manager"}</p>
                </div>
              </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <span className="text-lg">☰</span>
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Seller Panel</p>
                <h1 className="text-base sm:text-lg font-semibold text-slate-900">Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.replace("/login");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {flash && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" aria-live="polite">
              {flash}
            </div>
          )}
          {currentView === "dashboard" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Last updated: Just now</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <button
                  onClick={() => setCurrentView("ledger")}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-left hover:shadow-md transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(totalRevenue)}</p>
                      <p className={"text-sm mt-2 " + (revenueChange >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatChange(revenueChange)} from last month
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentView("orders")}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-left hover:shadow-md transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{totalOrders}</p>
                      <p className={"text-sm mt-2 " + (orderChange >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatChange(orderChange)} from last month
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentView("customers")}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-left hover:shadow-md transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{totalCustomers}</p>
                      <p className={"text-sm mt-2 " + (customerChange >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatChange(customerChange)} from last month
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <button
                        key={order.id}
                        onClick={() => openOrderDetail(order)}
                        className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Order #{order.id}</p>
                            <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Low Stock Alert</h2>
                  <div className="space-y-4">
                    {lowStockProducts.length === 0 ? (
                      <p className="text-sm text-gray-500">All products have sufficient stock.</p>
                    ) : (
                      lowStockProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => openProductEdit(product)}
                          className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100">
                              <Image
                                src={product.images?.[0] ?? "/file.svg"}
                                alt={product.name}
                                fill
                                sizes="40px"
                                quality={80}
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.stock} units left</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                            Low Stock
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {currentView === "products" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                <button
                  type="button"
                  onClick={openProductCreate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              </div>

              {/* Search & Filter */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1 relative">
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full md:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "all" ? "All categories" : cat}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Reset
                </button>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-500">
                          No products match your filters.
                        </td>
                      </tr>
                    )}
                    {filteredProducts.map((product) => {
                      const { sale, compareAt } = getProductPrice(product);
                      return (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100">
                                <Image
                                  src={product.images?.[0] ?? "/file.svg"}
                                  alt={product.name}
                                  fill
                                  sizes="40px"
                                  quality={80}
                                  className="object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">SKU: {product.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.stock > 5 ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                                Low Stock
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.stock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex flex-col">
                              <span>{formatCurrency(sale)}</span>
                              {compareAt !== product.price && (
                                <span className="text-xs text-gray-500 line-through">{formatCurrency(compareAt)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              type="button"
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                              onClick={() => openProductEdit(product)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDelete(product)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {currentView === "orders" && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
                <p className="text-sm text-gray-500 mt-1">{orders.length} total orders</p>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-500">
                          No orders yet.
                        </td>
                      </tr>
                    )}
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openOrderDetail(order)}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                          >
                            #{order.id}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{order.email}</p>
                            <p className="text-xs text-gray-500">{order.address}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.status === "paid" || order.status === "fulfilled" || order.status === "shipped" ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded flex items-center gap-1 w-fit">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {order.status}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                              {order.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) => handleOrderStatusUpdate(order.id, e.target.value as OrderStatus)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete order ${order.id}? This cannot be undone.`)) {
                                try {
                                  await deleteOrder(order.id);
                                  setFlash(`Order ${order.id} deleted`);
                                  setTimeout(() => setFlash(null), 2000);
                                } catch (error) {
                                  setFlash((error as Error).message);
                                }
                              }
                            }}
                            className="ml-2 text-xs text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {currentView === "customers" && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                <p className="text-sm text-gray-500 mt-1">{customers.length} total customers</p>
              </div>

              {/* Customers Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                          No customers yet.
                        </td>
                      </tr>
                    )}
                    {customers.map((customer) => (
                      <tr key={customer.email} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                            <p className="text-xs text-gray-500">{customer.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.totalOrders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.orders.length
                            ? formatDate(customer.orders[customer.orders.length - 1].createdAt)
                            : "No orders"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            onClick={() => openCustomerDetail(customer)}
                          >
                            View Details
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={async () => {
                              if (confirm(`Delete customer ${customer.email} and all their orders? This cannot be undone.`)) {
                                try {
                                  await deleteCustomer(customer.email);
                                  setProfiles((prev) =>
                                    prev.filter((profile) => profile.email.toLowerCase() !== customer.email.toLowerCase())
                                  );
                                  setFlash(`Customer ${customer.email} deleted`);
                                  setTimeout(() => setFlash(null), 2000);
                                } catch (error) {
                                  setFlash((error as Error).message);
                                }
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {currentView === "ledger" && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Revenue Ledger</h1>
                <p className="text-sm text-gray-500 mt-1">Complete transaction history</p>
              </div>

              {/* Ledger Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                          No ledger entries yet.
                        </td>
                      </tr>
                    )}
                    {orders
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(order.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => openOrderDetail(order)}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                            >
                              #{order.id}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.status === "paid" || order.status === "fulfilled" || order.status === "shipped" ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                {order.status}
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                                {order.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(order.total)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {currentView === "discounts" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
                  <p className="text-sm text-gray-500 mt-1">{discountCodes.length} active codes</p>
                </div>
                <button
                  onClick={() => {
                    setDiscountForm({
                      code: "",
                      description: "",
                      type: "percentage",
                      value: 0,
                      maxUses: undefined,
                      expiryDate: "",
                    });
                    setShowDiscountPanel(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Code
                </button>
              </div>

              {/* Discount Codes Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {discountCodes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">
                          No discount codes created yet.
                        </td>
                      </tr>
                    )}
                    {discountCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-full">{code.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{code.description || "-"}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {code.type === "percentage" ? `${code.value}%` : formatCurrency(code.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {code.maxUses ? `${code.usedCount}/${code.maxUses}` : `${code.usedCount} uses`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={async () => {
                              try {
                                await toggleDiscountCodeActive(code.id);
                              } catch (error) {
                                setFlash((error as Error).message);
                              }
                            }}
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              code.isActive
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            }`}
                          >
                            {code.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {code.expiryDate ? formatDate(code.expiryDate) : "No expiry"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={async () => {
                              if (confirm(`Delete code ${code.code}?`)) {
                                try {
                                  await deleteDiscountCode(code.id);
                                  setFlash(`Code ${code.code} deleted`);
                                  setTimeout(() => setFlash(null), 2000);
                                } catch (error) {
                                  setFlash((error as Error).message);
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {discountCodes.length === 0 && (
                <div className="mt-6 text-center p-8 bg-slate-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">No discount codes yet. Create your first code!</p>
                </div>
              )}
            </>
          )}

          {currentView === "hero" && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Hero Carousel</h1>
                <p className="text-sm text-gray-500 mt-1">Manage hero carousel products</p>
              </div>

              {marketingMessage && (
                <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                  {marketingMessage}
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Hero Carousel</h2>
                  <span className="text-xs text-gray-500">{heroItems.length} items</span>
                </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <select
                      className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={heroProductId}
                      onChange={(event) => setHeroProductId(event.target.value)}
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={heroPosition}
                      onChange={(event) => setHeroPosition(Number(event.target.value))}
                      placeholder="Position"
                    />
                    <button
                      className="sm:col-span-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      onClick={addHeroProduct}
                    >
                      Add / Update Hero
                    </button>
                  </div>

                  <div className="mt-5 overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Position
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {heroItems.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                              No hero products selected.
                            </td>
                          </tr>
                        )}
                        {heroItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{item.product?.name}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{item.position}</td>
                            <td className="px-4 py-3">
                              <button
                                className="text-xs font-semibold text-red-600 hover:text-red-900"
                                onClick={() => removeHeroProduct(item.id)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </div>
            </>
          )}

          {currentView === "newsletter" && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Newsletter Emails</h1>
                <p className="text-sm text-gray-500 mt-1">View all newsletter signups</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Newsletter Emails</h2>
                  <span className="text-xs text-gray-500">{newsletterEmails.length} total</span>
                </div>

                <div className="mt-4 max-h-[520px] overflow-x-auto overflow-y-auto border border-gray-100 rounded-lg">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {newsletterEmails.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-4 text-center text-sm text-gray-500">
                            No emails collected yet.
                          </td>
                        </tr>
                      )}
                      {newsletterEmails.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{entry.email}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDateTime(entry.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Product creation/edit panel overlay */}
      {showProductPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"
            onClick={() => setShowProductPanel(false)}
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white shadow-2xl overflow-y-auto rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">{formMode === "create" ? "New product" : "Edit product"}</p>
                <h3 className="text-xl font-bold text-gray-900">{formMode === "create" ? "Create Product" : productForm.name || "Update Product"}</h3>
              </div>
              <button
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowProductPanel(false)}
              >
                Close
              </button>
            </div>

            <div className="px-6 py-6 space-y-6 bg-white min-h-[calc(100vh-80px)]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {productSteps.map((step, index) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => goToProductStep(index)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      index === productStep
                        ? "border-indigo-200 bg-indigo-50"
                        : index < productStep
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">Step {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </button>
                ))}
              </div>

              {productStep === 0 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Seller shortcuts</p>
                        <p className="text-sm text-gray-700">Apply a preset to auto-fill pricing, tags, and highlights.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {productPresets.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-gray-800 border border-gray-200 shadow-sm hover:border-indigo-200 hover:text-indigo-700 transition"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                      {productPresets.map((preset) => (
                        <div key={`${preset.label}-helper`} className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2">
                          <p className="font-semibold text-gray-800">{preset.label}</p>
                          <p className="text-gray-600">{preset.helper}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-gray-700">
                      Name
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        value={productForm.name}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                      />
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      Category
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        value={productForm.category}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                      />
                    </label>

                    <label className="text-sm font-medium text-gray-700 md:col-span-2">
                      Description
                      <textarea
                        className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        rows={4}
                        value={productForm.description}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                      />
                    </label>
                  </div>
                </div>
              )}

              {productStep === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Price
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.price}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Compare at (original)
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.originalPrice ?? ""}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, originalPrice: Number(event.target.value) }))}
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Discount %
                    <input
                      type="number"
                      min={0}
                      max={90}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.discountPercent ?? 0}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, discountPercent: Number(event.target.value) }))}
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Stock
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.stock}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, stock: Number(event.target.value) }))}
                    />
                  </label>
                </div>
              )}

              {productStep === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Colors (comma/semicolon)
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.colors}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, colors: event.target.value }))}
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Sizes (comma/semicolon)
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.sizes}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, sizes: event.target.value }))}
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Tags (comma/semicolon)
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.tags}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, tags: event.target.value }))}
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Highlights (comma/semicolon)
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.highlights}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, highlights: event.target.value }))}
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700 md:col-span-2">
                    Badge (optional)
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.badge ?? ""}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, badge: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {productStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Images</p>
                        <p className="text-xs text-gray-500">
                          {parseImages(productForm.images).length} image(s) attached
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-gray-600 hover:text-black"
                        onClick={() => setShowRawImages((prev) => !prev)}
                      >
                        {showRawImages ? "Hide raw URLs" : "Show raw URLs"}
                      </button>
                    </div>

                    {showRawImages && (
                      <label className="mt-3 block text-xs font-medium text-gray-600">
                        Raw image URLs (comma, semicolon, or newline)
                        <textarea
                          className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                          rows={3}
                          value={productForm.images}
                          onChange={(event) => setProductForm((prev) => ({ ...prev, images: event.target.value }))}
                        />
                      </label>
                    )}
                  </div>

                  <label className="text-sm font-medium text-gray-700">
                    Upload Images
                    <div
                      className={`mt-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${
                        dragActive
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 bg-white hover:border-indigo-300"
                      } ${uploadingImages ? "opacity-70 cursor-not-allowed" : ""}`}
                      aria-busy={uploadingImages}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragActive(false);
                        if (event.dataTransfer?.files?.length) {
                          handleImageUpload(event.dataTransfer.files);
                        }
                      }}
                      onPaste={(event) => {
                        if (event.clipboardData?.files?.length) {
                          handleImageUpload(event.clipboardData.files);
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        id="product-image-upload"
                        onChange={(event) => handleImageUpload(event.target.files)}
                        disabled={uploadingImages}
                      />
                      <label
                        htmlFor="product-image-upload"
                        className={`cursor-pointer ${uploadingImages ? "pointer-events-none" : ""}`}
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                          ⬆️
                        </div>
                        <p className="mt-3 font-semibold text-gray-700">Click to upload or drag & drop</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {uploadingImages ? "Uploading and resizing images..." : "You can also paste images here."}
                        </p>
                      </label>
                    </div>
                    <span className="mt-2 block text-xs text-gray-500">
                      Images are auto-resized to a max 1400px edge and stored as data URLs. For best performance, use optimized image URLs.
                    </span>
                  </label>

                  {parseImages(productForm.images).length > 0 && (
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-[0.2em]">Preview</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {parseImages(productForm.images)
                          .slice(0, 6)
                          .map((src, index) => (
                            <div key={`${src}-${index}`} className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 relative">
                              <Image
                                src={src}
                                alt={`Upload ${index + 1}`}
                                fill
                                sizes="(min-width: 640px) 120px, 50vw"
                                quality={75}
                                className="object-cover"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {productStep === 4 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-[0.2em]">Readiness check</p>
                        <p className="text-sm text-amber-800">
                          {reviewGaps.length === 0
                            ? "All required fields look good — ready to publish."
                            : "Fill these before publishing to avoid rework."}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
                        Seller assist
                      </span>
                    </div>
                    {reviewGaps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reviewGaps.map((gap) => (
                          <span key={gap} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                            {gap} missing
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">Overview</p>
                    <div className="mt-3 grid gap-3 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Name</span>
                        <span className="font-medium text-gray-900">{productForm.name || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Category</span>
                        <span className="font-medium text-gray-900">{productForm.category || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Price</span>
                        <span className="font-medium text-gray-900">₹{productForm.price || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Stock</span>
                        <span className="font-medium text-gray-900">{productForm.stock || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">Media</p>
                    <p className="mt-2 text-sm text-gray-600">
                      {parseImages(productForm.images).length} image(s) ready.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goToPrevProductStep}
                    disabled={productStep === 0}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      productStep === 0
                        ? "border-gray-200 text-gray-400"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Back
                  </button>
                  {productStep < lastProductStep ? (
                    <button
                      type="button"
                      onClick={goToNextProductStep}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateOrUpdate}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      {formMode === "create" ? "Create Product" : "Save Changes"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Reset
                  </button>
                  <div className="text-xs text-gray-500">Lists accept comma or semicolon separated values.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowOrderDetail(false)}
          />
          <div className="relative w-full max-w-3xl bg-white shadow-2xl rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Order Details</p>
                <h3 className="text-xl font-bold text-gray-900">Order #{selectedOrder.id}</h3>
              </div>
              <button
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowOrderDetail(false)}
              >
                Close
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Email</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedOrder.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {formatDateTime(selectedOrder.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Address</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedOrder.address}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      selectedOrder.status === "shipped" || selectedOrder.status === "fulfilled"
                        ? "bg-green-100 text-green-800"
                        : selectedOrder.status === "paid" || selectedOrder.status === "processing" || selectedOrder.status === "packed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variants</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrder.items.map((item, idx) => {
                      const product = products.find((p) => p.id === item.productId);
                      const price = product ? getProductPrice(product).sale : 0;
                      return (
                        <tr key={`${item.productId}-${item.color ?? ""}-${item.size ?? ""}-${idx}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">{product?.name || item.productId}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {item.color && <span className="mr-2">Color: {item.color}</span>}
                            {item.size && <span>Size: {item.size}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(price * item.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">Total:</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        {formatCurrency(selectedOrder.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-gray-900">Payment Verification</h4>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedOrder.paymentVerified
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {selectedOrder.paymentVerified ? "Verified" : "Pending"}
                  </span>
                </div>
                {selectedOrder.paymentProof ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <img
                        src={selectedOrder.paymentProof}
                        alt="Payment proof"
                        className="w-full max-h-80 object-contain rounded-md bg-white"
                      />
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">
                        Verify the UPI screenshot before marking payment as paid.
                      </p>
                      <button
                        type="button"
                        className="w-full rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-900 disabled:opacity-60"
                        disabled={selectedOrder.paymentVerified}
                        onClick={async () => {
                          try {
                            const updated = await verifyPayment(selectedOrder.id, true);
                            setSelectedOrder(updated ?? selectedOrder);
                          } catch (error) {
                            setFlash((error as Error).message);
                          }
                        }}
                      >
                        {selectedOrder.paymentVerified ? "Payment Verified" : "Verify Payment"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                    No payment screenshot attached.
                  </div>
                )}
              </div>

              {/* Order Status Management */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Order Status Timeline</h4>
                
                {/* Status Timeline */}
                <div className="mb-6 bg-slate-50 rounded-lg p-4">
                  <div className="relative">
                    {/* Timeline track */}
                    <div className="flex items-center gap-2 mb-4">
                      {/* Pending */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ["pending", "processing", "paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Pending</span>
                      </div>

                      {/* Connector 1 */}
                      <div className={`h-1 flex-1 ${
                        ["processing", "paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                          ? "bg-blue-600"
                          : "bg-gray-300"
                      }`} />

                      {/* Processing */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ["processing", "paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Processing</span>
                      </div>

                      {/* Connector 2 */}
                      <div className={`h-1 flex-1 ${
                        ["paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                          ? "bg-green-600"
                          : "bg-gray-300"
                      }`} />

                      {/* Paid */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ["paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Paid</span>
                      </div>

                      {/* Connector 3 */}
                      <div className={`h-1 flex-1 ${
                        ["packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                          ? "bg-purple-600"
                          : "bg-gray-300"
                      }`} />

                      {/* Packed */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ["packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                            ? "bg-purple-600 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10l8-4" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Packed</span>
                      </div>

                      {/* Connector 4 */}
                      <div className={`h-1 flex-1 ${
                        ["fulfilled", "shipped"].includes(selectedOrder.status)
                          ? "bg-amber-600"
                          : "bg-gray-300"
                      }`} />

                      {/* Shipped */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ["fulfilled", "shipped"].includes(selectedOrder.status)
                            ? "bg-amber-600 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6m0 0L7 12m6-6l6 6" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Shipped</span>
                      </div>

                      {/* Connector 5 */}
                      <div className={`h-1 flex-1 ${
                        selectedOrder.status === "shipped"
                          ? "bg-green-600"
                          : "bg-gray-300"
                      }`} />

                      {/* Delivered */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedOrder.status === "shipped"
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Delivered</span>
                      </div>
                    </div>

                    {/* Current Status Badge */}
                    <div className="mt-4 p-3 bg-white border-2 border-indigo-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-900">Current Status: <span className="text-indigo-600 font-bold capitalize">{selectedOrder.status}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <h4 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedOrder.status === "pending" && (
                    <button
                      onClick={() => {
                        handleOrderStatusUpdate(selectedOrder.id, "processing");
                        setSelectedOrder({ ...selectedOrder, status: "processing" });
                      }}
                      className="px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Processing
                    </button>
                  )}
                  {(selectedOrder.status === "pending" || selectedOrder.status === "processing") && (
                    <button
                      onClick={() => {
                        handleOrderStatusUpdate(selectedOrder.id, "paid");
                        setSelectedOrder({ ...selectedOrder, status: "paid" });
                      }}
                      className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Paid
                    </button>
                  )}
                  {(selectedOrder.status === "paid" || selectedOrder.status === "processing") && (
                    <button
                      onClick={() => {
                        handleOrderStatusUpdate(selectedOrder.id, "packed");
                        setSelectedOrder({ ...selectedOrder, status: "packed" });
                      }}
                      className="px-4 py-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10l8-4" />
                      </svg>
                      Packed
                    </button>
                  )}
                  {(selectedOrder.status === "packed" || selectedOrder.status === "paid") && (
                    <button
                      onClick={() => {
                        handleOrderStatusUpdate(selectedOrder.id, "fulfilled");
                        setSelectedOrder({ ...selectedOrder, status: "fulfilled" });
                      }}
                      className="px-4 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Fulfilled
                    </button>
                  )}
                </div>

                {/* Shipping with AWB */}
                {(selectedOrder.status === "fulfilled" || selectedOrder.status === "packed" || selectedOrder.status === "paid") && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6m0 0L7 12m6-6l6 6" />
                      </svg>
                      <label className="text-sm font-bold text-amber-900">Ship This Order</label>
                    </div>
                    <p className="text-xs text-amber-700 mb-3">Enter the AWB tracking number to mark order as shipped</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={awbNumber}
                        onChange={(e) => setAwbNumber(e.target.value)}
                        placeholder="e.g., 1234567890AB"
                        className="flex-1 rounded-lg border border-amber-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none bg-white"
                      />
                      <button
                        onClick={() => {
                          if (!awbNumber.trim()) {
                            alert("Please enter AWB number");
                            return;
                          }
                          handleOrderStatusUpdate(selectedOrder.id, "shipped", awbNumber);
                          setSelectedOrder({ ...selectedOrder, status: "shipped", awbNumber });
                          setAwbNumber("");
                        }}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Ship Order
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (confirm("Cancel this order?")) {
                      handleOrderStatusUpdate(selectedOrder.id, "cancelled");
                      setSelectedOrder({ ...selectedOrder, status: "cancelled" });
                    }
                  }}
                  className="mt-4 px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showCustomerDetail && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCustomerDetail(false)}
          />
          <div className="relative w-full max-w-4xl bg-white shadow-2xl rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Customer Profile</p>
                <h3 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h3>
              </div>
              <button
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowCustomerDetail(false)}
              >
                Close
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium text-gray-900 mt-2">{selectedCustomer.email}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{selectedCustomer.totalOrders}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(selectedCustomer.totalSpent)}</p>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Order History</h4>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  {selectedCustomer.orders.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">No orders yet for this customer.</div>
                  ) : (
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedCustomer.orders
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">#{order.id}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDate(order.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  order.status === "shipped" || order.status === "fulfilled"
                                    ? "bg-green-100 text-green-800"
                                    : order.status === "paid" || order.status === "processing" || order.status === "packed"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{order.items.length} items</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                {formatCurrency(order.total)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => {
                                    setShowCustomerDetail(false);
                                    openOrderDetail(order);
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                                >
                                  View Order
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Code Creation Panel */}
      {showDiscountPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDiscountPanel(false)}
          />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl rounded-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Discount Management</p>
                <h3 className="text-xl font-bold text-gray-900">Create New Code</h3>
              </div>
              <button
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowDiscountPanel(false)}
              >
                Close
              </button>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Discount Code
                  <input
                    type="text"
                    placeholder="e.g., SUMMER20"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none uppercase"
                    value={discountForm.code}
                    onChange={(e) => setDiscountForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Description (Optional)
                  <input
                    type="text"
                    placeholder="Summer sale discount"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={discountForm.description}
                    onChange={(e) => setDiscountForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Discount Type
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={discountForm.type}
                    onChange={(e) =>
                      setDiscountForm((prev) => ({ ...prev, type: e.target.value as "percentage" | "fixed" }))
                    }
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Discount Value
                  <input
                    type="number"
                    min={0}
                    placeholder={discountForm.type === "percentage" ? "20" : "100"}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={discountForm.value || ""}
                    onChange={(e) => setDiscountForm((prev) => ({ ...prev, value: Number(e.target.value) }))}
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Max Uses (Optional)
                  <input
                    type="number"
                    min={0}
                    placeholder="100"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={discountForm.maxUses || ""}
                    onChange={(e) =>
                      setDiscountForm((prev) => ({ ...prev, maxUses: e.target.value ? Number(e.target.value) : undefined }))
                    }
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Expiry Date (Optional)
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={discountForm.expiryDate}
                    onChange={(e) => setDiscountForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    if (!discountForm.code.trim()) {
                      alert("Please enter a code");
                      return;
                    }
                    if (discountForm.value <= 0) {
                      alert("Please enter a valid discount value");
                      return;
                    }
                    try {
                      await createDiscountCode(
                        discountForm.code,
                        discountForm.description,
                        discountForm.type,
                        discountForm.value,
                        discountForm.maxUses,
                        discountForm.expiryDate || undefined
                      );
                      setShowDiscountPanel(false);
                      setFlash(`Discount code ${discountForm.code} created`);
                      setTimeout(() => setFlash(null), 2000);
                    } catch (error) {
                      setFlash((error as Error).message);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Code
                </button>
                <button
                  onClick={() => setShowDiscountPanel(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
