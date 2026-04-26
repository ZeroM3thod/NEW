import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'ValutX — Under Maintenance',
  description: 'ValutX is currently undergoing scheduled maintenance.',
};

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}