-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "insuranceReminderDays" INTEGER,
ADD COLUMN     "insuranceReminderFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "enRouteAt" TIMESTAMP(3),
ADD COLUMN     "fareBreakdown" JSONB,
ADD COLUMN     "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "routePolyline" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RideRefund" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "stripeRefundId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RideRefund_stripeRefundId_key" ON "RideRefund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "RideRefund_rideId_idx" ON "RideRefund"("rideId");

-- AddForeignKey
ALTER TABLE "RideRefund" ADD CONSTRAINT "RideRefund_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRefund" ADD CONSTRAINT "RideRefund_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

