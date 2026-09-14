import { createModuleFederationConfig } from '@module-federation/vite'

/** Origins of the three remotes, without trailing slash. Resolved per build in vite.config.ts. */
export interface RemoteUrls {
  pollList: string
  pollVote: string
  pollResults: string
}

/** The host only consumes: it declares where each remote lives and exposes nothing. */
export default function federationConfig(urls: RemoteUrls) {
  return createModuleFederationConfig({
    name: 'host',
    remotes: {
      poll_list: { type: 'module', name: 'poll_list', entry: `${urls.pollList}/remoteEntry.js` },
      poll_vote: { type: 'module', name: 'poll_vote', entry: `${urls.pollVote}/remoteEntry.js` },
      poll_results: {
        type: 'module',
        name: 'poll_results',
        entry: `${urls.pollResults}/remoteEntry.js`,
      },
    },
    dts: false,
  })
}
