import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import federationConfig from './module-federation.config.ts'

export default defineConfig(({ mode }) => {
  // Empty prefix: read every variable, not only VITE_*. These configure the federation
  // plugin and are baked in at build time; application code never reads them.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      federation(
        federationConfig({
          pollList: env.POLL_LIST_URL || 'http://localhost:3001',
          pollVote: env.POLL_VOTE_URL || 'http://localhost:3002',
          pollResults: env.POLL_RESULTS_URL || 'http://localhost:3003',
        }),
      ),
    ],
    server: { port: 3000, strictPort: true },
  }
})
