import { getRegistryConfig } from '@/lib/server-config';
import { localStore } from '@/lib/local-storage';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cid: string }> },
) {
  if (!getRegistryConfig().local)
    return new Response('Not found', { status: 404 });
  const data = localStore().get((await params).cid);
  return data
    ? new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      })
    : new Response('Local metadata missing; re-upload the original file.', {
        status: 404,
      });
}
