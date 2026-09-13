import type { HostContext } from '@polls/contracts'
import { tokens } from '@polls/tokens'
import { useMemo } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router'

/** No real authentication: the simulated user lives here, in the host. */
const DEMO_USER = { id: 'demo-user' }

/**
 * Builds what every remote receives on mount.
 *
 * `navigate` is a plain function wrapping the hook. The hook itself never crosses
 * the boundary: no remote imports react-router.
 */
function useHostContext(): HostContext {
  const { pollId = null } = useParams()
  const navigate = useNavigate()

  return useMemo(
    () => ({
      pollId,
      theme: 'light',
      user: DEMO_USER,
      navigate: (to: string) => {
        navigate(to)
      },
    }),
    [pollId, navigate],
  )
}

/** Stands in for a mounted remote until RemoteMount exists. */
function Placeholder({ remote, ctx }: { remote: string; ctx: HostContext }) {
  return (
    <p>
      {remote} mounts here · pollId: {String(ctx.pollId)}
    </p>
  )
}

function ListPage() {
  const ctx = useHostContext()
  return <Placeholder remote="poll-list" ctx={ctx} />
}

function PollPage() {
  const ctx = useHostContext()
  return (
    <>
      <Placeholder remote="poll-vote" ctx={ctx} />
      <Placeholder remote="poll-results" ctx={ctx} />
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: 'flex', gap: tokens.space[4], padding: tokens.space[4] }}>
        <Link to="/">Polls</Link>
        <Link to="/polls/demo-1">demo-1</Link>
      </nav>
      <main style={{ padding: tokens.space[4] }}>
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/polls/:pollId" element={<PollPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
