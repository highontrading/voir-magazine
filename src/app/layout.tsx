import type { Metadata, Viewport } from 'next';
import { getSettings } from '@/lib/settings';
import './globals.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
    title: { default: s.seo.defaultTitle, template: `%s | ${s.siteName}` },
    description: s.seo.defaultDescription || s.description || undefined,
    applicationName: s.siteName,
    openGraph: { siteName: s.siteName, type: 'website', images: s.seo.ogImage ? [s.seo.ogImage] : undefined },
    twitter: { card: 'summary_large_image' },
    alternates: { types: { 'application/rss+xml': '/rss.xml' } },
  };
}

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const vars = `:root{--accent:${s.accentColor};--ink:${s.inkColor};--paper:${s.paperColor};}`;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300..800;1,8..60,300..800&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: vars }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
