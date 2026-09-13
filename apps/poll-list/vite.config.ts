import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import federationConfig from './module-federation.config.ts'

export default defineConfig({
  plugins: [react(), federation(federationConfig)],
})
