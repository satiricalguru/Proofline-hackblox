import Workspace from '@/components/workspace';
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ chain: string; contract: string; tokenId: string }>;
}) {
  const p = await params;
  return (
    <Workspace tokenId={p.tokenId} chainId={p.chain} contract={p.contract} />
  );
}
