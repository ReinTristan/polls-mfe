import { createModuleFederationConfig } from '@module-federation/vite'

export default createModuleFederationConfig({
  name: 'poll_vote',
  filename: 'remoteEntry.js',
  exposes: { './App': './src/App.tsx' },
  dts: false,
})
