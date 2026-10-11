-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('ECONOMY', 'SEDAN', 'SUV', 'LUXURY', 'SPORTS', 'VAN', 'TRUCK');
-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "category" "VehicleCategory";
-- CreateIndex
CREATE INDEX "Listing_category_idx" ON "Listing"("category");
