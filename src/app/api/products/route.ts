import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  try {
    const products = await db.product.findMany({
      where: {
        active: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { nameBn: { contains: q, mode: "insensitive" } },
                { tagline: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
      take: 12,
      select: { id: true, name: true, nameBn: true, slug: true, price: true, comparePrice: true, image: true, weight: true },
    });
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
