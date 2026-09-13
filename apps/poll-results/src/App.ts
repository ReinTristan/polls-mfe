import { type MountFn, on } from '@polls/contracts'

/** No framework: the same contract, honored with plain DOM calls. */
export const mount: MountFn = (el, ctx) => {
  const heading = document.createElement('p')
  heading.textContent = `Results for ${ctx.pollId ?? 'no poll'}`

  const lastVote = document.createElement('p')
  lastVote.textContent = 'No vote cast yet'

  el.append(heading, lastVote)

  const off = on('vote:cast', ({ optionId }) => {
    lastVote.textContent = `Last vote: ${optionId}`
  })

  return () => {
    off()
    el.replaceChildren()
  }
}
