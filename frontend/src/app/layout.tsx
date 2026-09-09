import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AccessibilityProvider } from '@/context/AccessibilityContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata = {
  title: "AgriFlow",
  description: "Agricultural marketplace connecting farmers, buyers and logistics providers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <LanguageProvider>
            <AccessibilityProvider>
              <AuthProvider>
                <SidebarProvider>{children}</SidebarProvider>
              </AuthProvider>
            </AccessibilityProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
