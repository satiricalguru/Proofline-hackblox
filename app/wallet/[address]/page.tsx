import Workspace from '@/components/workspace';
export default async function WalletPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  return <Workspace wallet={(await params).address} />;
}
