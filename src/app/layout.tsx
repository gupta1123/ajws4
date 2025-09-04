import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { TeacherProvider } from "@/lib/auth/teacher-context";
import { ThemeProvider } from "@/lib/theme/context";
import { AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AJWS",
  description: "A comprehensive school management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider>
          <AuthProvider>
            <TeacherProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster />
            </TeacherProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}