import { handleJudgingDemo } from '@/lib/judging-demo'

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handleJudgingDemo(request, (await context.params).path)
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE }
