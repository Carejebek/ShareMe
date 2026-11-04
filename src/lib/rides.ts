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
  // The route polyline is only used for the admin map; keep it out of rider/driver polling responses.
  const { routePolyline: _routePolyline, ...rest } = ride;
  return {
    ...rest,
    refundedAmount: Number(ride.refundedAmount ?? 0),
    ratePerMinute: Number(ride.ratePerMinute),
    minimumFare: Number(ride.minimumFare),
    totalPrice: Number(ride.totalPrice),
    platformFee: ride.platformFee === null || ride.platformFee === undefined ? null : Number(ride.platformFee),
    driverEarnings: ride.driverEarnings === null || ride.driverEarnings === undefined ? null : Number(ride.driverEarnings)
  };
}
