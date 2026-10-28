import type { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { WAITLIST_INTEREST_LABEL, WAITLIST_INTERESTS } from '@/lib/waitlist';

// Quotes a CSV cell, and stops spreadsheet apps treating it as a formula.
function cell(value: string | null): string {
  let text = value ?? '';
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const interestParam = req.nextUrl.searchParams.get('interest') ?? '';
  const interest = WAITLIST_INTERESTS.find((i) => i.value === interestParam)?.value;

  const where: Prisma.WaitlistEntryWhereInput = {
    ...(interest ? { interest } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } }
          ]
        }
      : {})
  };
  const entries = await prisma.waitlistEntry.findMany({ where, orderBy: { createdAt: 'desc' } });

  const rows = [
    ['Joined', 'Name', 'Email', 'Mobile', 'City', 'Interest'].map(cell).join(','),
    ...entries.map((e) =>
      [e.createdAt.toISOString(), e.name, e.email, e.phone, e.city, WAITLIST_INTEREST_LABEL[e.interest]].map(cell).join(',')
    )
  ];

  return new Response(rows.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
