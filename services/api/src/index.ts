import Fastify from 'fastify'

/**
 * Backend skeleton. The poll endpoints, JSON Schema validation and the WebSocket
 * are SPEC 03; all that lives here is the server coming up, so the service exists
 * in the workspace and in the deploy.
 */
const app = Fastify({ logger: true })

app.get('/health', () => ({ status: 'ok' }))

const port = Number(process.env.PORT ?? 4000)

await app.listen({ port, host: '0.0.0.0' })
