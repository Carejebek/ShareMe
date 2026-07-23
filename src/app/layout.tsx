import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'ShareRide — Peer-to-Peer Car Sharing',
  description: 'Rent unique cars from local hosts, or list your own and earn.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
