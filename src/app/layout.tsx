import type { Metadata } from 'next';
import './globals.css';
import './user-sidebar.css';
import './logo-vx-override.css';   // ← ADD THIS: applies Compact·Light VX logo to every page
import StyledJsxRegistry from '@/components/StyledJsxRegistry';

export const metadata: Metadata = {
  title: 'VaultX — Investment Platform',
  description:
    'VaultX runs structured investment seasons with defined entry periods, transparent ROI targets, and no hidden fees.',

  verification: {
    google: "google3a0401f11912ee2b",
  },

  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        {/* Inline SVG favicon as fallback for environments where /public is not served */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='3' fill='%231c1c1c'/%3E%3Crect x='2' y='2' width='28' height='28' rx='1.5' stroke='%23b8935a' stroke-width='0.5' fill='none' opacity='0.55'/%3E%3Ctext x='16' y='21' text-anchor='middle' font-family='Georgia%2C serif' font-size='13' font-weight='700' fill='%23b8935a' letter-spacing='0.5'%3EVX%3C/text%3E%3Crect x='8' y='26' width='16' height='1.2' rx='0.6' fill='%23b8935a'/%3E%3C/svg%3E"
        />
      </head>
      <body data-rendered="true" style={{ minHeight: '100vh' }}>
        <StyledJsxRegistry>{children}</StyledJsxRegistry>
      </body>
    </html>
  );
}