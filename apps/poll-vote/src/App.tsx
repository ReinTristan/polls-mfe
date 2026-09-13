import { type MountFn, on } from '@polls/contracts'
import { tokens } from '@polls/tokens'
import { atom, createStore, Provider, useAtomValue } from 'jotai'
import { createRoot } from 'react-dom/client'
import styled from 'styled-components'

const selectedPollIdAtom = atom<string | null>(null)

const Selected = styled.div`
  padding: ${tokens.space[4]};
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.text};
  border-radius: ${tokens.radius.md};
`

function App() {
  const pollId = useAtomValue(selectedPollIdAtom)
  return <Selected>Selected poll: {pollId ?? 'none yet'}</Selected>
}

export const mount: MountFn = (el) => {
  // One store per mount: a remount starts clean and no atom outlives the unmount.
  const store = createStore()

  // Replay: poll-vote usually mounts after poll-list already emitted.
  const off = on('poll:selected', ({ pollId }) => store.set(selectedPollIdAtom, pollId), {
    replay: true,
  })

  const root = createRoot(el)
  root.render(
    <Provider store={store}>
      <App />
    </Provider>,
  )

  return () => {
    off()
    root.unmount()
  }
}
