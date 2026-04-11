import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'VaultX — Under Maintenance',
  description: 'VaultX is currently undergoing scheduled maintenance.',
};

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}