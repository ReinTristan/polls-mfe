import { emit, type MountFn, on } from '@polls/contracts'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  const [selected, setSelected] = useState<string | null>(null)

  // `on()` returns its cleanup, and returning it from the effect runs it when the
  // root unmounts. Without it, every remount would leave a listener behind.
  useEffect(() => on('poll:selected', ({ pollId }) => setSelected(pollId)), [])

  return (
    <>
      {/* Emits and stops there: navigating is the host's call, not poll-list's. */}
      <button type="button" onClick={() => emit('poll:selected', { pollId: 'demo-1' })}>
        Select demo-1
      </button>
      <p>Last selected: {selected ?? 'none'}</p>
    </>
  )
}

/** Own root, shared React instance: the host's tree never contains this one. */
export const mount: MountFn = (el) => {
  const root = createRoot(el)
  root.render(<App />)
  return () => root.unmount()
}
