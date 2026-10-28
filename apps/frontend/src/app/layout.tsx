import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { QueryProvider } from '@/lib/QueryProvider';
import { ThemeProvider } from '@/lib/theme/ThemeContext';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Companion.ai — Adaptive Daily Learning Companion',
  description: 'Tell me what you want to become. I will tell you what to learn today. Personalized, adaptive microlearning for software engineers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('companion-theme');
                const isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500/30 selection:text-indigo-600 dark:selection:text-indigo-200">
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1 flex flex-col">
                {children}
              </main>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
