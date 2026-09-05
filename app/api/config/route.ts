import { getRegistryConfig } from '@/lib/server-config';
export async function GET() {
  return Response.json(getRegistryConfig(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
