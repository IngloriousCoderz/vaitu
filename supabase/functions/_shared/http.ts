import { STATUS_CODE } from "jsr:@std/http@1/status"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const TEXT_START = 0
const UPSTREAM_DETAIL_LENGTH = 200

export { STATUS_CODE }

export function json(
  body: unknown,
  status: number = STATUS_CODE.OK,
  headers: Record<string, string> = {},
) {
  return Response.json(body, { status, headers: { ...cors, ...headers } })
}

export function serve(
  handler: (req: Request) => Promise<Response>,
  fallbackError: string,
) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cors })
    }

    try {
      return await handler(req)
    } catch (err) {
      const message = err instanceof Error ? err.message : fallbackError
      return json(
        { error: message || fallbackError },
        STATUS_CODE.InternalServerError,
      )
    }
  })
}

export async function upstreamError(service: string, res: Response) {
  const detail = await res.text()
  return new Error(
    `${service} ${res.status}: ${detail.slice(TEXT_START, UPSTREAM_DETAIL_LENGTH)}`,
  )
}
