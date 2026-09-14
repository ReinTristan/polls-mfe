import '@polls/tokens/tokens.css'
import type { HostContext } from '@polls/contracts'
import { mount } from './App'

/**
 * Standalone development only: stands in for the host so this remote runs on its
 * own port. Not exposed through federation; the host injects the real context.
 */
const ctx: HostContext = {
  pollId: 'demo-1',
  theme: 'light',
  user: { id: 'demo-user' },
  navigate: (to) => console.info(`[standalone] navigate(${to})`),
}

const el = document.getElementById('root')
if (!el) throw new Error('#root is missing from index.html')

mount(el, ctx)
