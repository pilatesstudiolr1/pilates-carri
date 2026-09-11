import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Pilates Studio LR',
    template: '%s | Pilates Studio LR',
  },
  description: 'Sistema de gestión integral para estudios de Pilates Reformer',
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.webp',
    apple: '/favicon.webp',
  },
};


import { ToastProvider } from '@/components/providers/ToastProvider';

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pilates_theme');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

