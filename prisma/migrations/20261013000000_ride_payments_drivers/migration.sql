-- CreateEnum
CREATE TYPE "RidePaymentStatus" AS ENUM ('UNPAID', 'AUTHORIZED', 'CAPTURED', 'RELEASED', 'FAILED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "RideStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "driverEarnings" DECIMAL(10,2),
ADD COLUMN     "paymentStatus" "RidePaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "payoutId" TEXT,
ADD COLUMN     "platformFee" DECIMAL(10,2),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "requestedAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'PENDING',
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehicleYear" INTEGER NOT NULL,
    "vehicleColor" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "insuranceImagePath" TEXT NOT NULL,
    "insuranceExpiresAt" TIMESTAMP(3) NOT NULL,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE INDEX "DriverProfile_status_idx" ON "DriverProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Ride_stripePaymentIntentId_key" ON "Ride"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Ride_payoutId_idx" ON "Ride"("payoutId");

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

