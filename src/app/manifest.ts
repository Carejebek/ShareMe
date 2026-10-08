import type { MetadataRoute } from 'next';

const THEME_COLOR = '#0c7f47';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'JayXZ',
    short_name: 'JayXZ',
    description: 'Rent unique cars from local hosts, or list your own and earn.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: THEME_COLOR,
    categories: ['travel', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      {
        name: 'Browse cars',
        short_name: 'Cars',
        url: '/cars',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Book a ride',
        short_name: 'Ride',
        url: '/ride',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'My bookings',
        short_name: 'Bookings',
        url: '/dashboard/bookings',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      }
    ]
  };
}
