import type { Metadata } from 'next';

import { PublicEnvScript } from 'next-runtime-env';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { AppSidebar } from '@/components/nav/app-sidebar';
import { SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

import { AppProviders } from './providers';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Repeater',
    description: 'The modern spaced repetition app',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <PublicEnvScript />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AppProviders
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <AppSidebar />
                    <SidebarInset>
                        <header className="md:p-4 pl-6 pt-6">
                            <SidebarTrigger />
                        </header>
                        {children}
                    </SidebarInset>
                    <Toaster />
                </AppProviders>
            </body>
        </html>
    );
}
