'use client';
import { useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registryChain } from '@/lib/registry';
import type { RegistryConfig } from '@/lib/types';
export default function Providers({
  config,
  children,
}: {
  config: RegistryConfig;
  children: React.ReactNode;
}) {
  const [client] = useState(() => new QueryClient());
  const [walletConfig] = useState(() =>
    createConfig({
      chains: [registryChain(config)],
      connectors: [injected()],
      transports: { [config.chainId]: http(config.rpcUrl) },
      ssr: true,
    }),
  );
  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
