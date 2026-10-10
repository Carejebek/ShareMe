import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ListingAccess = { hostId: string; isActive: boolean; approvalStatus: string };

// A listing is public only when an admin has approved it and it hasn't been taken offline.
export function isListingLive(listing: ListingAccess): boolean {
  return listing.isActive && listing.approvalStatus === "APPROVED";
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
