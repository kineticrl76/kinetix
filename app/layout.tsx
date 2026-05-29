import type { Metadata, Viewport } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'KinetIX — Personal Financial Command Center',
  description: 'Track income, expenses, savings, and goals in one intelligent dashboard.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KinetIX',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <NavBar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-100">
            KinetIX · Personal Financial Command Center
          </footer>
        </Providers>
      </body>
    </html>
  );
}
