import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Linus',
  description: 'Internal management system for a handmade shop',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Linus',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/apple-touch-icon.png',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#7FA345',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-[#FAFAFA]">{children}</div>
        </AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
