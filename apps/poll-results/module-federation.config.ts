import { createModuleFederationConfig } from '@module-federation/vite'

export default createModuleFederationConfig({
  name: 'poll_results',
  filename: 'remoteEntry.js',
  exposes: { './App': './src/App.ts' },
  dts: false,
})
