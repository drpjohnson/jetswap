import { http, createConfig } from 'wagmi'
import { sonic } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sonic],
  connectors: [injected()],
  transports: {
    [sonic.id]: http(process.env.NEXT_PUBLIC_SONIC_RPC_HTTP || "https://rpc.soniclabs.com"),
  },
})
