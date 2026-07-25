import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Handmade Shop - Management System',
  description: 'Internal management system for a handmade shop',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-[#FAFAFA]">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
