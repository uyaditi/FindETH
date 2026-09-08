import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, sepolia, anvil } from 'wagmi/chains'
import { http } from 'wagmi'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// Use Anvil as the primary chain in development
const isDev = import.meta.env.DEV

export const wagmiConfig = getDefaultConfig({
  appName:     'Internet Treasure Hunts',
  projectId,
  chains:      isDev ? [anvil, sepolia] : [sepolia, mainnet],
  transports:  {
    [anvil.id]:   http(import.meta.env.VITE_RPC_URL   || 'http://localhost:8545'),
    [sepolia.id]: http(import.meta.env.VITE_RPC_URL   || 'https://rpc.sepolia.org'),
    [mainnet.id]: http(),
  },
  ssr: false,
})

export { anvil, sepolia, mainnet }
