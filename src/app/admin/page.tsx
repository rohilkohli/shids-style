"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductPrice, useCommerceStore } from "@/app/lib/store";
import { formatCurrency, formatDate, formatDateTime, renderDescriptionHtml, slugify } from "@/app/lib/utils";
import { getOrderStatusColor, isOrderComplete } from "@/app/lib/orderUtils";
import type { Category, OrderStatus, Product, Order, Customer } from "@/app/lib/types";
import { supabase } from "@/app/lib/supabase/client";
import { LOW_STOCK_THRESHOLD } from "@/app/lib/adminConstants";
import { useToast } from "@/app/components/Toast";
import { useDialog } from "@/app/components/ConfirmDialog";
import ProductDescriptionEditor from "@/app/components/ProductDescriptionEditor";
import { NewsletterView, ContactView, DiscountsView } from "./components";
import type { NewsletterEntry, ContactMessage, HeroEntry, ProfileSummary, ProductFormState } from "./types";
import DashboardStats from "./components/DashboardStats";

import { ColorPicker } from "../components/ColorPicker";
import type { ProductColor, Variant } from "../lib/types";

const statuses: OrderStatus[] = ["pending", "processing", "paid", "packed", "fulfilled", "shipped", "cancelled"];

type View = "dashboard" | "products" | "orders" | "customers" | "ledger" | "discounts" | "hero" | "newsletter" | "contact" | "categories" | "reviews";

const viewLabels: Record<View, string> = {
  dashboard: "Dashboard",
  products: "Products",
  orders: "Orders",
  customers: "Customers",
  ledger: "Ledger",
  discounts: "Discount Codes",
  hero: "Hero Carousel",
  newsletter: "Newsletter",
  contact: "Contact Messages",
  categories: "Categories",
  reviews: "Reviews",
};

const parseList = (value: string) =>
  value
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const sanitizeDataUrl = (value: string) =>
  value.replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");

const isValidDataUrl = (value: string) => {
  const cleaned = sanitizeDataUrl(value);
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(cleaned);
};

const isImageSrc = (value: string) => {
  if (!value) return false;
  if (value.startsWith("data:image")) return isValidDataUrl(value);
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  if (value.startsWith("/")) return true;
  return false;
};

const parseImages = (value: string) => {
  return value
    .split(/\n+/)
    .flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed) return [] as string[];
      if (trimmed.startsWith("data:image")) {
        return isValidDataUrl(trimmed) ? [sanitizeDataUrl(trimmed)] : [];
      }
      return trimmed
        .split(/[;,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .filter(isImageSrc);
    });
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
    deleteDiscountCode,
    toggleDiscountCodeActive,
  } = useCommerceStore();
  const { toast } = useToast();
  const dialog = useDialog();

  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editBaseline, setEditBaseline] = useState<Product | null>(null);
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
  const [imageLinkInput, setImageLinkInput] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, OrderStatus>>({});
  const [awbNumber, setAwbNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [heroItems, setHeroItems] = useState<HeroEntry[]>([]);
  const [newsletterEmails, setNewsletterEmails] = useState<NewsletterEntry[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [categoryItems, setCategoryItems] = useState<Category[]>([]);
  const [categoryFeaturedDrafts, setCategoryFeaturedDrafts] = useState<Record<number, string>>({});
  const [categoryName, setCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
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
    colors: [],
    sizes: "",
    tags: "",
    highlights: "",
    images: "",
    newColorName: "",
    newColorHex: "#000000",
    variants: [],
    badge: "",
    bestseller: false,
    sku: "",
  });

  // Helper to parse legacy colors (string[]) into objects for the UI
  const parseColorsForUI = (colors: unknown[]): ProductColor[] => {
    if (!Array.isArray(colors)) return [];
    return colors.map((c) => {
      if (typeof c === "string") return { name: c, hex: "#000000" };
      // If it's an object with name/hex, coerce safely
      if (c && typeof c === "object" && "name" in c) {
        const obj = c as Record<string, unknown>;
        const name = typeof obj.name === "string" ? obj.name : String(obj.name);
        const hex = typeof obj.hex === "string" ? obj.hex : "#000000";
        return { name, hex } as ProductColor;
      }
      return { name: String(c), hex: "#000000" };
    });
  };

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!selectedProduct && products.length) {
      requestAnimationFrame(() => setSelectedProduct(products[0]));
    }
  }, [products, selectedProduct]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

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

    const controller = new AbortController();

    const loadProfiles = async () => {
      try {
        const response = await fetch("/api/users", { signal: controller.signal, cache: "no-store" });
        const json = await response.json();
        if (response.ok && json?.ok) {
          setProfiles(json.data as ProfileSummary[]);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.warn("Failed to load profiles", error);
        }
      }
    };

    loadProfiles();

    return () => controller.abort();
  }, [ready, user]);

  useEffect(() => {
    if (currentView !== "hero" && currentView !== "newsletter" && currentView !== "contact") return;

    const controller = new AbortController();

    const loadMarketing = async () => {
      const [heroResult, newsletterResult, contactResult] = await Promise.allSettled([
        fetch("/api/hero", { signal: controller.signal, cache: "no-store" }),
        fetch("/api/newsletter", { signal: controller.signal, cache: "no-store" }),
        fetch("/api/contact", { signal: controller.signal, cache: "no-store" }),
      ]);

      const loadItem = async <T,>(
        result: PromiseSettledResult<Response>,
        setData: (value: T) => void,
        label: string
      ) => {
        if (result.status === "rejected") {
          if ((result.reason as Error)?.name !== "AbortError") {
            console.warn(`Failed to load ${label}`, result.reason);
          }
          return;
        }

        try {
          const json = await result.value.json();
          if (result.value.ok && json?.ok) {
            setData(json.data as T);
          }
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            console.warn(`Failed to parse ${label}`, error);
          }
        }
      };

      await Promise.all([
        loadItem<HeroEntry[]>(heroResult, setHeroItems, "hero items"),
        loadItem<NewsletterEntry[]>(newsletterResult, setNewsletterEmails, "newsletter entries"),
        loadItem<ContactMessage[]>(contactResult, setContactMessages, "contact messages"),
      ]);
    };

    loadMarketing();

    return () => controller.abort();
  }, [currentView]);

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const json = await response.json();
      if (response.ok && json?.ok) {
        const items = json.data as Category[];
        setCategoryItems(items);
        setCategoryFeaturedDrafts(
          items.reduce<Record<number, string>>((acc, item) => {
            acc[item.id] = item.featuredProductId ?? "";
            return acc;
          }, {})
        );
      }
    } catch (error) {
      console.warn("Failed to load categories", error);
    }
  };

  useEffect(() => {
    if (!ready || !user || user.role !== "admin") return;
    if (currentView === "categories" || currentView === "products") {
      loadCategories();
    }
  }, [ready, user, currentView]);

  const categoryOptions = useMemo(() => {
    const names = categoryItems.length ? categoryItems.map((cat) => cat.name) : products.map((p) => p.category);
    return Array.from(new Set(names)).filter(Boolean);
  }, [categoryItems, products]);

  const normalizeCategory = (value: string) => value.trim().toLowerCase();

  const supportsVariantsForCategory = (category: string) => normalizeCategory(category).includes("apparel");

  const variantsEnabled = supportsVariantsForCategory(productForm.category ?? "");

  const productsByCategory = useMemo(() => {
    return products.reduce<Record<string, Product[]>>((acc, product) => {
      const key = normalizeCategory(product.category);
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    }, {});
  }, [products]);

  useEffect(() => {
    if (variantsEnabled) return;
    if ((productForm.variants?.length ?? 0) === 0) return;

    setProductForm((prev) => ({
      ...prev,
      variants: [],
    }));
  }, [variantsEnabled, productForm.variants]);

  const categories = useMemo(() => ["all", ...categoryOptions], [categoryOptions]);

  const getTotalStock = (product: Product) => {
    if (product.variants?.length) {
      return product.variants.reduce((sum, variant) => sum + Number(variant.stock ?? 0), 0);
    }
    return Number(product.stock ?? 0);
  };

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

  const imageList = useMemo(() => parseImages(productForm.images), [productForm.images]);
  const previewImages = imageList.filter(isImageSrc);


  // Calculate stats
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  const totalOrders = orders.length;

  const lowStockProducts = useMemo(
    () =>
      products.filter((product) => {
        const totalStock = product.variants?.length
          ? product.variants.reduce((sum, variant) => sum + Number(variant.stock ?? 0), 0)
          : Number(product.stock ?? 0);
        return totalStock <= LOW_STOCK_THRESHOLD;
      }),
    [products]
  );

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

  const updateImageList = (images: string[]) => {
    setProductForm((prev) => ({
      ...prev,
      images: images.length ? images.join("\n") : "",
    }));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const images = parseImages(productForm.images);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);
    updateImageList(reordered);
  };

  const deleteImage = (index: number) => {
    const images = parseImages(productForm.images);
    const updated = images.filter((_, current) => current !== index);
    updateImageList(updated);
  };

  const productSteps = [
    { title: "Basics", description: "Name, Category, Description" },
    { title: "Pricing", description: "Price, Discount, Global quantity" },
    { title: "Variants", description: "Colors, Sizes, Variant quantity" },
    { title: "Media", description: "Images" },
    { title: "Review", description: "Final check" },
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
      colors: [],
      sizes: "",
      tags: "",
      highlights: "",
      images: "",
      badge: "",
      newColorName: "",
      newColorHex: "#000000",
      variants: [],
      // Keep other fields if needed or default them
      bestseller: false,
      sku: "",
    });
    setFormMode("create");
    setSelectedProduct(null);
    setEditBaseline(null);
    setProductStep(0);
  };

  const goToNextProductStep = () => {
    if (productStep === 0) {
      if (!(productForm.name ?? "").trim()) {
        toast.warning("Product name is required");
        return;
      }
      if (!(productForm.category ?? "").trim()) {
        toast.warning("Category is required");
        return;
      }
    }
    if (productStep === 1) {
      const price = Number(productForm.price) || 0;
      if (price <= 0) {
        toast.warning("Price must be greater than 0");
        return;
      }
    }
    if (productStep === 3) {
      const images = parseImages(productForm.images);
      if (images.length === 0) {
        toast.warning("Please add at least one image");
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
      if (!(productForm.name ?? "").trim()) {
        toast.warning("Product name is required");
        return;
      }
      if (!(productForm.category ?? "").trim()) {
        toast.warning("Category is required");
        return;
      }
    }
    if (productStep === 1) {
      const price = Number(productForm.price) || 0;
      if (price <= 0) {
        toast.warning("Price must be greater than 0");
        return;
      }
    }
    if (productStep === 3) {
      const images = parseImages(productForm.images);
      if (images.length === 0) {
        toast.warning("Please add at least one image");
        return;
      }
    }

    setProductStep(Math.min(nextStep, lastProductStep));
  };

  const reviewGaps = (() => {
    const gaps: string[] = [];
    if (!(productForm.name ?? "").trim()) gaps.push("Name");
    if (!(productForm.category ?? "").trim()) gaps.push("Category");
    if (!(productForm.description ?? "").trim()) gaps.push("Description");
    if (!(Number(productForm.price) > 0)) gaps.push("Price");
    if (!(Number(productForm.stock) > 0)) gaps.push("Global quantity");
    if (parseImages(productForm.images).length === 0) gaps.push("Images");
    return gaps;
  })();

  const editChanges = (() => {
    if (formMode !== "edit" || !editBaseline) return [];
    const changes: { label: string; from: string; to: string }[] = [];
    const currentColors = productForm.colors.map(c => c.name).join(", ");
    const currentSizes = parseList(productForm.sizes);
    const currentTags = parseList(productForm.tags);
    const currentHighlights = parseList(productForm.highlights);
    const currentImages = parseImages(productForm.images);

    const fmt = (value: unknown) => {
      if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
      if (value === undefined || value === null) return "None";
      if (value === "") return "None";
      return String(value);
    };
    const pushChange = (label: string, fromValue: unknown, toValue: unknown) => {
      const from = fmt(fromValue);
      const to = fmt(toValue);
      if (from !== to) {
        changes.push({ label, from, to });
      }
    };

    pushChange("Name", editBaseline.name, productForm.name);
    pushChange("Category", editBaseline.category, productForm.category);
    pushChange("Price", editBaseline.price, Number(productForm.price) || 0);
    pushChange("Compare at", editBaseline.originalPrice ?? "—", productForm.originalPrice ?? "—");
    pushChange("Discount %", editBaseline.discountPercent ?? 0, productForm.discountPercent ?? 0);
    pushChange("Global quantity", editBaseline.stock, Number(productForm.stock) || 0);
    pushChange("Badge", editBaseline.badge ?? "—", productForm.badge ?? "—");

    // Compare baseline colors (string[] or ProductColor[]) vs current (ProductColor[])
    const baselineColors = (editBaseline.colors || [])
      .map((c: unknown) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && 'name' in c) return String((c as Record<string, unknown>).name);
        return String(c);
      })
      .join(", ");

    if (baselineColors !== currentColors) {
      pushChange("Colors", baselineColors, currentColors);
    }
    pushChange("Sizes", editBaseline.sizes ?? [], currentSizes);
    pushChange("Tags", editBaseline.tags ?? [], currentTags);
    pushChange("Highlights", editBaseline.highlights ?? [], currentHighlights);
    pushChange("Images", (editBaseline.images ?? []).length, currentImages.length);

    return changes;
  })();

  const revertToBaseline = () => {
    if (!editBaseline) return;
    populateForm(editBaseline);
    setProductStep(0);
  };

  

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
      // Ensure colors are ProductColor[]
      colors: parseColorsForUI(product.colors),
      sizes: product.sizes.join(", "),
      tags: product.tags.join(", "),
      highlights: product.highlights.join("; ") || product.highlights.join(", "),
      images: product.images.join(", "),
      badge: product.badge ?? "",
      bestseller: product.bestseller ?? false,
      sku: product.sku ?? "",
      variants: (product.variants ?? []).map(v => ({ id: v.id, productId: v.productId, color: v.color, size: v.size, stock: v.stock })),
      newColorName: "",
      newColorHex: "#000000",
    });
  };

  const handleCreateOrUpdate = async () => {
    const name = (productForm.name ?? "").trim();
    const category = (productForm.category ?? "").trim();
    const description = renderDescriptionHtml(productForm.description ?? "");
    const price = Number(productForm.price) || 0;
    const colors = productForm.colors; // Already ProductColor[]
    const sizes = parseList(productForm.sizes);
    const tags = parseList(productForm.tags);
    const highlights = parseList(productForm.highlights);
    const images = parseImages(productForm.images);

    if (!name) {
      toast.warning("Product name is required");
      return;
    }
    if (!category) {
      toast.warning("Category is required");
      return;
    }
    if (price <= 0) {
      toast.warning("Price must be greater than 0");
      return;
    }
    if (!description.replace(/<[^>]*>/g, "").trim()) {
      toast.warning("Description is required");
      return;
    }
    if (images.length === 0) {
      toast.warning("Please add at least one image");
      return;
    }

    if (formMode === "create") {
      type CreatePayloadType = Omit<Product, "id" | "slug"> & { id?: string; slug?: string; variants?: Partial<Variant>[] };
      const payload: Omit<Product, "id" | "slug"> & { id?: string; slug?: string } = {
        id: productForm.id || slugify(productForm.name || "new-product"),
        name,
        slug: slugify(name || "new-product"),
        description,
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
        badge: (productForm.badge ?? "").trim(),
        rating: 4.5,
        // [NEW] Support for admin bestseller flag and SKU
        bestseller: productForm.bestseller ?? false,
        sku: productForm.sku?.trim() || undefined,
      };
      try {
        // include variants for creation if present
        const createPayload = {
          ...payload,
          ...(variantsEnabled && productForm.variants && productForm.variants.length > 0
            ? { variants: productForm.variants.map((v) => ({ color: v.color, size: v.size, stock: Number(v.stock || 0) })) }
            : {}),
        };
        const created = await createProduct(createPayload as CreatePayloadType);
        setSelectedProduct(created ?? null);
        setFlash("Product created");
      } catch (error) {
        setFlash((error as Error).message);
      }
    } else if (formMode === "edit" && selectedProduct) {
      const updates: Partial<Product> = {
        name,
        description,
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
        badge: (productForm.badge ?? "").trim(),
        bestseller: productForm.bestseller ?? false,
        // Do NOT allow updating SKU after creation; keep original SKU unchanged on edits
      };
      const updatesWithVariants = {
        ...updates,
        ...(variantsEnabled && productForm.variants
          ? { variants: productForm.variants.map((v) => ({ color: v.color, size: v.size, stock: Number(v.stock || 0) })) }
          : { variants: [] }),
      };
      try {
        const updated = await updateProduct(selectedProduct.id, updatesWithVariants as Partial<Product> & { variants?: Partial<Variant>[] });
        setSelectedProduct(updated ?? selectedProduct);
        setEditBaseline(updated ?? selectedProduct);
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

  const uploadImageToStorage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Unsupported file type");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const inferredContentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      svg: "image/svg+xml",
    };
    const contentType = file.type || inferredContentTypes[extension];
    const uniqueId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filePath = `uploads/${uniqueId}.${extension}`;

    const { error } = await supabase.storage.from("products").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      ...(contentType ? { contentType } : {}),
    });

    if (error) {
      console.error("Storage upload failed", { filePath, error });
      throw new Error(error.message || "Failed to upload image");
    }

    const { data } = supabase.storage.from("products").getPublicUrl(filePath);
    if (!data?.publicUrl) {
      throw new Error("Failed to get public image URL");
    }

    return data.publicUrl;
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const results = await Promise.allSettled(
        Array.from(files).map((file) => uploadImageToStorage(file))
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
    const ok = await dialog.confirm({
      title: "Delete Product",
      message: `Delete "${product.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
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

  const handleCreateCategory = async () => {
    const name = categoryName.trim();
    if (!name) {
      setFlash("Category name is required.");
      return;
    }
    setCategorySaving(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to create category.");
      }
      setCategoryName("");
      await loadCategories();
      setFlash("Category created.");
      setTimeout(() => setFlash(null), 1600);
    } catch (error) {
      setFlash((error as Error).message);
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    const ok = await dialog.confirm({
      title: "Delete Category",
      message: "Delete this category? Products in this category will need to be reassigned.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete category.");
      }
      await loadCategories();
      setFlash("Category deleted.");
      setTimeout(() => setFlash(null), 1600);
    } catch (error) {
      setFlash((error as Error).message);
    }
  };

  const handleSaveCategoryFeatured = async (categoryId: number) => {
    const featuredProductId = categoryFeaturedDrafts[categoryId] || "";
    try {
      const response = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: categoryId,
          featuredProductId: featuredProductId || null,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to update category.");
      }
      setCategoryItems((prev) =>
        prev.map((item) => (item.id === categoryId ? (json.data as Category) : item))
      );
      setFlash("Category updated.");
      setTimeout(() => setFlash(null), 1600);
    } catch (error) {
      setFlash((error as Error).message);
    }
  };


  const handleOrderStatusUpdate = async (
    orderId: string,
    status: OrderStatus,
    awb?: string,
    courier?: string
  ) => {
    if (status === "shipped" && !awb?.trim()) {
      toast.warning("AWB Number is required to mark order as shipped");
      return null;
    }
    if (status === "shipped" && !courier?.trim()) {
      toast.warning("Courier name is required to mark order as shipped");
      return null;
    }
    try {
      const updated = await updateOrderStatus(orderId, status, awb, courier);
      if (updated && selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
        setAwbNumber(updated.awbNumber || "");
        setCourierName(updated.courierName || "");
      }
      const detail = [awb ? `AWB: ${awb}` : null, courier ? `Courier: ${courier}` : null]
        .filter(Boolean)
        .join(" · ");
      setFlash(`Order ${orderId} updated to ${status}${detail ? ` (${detail})` : ""}`);
      setTimeout(() => setFlash(null), 2000);
      return updated;
    } catch (error) {
      setFlash((error as Error).message);
      return null;
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setAwbNumber(order.awbNumber || "");
    setCourierName(order.courierName || "");
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
    setEditBaseline(product);
    populateForm(product);
    setFormMode("edit");
    setProductStep(0);
    setShowProductPanel(true);
  };

  const navigateToView = (view: View) => {
    setCurrentView(view);
    setSidebarOpen(false);
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
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col overflow-y-auto max-h-screen transform transition lg:static lg:translate-x-0 lg:w-64 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-indigo-400">SHIDS STYLE ADMIN</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <button
            onClick={() => navigateToView("dashboard")}
            aria-current={currentView === "dashboard" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "dashboard"
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
            onClick={() => navigateToView("products")}
            aria-current={currentView === "products" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "products"
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
            onClick={() => navigateToView("categories")}
            aria-current={currentView === "categories" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "categories"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Categories
          </button>

          <button
            onClick={() => navigateToView("orders")}
            aria-current={currentView === "orders" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "orders"
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
            onClick={() => navigateToView("customers")}
            aria-current={currentView === "customers" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "customers"
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
            onClick={() => navigateToView("discounts")}
            aria-current={currentView === "discounts" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "discounts"
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
            onClick={() => navigateToView("hero")}
            aria-current={currentView === "hero" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "hero"
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
            onClick={() => navigateToView("newsletter")}
            aria-current={currentView === "newsletter" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "newsletter"
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

          <button
            onClick={() => navigateToView("contact")}
            aria-current={currentView === "contact" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "contact"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m22 8-10 6L2 8" />
            </svg>
            Contact Messages
          </button>

          <button
            onClick={() => navigateToView("reviews")}
            aria-current={currentView === "reviews" ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === "reviews"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Reviews
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
                onClick={() => setSidebarOpen((prev) => !prev)}
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={sidebarOpen}
                aria-controls="admin-sidebar"
              >
                <span className="text-lg">☰</span>
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Seller Panel · {viewLabels[currentView]}</p>
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
                                <p className="text-xs text-gray-500">SKU: {product.sku || product.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getTotalStock(product) > LOW_STOCK_THRESHOLD ? (
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
                            {getTotalStock(product)}
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {currentView === "categories" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
                  <p className="text-sm text-gray-500 mt-1">{categoryItems.length} total categories</p>
                </div>
                <button
                  onClick={loadCategories}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Refresh
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900">Category List</h2>
                    <span className="text-xs text-gray-500">{categoryItems.length} items</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px]">
                      <thead className="bg-slate-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {categoryItems.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500">
                              No categories yet.
                            </td>
                          </tr>
                        )}
                        {categoryItems.map((category) => (
                          <tr key={category.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                            <td className="px-6 py-4 text-xs text-gray-500">{category.slug}</td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex flex-col gap-2">
                                <select
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
                                  aria-label={`Featured product for ${category.name}`}
                                  value={categoryFeaturedDrafts[category.id] ?? ""}
                                  onChange={(event) =>
                                    setCategoryFeaturedDrafts((prev) => ({
                                      ...prev,
                                      [category.id]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">No featured product</option>
                                  {(productsByCategory[normalizeCategory(category.name)] ?? []).map((product) => (
                                    <option key={product.id} value={product.id}>
                                      {product.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleSaveCategoryFeatured(category.id)}
                                  className="w-fit rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  aria-label={`Save featured product for ${category.name}`}
                                >
                                  Save Featured
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-red-600 hover:text-red-900"
                                aria-label={`Delete ${category.name} category`}
                              >
                                Delete Category
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900">Add Category</h2>
                  <p className="text-xs text-gray-500 mt-1">Create a new category for products.</p>
                  <label className="mt-4 block text-sm font-medium text-gray-700">
                    Category name
                    <input
                      className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={categoryName}
                      onChange={(event) => setCategoryName(event.target.value)}
                      placeholder="e.g., Utility Sets"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={categorySaving}
                    className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {categorySaving ? "Saving..." : "Create Category"}
                  </button>
                </div>
              </div>
            </>
          )}

          {currentView === "orders" && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
                <p className="text-sm text-gray-500 mt-1">{orders.length} total orders</p>
              </div>

              <DashboardStats />

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
                    {orders.map((order) => {
                      const draftStatus = orderStatusDrafts[order.id] ?? order.status;
                      const statusDirty = draftStatus !== order.status;
                      return (
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
                            <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 w-fit ${getOrderStatusColor(order.status)}`}>
                              {isOrderComplete(order.status) && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={draftStatus}
                              onChange={(e) =>
                                setOrderStatusDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value as OrderStatus,
                                }))
                              }
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
                                try {
                                  await handleOrderStatusUpdate(order.id, draftStatus);
                                  setOrderStatusDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[order.id];
                                    return next;
                                  });
                                } catch (error) {
                                  setFlash((error as Error).message);
                                }
                              }}
                              disabled={!statusDirty}
                              className={`ml-2 text-xs font-medium ${statusDirty
                                ? "text-indigo-600 hover:text-indigo-900"
                                : "text-gray-400 cursor-not-allowed"
                                }`}
                            >
                              Update
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
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getOrderStatusColor(order.status)}`}>
                              {order.status}
                            </span>
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
            <DiscountsView
              discountCodes={discountCodes}
              onCreateClick={() => {
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
              onToggleActive={toggleDiscountCodeActive}
              onDelete={deleteDiscountCode}
              onSetFlash={setFlash}
            />
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
            <NewsletterView newsletterEmails={newsletterEmails} />
          )}

          {currentView === "contact" && (
            <ContactView contactMessages={contactMessages} />
          )}

          {currentView === "reviews" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Product Reviews</h2>
                <p className="text-sm text-gray-500">Manage customer reviews and ratings</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <p className="text-sm text-gray-600">
                    Reviews are collected from authenticated users on product pages. This section shows all submitted reviews.
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {/* Placeholder for when reviews are wired to backend */}
                  <div className="p-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <p className="font-medium">No reviews yet</p>
                    <p className="text-sm mt-1">Reviews will appear here once customers start rating products.</p>
                  </div>
                </div>
              </div>
            </div>
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
                    className={`rounded-xl border px-4 py-3 text-left transition ${index === productStep
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

              {formMode === "edit" && editBaseline && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.25em] text-indigo-600 font-semibold">Edit assist</p>
                      <p className="text-sm text-indigo-900">
                        Compare against saved version and revert if needed before publishing.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={revertToBaseline}
                      className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 hover:border-indigo-300"
                    >
                      Revert to saved
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {editChanges.length === 0 && (
                      <p className="text-xs text-indigo-800">No changes yet—form matches saved product.</p>
                    )}
                    {editChanges.map((change) => (
                      <div
                        key={change.label}
                        className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs text-indigo-900 shadow-sm"
                      >
                        <p className="font-semibold text-[13px] text-indigo-800">{change.label}</p>
                        <p className="text-[11px] text-indigo-600 line-clamp-2">From: {change.from}</p>
                        <p className="text-[11px] text-indigo-700 line-clamp-2">To: {change.to}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {productStep === 0 && (
                <div className="space-y-4">
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
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        value={productForm.category}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                      >
                        <option value="">Select a category</option>
                        {categoryOptions.length === 0 && (
                          <option value="" disabled>
                            No categories yet
                          </option>
                        )}
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        Manage categories in the Categories section.
                      </p>
                    </label>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <ProductDescriptionEditor
                        value={productForm.description ?? ""}
                        onChange={(html) => {
                          const sanitized = renderDescriptionHtml(html);
                          setProductForm((prev) => ({ ...prev, description: sanitized }));
                        }}
                        placeholder="Describe your product..."
                        minHeight={180}
                      />
                    </div>
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
                    Global quantity
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
                <div className="space-y-8">
                  {/* COLORS SECTION */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Product Colors</label>
                      <span className="text-xs text-gray-500">Define available colors with exact hex codes.</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {productForm.colors?.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 bg-white shadow-sm">
                          <div
                            className="h-6 w-6 rounded-full border border-gray-200"
                            style={{ backgroundColor: color.hex }}
                          />
                          <div className="text-xs">
                            <p className="font-medium text-gray-900">{color.name}</p>
                            <p className="text-gray-500">{color.hex}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setProductForm(prev => ({
                                ...prev,
                                colors: prev.colors?.filter((_, i) => i !== idx) || []
                              }));
                            }}
                            className="ml-2 text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-end gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Color Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Midnight Blue"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          value={productForm.newColorName || ""}
                          onChange={e => setProductForm(prev => ({ ...prev, newColorName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Color Value</label>
                        <ColorPicker
                          color={productForm.newColorHex || "#000000"}
                          onChange={hex => setProductForm(prev => ({ ...prev, newColorHex: hex }))}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!productForm.newColorName}
                        onClick={() => {
                          if (!productForm.newColorName) return;
                          setProductForm(prev => ({
                            ...prev,
                            colors: [...(prev.colors || []), { name: prev.newColorName!, hex: prev.newColorHex || "#000000" }],
                            newColorName: "",
                            newColorHex: "#000000"
                          }));
                        }}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Color
                      </button>
                    </div>
                  </div>

                  {/* SIZES SECTION */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-gray-700">
                      Sizes (comma-separated)
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        value={productForm.sizes || ""} // Handle string input
                        onChange={(event) => setProductForm((prev) => ({ ...prev, sizes: event.target.value }))}
                        placeholder="S, M, L, XL"
                      />
                    </label>
                  </div>

                  {/* VARIANTS GENERATOR */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Variants</h3>
                        <p className="text-xs text-gray-500">Only apparel products use variants. Adornments use global quantity and in-stock status.</p>
                      </div>
                      <button
                        type="button"
                        disabled={!variantsEnabled}
                        onClick={() => {
                          if (!variantsEnabled) return;

                          // Generate variants logic
                          const sizeList = typeof productForm.sizes === 'string'
                            ? productForm.sizes.split(/[,\s]+/).filter(Boolean)
                            : [];
                          const colorList = productForm.colors || [];

                          const newVariants: Variant[] = [];

                          // If no options, do nothing or use Global Stock
                          if (sizeList.length === 0 && colorList.length === 0) return;

                          // Cross product
                          if (sizeList.length > 0 && colorList.length > 0) {
                            colorList.forEach(c => {
                              sizeList.forEach(s => {
                                newVariants.push({
                                  id: Math.random(), // Temp ID
                                  productId: productForm.id || "new",
                                  color: c.name,
                                  size: s,
                                  stock: productForm.stock || 0
                                });
                              });
                            });
                          } else if (sizeList.length > 0) {
                            sizeList.forEach(s => {
                              newVariants.push({
                                id: Math.random(),
                                productId: productForm.id || "new",
                                color: "",
                                size: s,
                                stock: productForm.stock || 0
                              });
                            });
                          } else if (colorList.length > 0) {
                            colorList.forEach(c => {
                              newVariants.push({
                                id: Math.random(),
                                productId: productForm.id || "new",
                                color: c.name,
                                size: "",
                                stock: productForm.stock || 0
                              });
                            });
                          }

                          setProductForm(prev => ({ ...prev, variants: newVariants }));
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-gray-300"
                      >
                        Generate / Refresh Variants
                      </button>
                    </div>

                    {variantsEnabled && productForm.variants && productForm.variants.length > 0 ? (
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                              <th className="px-4 py-3">Variant</th>
                              <th className="px-4 py-3 w-32">Stock</th>
                              <th className="px-4 py-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {productForm.variants.map((variant, idx) => (
                              <tr key={idx} className="bg-white hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {variant.color && <span className="mr-2">{variant.color}</span>}
                                  {variant.size && <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{variant.size}</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                                    value={variant.stock}
                                    onChange={(e) => {
                                      const newStock = Number(e.target.value);
                                      setProductForm(prev => {
                                        const updated = [...(prev.variants || [])];
                                        updated[idx] = { ...updated[idx], stock: newStock };
                                        return { ...prev, variants: updated };
                                      });
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProductForm(prev => ({
                                        ...prev,
                                        variants: prev.variants?.filter((_, i) => i !== idx)
                                      }));
                                    }}
                                    className="text-gray-400 hover:text-red-600"
                                  >
                                                ×
                                              </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center p-6 border-2 border-dashed border-gray-100 rounded-xl text-xs text-gray-400">
                        {variantsEnabled
                          ? "Add colors/sizes and click \"Generate\" to manage apparel combinations."
                          : "Variants are disabled for this category. Use global quantity for adornments and non-apparel products."}
                      </div>
                    )}
                  </div>

                  <label className="text-sm font-medium text-gray-700 md:col-span-2">
                    Badge (optional)
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      value={productForm.badge ?? ""}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, badge: event.target.value }))}
                    />
                  </label>

                  <div className="flex items-center gap-4 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!productForm.bestseller}
                        onChange={e => setProductForm(prev => ({ ...prev, bestseller: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Mark as Bestseller
                    </label>
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      SKU
                      <input
                        className="w-32 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                        value={productForm.sku ?? ''}
                        onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="Auto (10-digit)"
                        disabled={formMode === 'edit'}
                        title={formMode === 'edit' ? 'SKU is immutable after creation' : undefined}
                      />
                    </label>
                  </div>
                </div>
              )}

              {productStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Images</p>
                        <p className="text-xs text-gray-500">
                          {imageList.length} image(s) attached
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Upload images below. URLs are generated automatically and stored with the product.
                    </p>
                  </div>

                  <label className="text-sm font-medium text-gray-700">
                    Upload Images
                    <div
                      className={`mt-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${dragActive
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
                      Images are uploaded to Supabase Storage and saved as public URLs. For best performance, use optimized image files.
                    </span>
                  </label>

                  <div className="mt-3 flex flex-col gap-2 text-sm text-gray-700 sm:flex-row sm:items-center">
                    <input
                      type="url"
                      placeholder="Paste image URL and click add"
                      value={imageLinkInput}
                      onChange={(event) => setImageLinkInput(event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                      disabled={!imageLinkInput.trim()}
                      onClick={() => {
                        if (!imageLinkInput.trim()) return;
                        setProductForm((prev) => {
                          const existing = prev.images ? `${prev.images.trim()}\n` : "";
                          return { ...prev, images: `${existing}${imageLinkInput.trim()}` };
                        });
                        setImageLinkInput("");
                      }}
                    >
                      Add image URL
                    </button>
                  </div>

                  {previewImages.length > 0 && (
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-[0.2em]">Preview</p>
                      <p className="mt-1 text-xs text-gray-500">Reorder with up/down or remove images.</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {previewImages.map((src, index) => (
                          <div
                            key={`${src}-${index}`}
                            className="group aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 relative"
                          >
                            {src.startsWith("data:image") ? (
                              <Image
                                src={src}
                                alt={`Upload ${index + 1}`}
                                fill
                                sizes="(min-width: 640px) 120px, 50vw"
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <Image
                                src={src}
                                alt={`Upload ${index + 1}`}
                                fill
                                sizes="(min-width: 640px) 120px, 50vw"
                                quality={75}
                                className="object-cover"
                              />
                            )}
                            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-gray-700 opacity-0 transition group-hover:opacity-100">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] disabled:opacity-40"
                                  onClick={() => moveImage(index, -1)}
                                  disabled={index === 0}
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] disabled:opacity-40"
                                  onClick={() => moveImage(index, 1)}
                                  disabled={index === imageList.length - 1}
                                >
                                  Down
                                </button>
                              </div>
                              <button
                                type="button"
                                className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-600"
                                onClick={() => deleteImage(index)}
                              >
                                Remove
                              </button>
                            </div>
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
                        <span className="text-gray-500">Global quantity</span>
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
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${productStep === 0
                      ? "border-gray-200 text-gray-400"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    Back
                  </button>
                  {formMode === "edit" && selectedProduct && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedProduct)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
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
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: "Delete Order",
                      message: `Delete order #${selectedOrder.id}? This cannot be undone.`,
                      confirmLabel: "Delete Order",
                      variant: "danger",
                    });
                    if (!ok) return;
                    try {
                      await deleteOrder(selectedOrder.id);
                      setShowOrderDetail(false);
                      setFlash(`Order ${selectedOrder.id} deleted`);
                      setTimeout(() => setFlash(null), 2000);
                    } catch (error) {
                      setFlash((error as Error).message);
                    }
                  }}
                >
                  Delete
                </button>
                <button
                  className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowOrderDetail(false)}
                >
                  Close
                </button>
              </div>
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
                    <span className={`px-2 py-1 text-xs font-medium rounded ${selectedOrder.status === "paid" || selectedOrder.status === "processing" || selectedOrder.status === "packed"
                      ? "bg-blue-100 text-blue-800"
                      : getOrderStatusColor(selectedOrder.status)
                      }`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Courier</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedOrder.courierName || "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">AWB</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedOrder.awbNumber || "Not assigned"}
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
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedOrder.paymentVerified
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                    }`}>
                    {selectedOrder.paymentVerified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                    Payment screenshots are not collected. Verify payment manually before marking as paid.
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Mark the order as paid once the payment is confirmed.
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${["pending", "processing", "paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
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
                      <div className={`h-1 flex-1 ${["processing", "paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                        ? "bg-blue-600"
                        : "bg-gray-300"
                        }`} />

                      {/* Processing */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${["processing", "paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
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
                      <div className={`h-1 flex-1 ${["paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                        ? "bg-green-600"
                        : "bg-gray-300"
                        }`} />

                      {/* Paid */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${["paid", "packed", "fulfilled", "shipped"].includes(selectedOrder.status)
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
                      <div className={`h-1 flex-1 ${["packed", "fulfilled", "shipped"].includes(selectedOrder.status)
                        ? "bg-purple-600"
                        : "bg-gray-300"
                        }`} />

                      {/* Packed */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${["packed", "fulfilled", "shipped"].includes(selectedOrder.status)
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
                      <div className={`h-1 flex-1 ${["fulfilled", "shipped"].includes(selectedOrder.status)
                        ? "bg-amber-600"
                        : "bg-gray-300"
                        }`} />

                      {/* Shipped */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${["fulfilled", "shipped"].includes(selectedOrder.status)
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
                      <div className={`h-1 flex-1 ${selectedOrder.status === "shipped"
                        ? "bg-green-600"
                        : "bg-gray-300"
                        }`} />

                      {/* Delivered */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedOrder.status === "shipped"
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
                    <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_auto]">
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="Courier name"
                        className="rounded-lg border border-amber-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none bg-white"
                      />
                      <input
                        type="text"
                        value={awbNumber}
                        onChange={(e) => setAwbNumber(e.target.value)}
                        placeholder="AWB number"
                        className="rounded-lg border border-amber-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none bg-white"
                      />
                      <button
                        onClick={() => {
                          if (!awbNumber.trim()) {
                            toast.warning("Please enter AWB number");
                            return;
                          }
                          if (!courierName.trim()) {
                            toast.warning("Please enter courier name");
                            return;
                          }
                          handleOrderStatusUpdate(selectedOrder.id, "shipped", awbNumber, courierName);
                          setSelectedOrder({ ...selectedOrder, status: "shipped", awbNumber, courierName });
                          setAwbNumber("");
                          setCourierName("");
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
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: "Cancel Order",
                      message: "Are you sure you want to cancel this order? The customer will be notified.",
                      confirmLabel: "Cancel Order",
                      variant: "warning",
                    });
                    if (ok) {
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
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: "Delete Customer",
                      message: `Delete customer ${selectedCustomer.email} and all their orders? This cannot be undone.`,
                      confirmLabel: "Delete Customer",
                      variant: "danger",
                    });
                    if (!ok) return;
                    try {
                      await deleteCustomer(selectedCustomer.email);
                      setProfiles((prev) =>
                        prev.filter((profile) => profile.email.toLowerCase() !== selectedCustomer.email.toLowerCase())
                      );
                      setShowCustomerDetail(false);
                      setFlash(`Customer ${selectedCustomer.email} deleted`);
                      setTimeout(() => setFlash(null), 2000);
                    } catch (error) {
                      setFlash((error as Error).message);
                    }
                  }}
                >
                  Delete
                </button>
                <button
                  className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowCustomerDetail(false)}
                >
                  Close
                </button>
              </div>
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
                                <span className={`px-2 py-1 text-xs font-medium rounded ${order.status === "paid" || order.status === "processing" || order.status === "packed"
                                  ? "bg-blue-100 text-blue-800"
                                  : getOrderStatusColor(order.status)
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
                      toast.warning("Please enter a code");
                      return;
                    }
                    if (discountForm.value <= 0) {
                      toast.warning("Please enter a valid discount value");
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
