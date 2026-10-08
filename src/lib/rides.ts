import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Ride, RideStatus } from '@prisma/client';

export type SessionUser = { id: string; role: 'RENTER' | 'HOST' | 'ADMIN' | 'DRIVER' };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) return null;
  return { id: user.id, role: user.role };
}

export const FINAL_STATUSES: RideStatus[] = ['COMPLETED', 'CANCELLED'];

// The only forward step a driver may take from each status.
export const NEXT_STATUS: Partial<Record<RideStatus, RideStatus>> = {
  ACCEPTED: 'EN_ROUTE',
  EN_ROUTE: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED'
};

export function serializeRide(ride: Ride & Record<string, any>) {
  return {
    ...ride,
    ratePerMinute: Number(ride.ratePerMinute),
    minimumFare: Number(ride.minimumFare),
    totalPrice: Number(ride.totalPrice)
  };
}
