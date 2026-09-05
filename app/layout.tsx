import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Proofline — Credential registry',
  description:
    'Issue, verify and revoke wallet-bound credentials. Independent verification on Ethereum Sepolia.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
