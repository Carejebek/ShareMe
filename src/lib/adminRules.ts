import type { BookingStatus } from "@prisma/client";

// Status changes an admin may make to a booking. Finished bookings can't be changed.
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
