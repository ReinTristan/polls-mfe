import { federation } from '@module-federation/vite'
import { defineConfig } from 'vite'
import federationConfig from './module-federation.config.ts'

export default defineConfig({
  plugins: [federation(federationConfig)],
  // strictPort: moving to another port would break the host's default URL for this remote.
  server: { port: 3003, strictPort: true },
})
