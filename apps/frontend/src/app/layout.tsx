import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { QueryProvider } from '@/lib/QueryProvider';
import { ThemeProvider } from '@/lib/theme/ThemeContext';

export const metadata: Metadata = {
  title: 'AI Learning Companion — Adaptive Daily Learning Platform',
  description: 'Build skills that matter with an AI companion that adapts to your goals, your pace, and your progress. Your journey is personal. Your potential is limitless.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('companion-theme') || 'light';
                const isDark = theme === 'dark';
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
      <body className="bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col selection:bg-[#d8ff19] selection:text-[#111111]">
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
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
