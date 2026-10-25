import { STATUS_CODE } from "jsr:@std/http@1/status"

// The app calls every function through supabase.functions.invoke(), which
// sends a CORS preflight first.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Enough of a third-party error body to tell what went wrong.
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

// Answers the preflight and turns anything thrown into a 500 carrying its
// message, so handlers only spell out the expected failures.
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

// A failed call to a third-party API, named after the service.
export async function upstreamError(service: string, res: Response) {
  const detail = await res.text()
  return new Error(
    `${service} ${res.status}: ${detail.slice(TEXT_START, UPSTREAM_DETAIL_LENGTH)}`,
  )
}
