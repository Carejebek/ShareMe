import { prisma } from "@/lib/prisma";

// Who may take rides: a user with an approved driver application, a verified licence,
// unexpired insurance and no suspension. Checked from the database on every driver action.
export async function getActiveDriver(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      suspendedAt: true,
      verificationStatus: true,
      driverProfile: true,
    },
  });
  const profile = user?.driverProfile;
  if (!user || user.suspendedAt || !profile) return { driver: null, reason: "You need an approved driver account to take rides." };
  if (profile.status !== "APPROVED") return { driver: null, reason: "Your driver application hasn't been approved yet." };
  if (user.verificationStatus !== "VERIFIED") return { driver: null, reason: "Your driver's licence needs to be verified." };
  if (profile.insuranceExpiresAt < new Date()) {
    return { driver: null, reason: "Your insurance has expired. Upload your new insurance on the Drive page." };
  }
  return { driver: { ...user, profile }, reason: "" };
}

// Prisma filter for drivers who can currently be offered or assigned rides.
export function activeDriverWhere() {
  return {
    suspendedAt: null,
    verificationStatus: "VERIFIED" as const,
    driverProfile: { status: "APPROVED" as const, insuranceExpiresAt: { gt: new Date() } },
  };
}

export function vehicleLabel(p: { vehicleColor: string; vehicleYear: number; vehicleMake: string; vehicleModel: string }) {
  return `${p.vehicleColor} ${p.vehicleYear} ${p.vehicleMake} ${p.vehicleModel}`;
}
