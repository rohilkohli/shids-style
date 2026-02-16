import { resolveAuthContext } from "@/app/lib/authContext";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reviewSchema = z.object({
  productId: z.string().trim().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2_000),
});

type ReviewRow = {
  id: number;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: { name: string | null } | { name: string | null }[] | null;
};

const getReviewerName = (profiles: ReviewRow["profiles"]) => {
  if (Array.isArray(profiles)) {
    return profiles[0]?.name ?? "Anonymous";
  }

  return profiles?.name ?? "Anonymous";
};

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId")?.trim();

  if (!productId) {
    return NextResponse.json({ ok: false, error: "productId is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("id, product_id, user_id, rating, comment, created_at, profiles(name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const reviews = ((data ?? []) as ReviewRow[]).map((review) => ({
    id: review.id,
    userId: review.user_id,
    productId: review.product_id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
    userName: getReviewerName(review.profiles),
  }));

  return NextResponse.json({ ok: true, data: reviews });
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = reviewSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid input.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { productId, rating, comment } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .insert({
      user_id: auth.id,
      product_id: productId,
      rating,
      comment,
    })
    .select("id, product_id, user_id, rating, comment, created_at")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ ok: false, error: error.message }, { status });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
