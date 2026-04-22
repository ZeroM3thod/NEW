import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Account Suspended · VaultX',
  description: 'Your VaultX account has been suspended.',
};

export default function SuspendedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}