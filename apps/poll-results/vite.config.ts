import { federation } from '@module-federation/vite'
import { defineConfig } from 'vite'
import federationConfig from './module-federation.config.ts'

export default defineConfig({
  plugins: [federation(federationConfig)],
})
