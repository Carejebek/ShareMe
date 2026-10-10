import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A car is public only when an admin has approved it, it hasn't been taken offline
// and its host isn't suspended. Use this in every query that renters can see.
export const PUBLIC_LISTING_WHERE = {
  isActive: true,
  approvalStatus: "APPROVED",
  host: { suspendedAt: null },
} satisfies Prisma.ListingWhereInput;

type ListingAccess = {
  hostId: string;
  isActive: boolean;
  approvalStatus: string;
  host: { suspendedAt: Date | null };
};

export function isListingLive(listing: ListingAccess): boolean {
  return listing.isActive && listing.approvalStatus === "APPROVED" && listing.host.suspendedAt === null;
}

// Live listings are visible to everyone; others only to their host and admins.
export async function canSeeListing(listing: ListingAccess): Promise<boolean> {
  if (isListingLive(listing)) return true;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return false;
  if (userId === listing.hostId) return true;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "ADMIN";
}
