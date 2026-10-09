import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ADMIN_PAGE_SIZE = 25;

// For admin pages: sends anyone who isn't an admin away.
// The role is read from the database, not the session, so a demoted admin loses access immediately.
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login?callbackUrl=/dashboard/admin");

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") redirect("/");

  return admin;
}

// For admin API routes: returns the admin, or a JSON error response to send back.
export async function requireAdminApi() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { admin: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return { admin: null, error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { admin, error: null };
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function param(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function pageNumber(params: Record<string, string | string[] | undefined>): number {
  const page = Number.parseInt(param(params, "page"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

// Returns the value only if it is one of the allowed options (used for enum filters from the URL).
export function oneOf<T extends string>(value: string, options: readonly T[]): T | undefined {
  return (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function stripePaymentUrl(paymentIntentId: string): string {
  const testMode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test");
  return `https://dashboard.stripe.com/${testMode ? "test/" : ""}payments/${paymentIntentId}`;
}

export function money(amount: unknown): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount ?? 0));
}

export function shortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function dateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
