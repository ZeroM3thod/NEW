import type { Metadata } from 'next';
import './globals.css';
import './user-sidebar.css';

export const metadata: Metadata = {
  title: 'VaultX — Premium Investment Platform',
  description:
    'VaultX runs structured investment seasons with defined entry periods, transparent ROI targets, and no hidden fees.',
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
      </head>
      <body>{children}</body>
    </html>
  );
}