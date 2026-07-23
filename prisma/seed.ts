import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const host = await prisma.user.upsert({
    where: { email: 'host@example.com' },
    update: {},
    create: {
      name: 'Alex Host',
      email: 'host@example.com',
      passwordHash,
      role: 'HOST'
    }
  });

  const renter = await prisma.user.upsert({
    where: { email: 'renter@example.com' },
    update: {},
    create: {
      name: 'Jamie Renter',
      email: 'renter@example.com',
      passwordHash,
      role: 'RENTER'
    }
  });

  await prisma.listing.createMany({
    data: [
      {
        hostId: host.id,
        title: 'Sporty Convertible Downtown',
        description: 'A fun weekend cruiser, perfect for coastal drives.',
        make: 'Mazda',
        model: 'MX-5',
        year: 2022,
        pricePerDay: 79,
        city: 'Manchester',
        state: 'NH',
        seats: 2,
        transmission: 'MANUAL',
        fuelType: 'GASOLINE',
        imageUrls: []
      },
      {
        hostId: host.id,
        title: 'Reliable Family SUV',
        description: 'Spacious, safe, and great on gas. Ideal for road trips.',
        make: 'Toyota',
        model: 'Highlander',
        year: 2021,
        pricePerDay: 65,
        city: 'Manchester',
        state: 'NH',
        seats: 7,
        transmission: 'AUTOMATIC',
        fuelType: 'HYBRID',
        imageUrls: []
      }
    ]
  });

  console.log('Seed complete:', { host: host.email, renter: renter.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
