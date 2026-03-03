import type { PluginAPI } from '@organizrx/plugin-sdk'
import type { JsonRpcRequest, JsonRpcResponse } from './api-types'

export async function jsonRpc<T>(
  api: PluginAPI,
  url: string,
  username: string,
  password: string,
  method: string,
  params: unknown[] = []
): Promise<T> {
  const rpcUrl = new URL(url)
  rpcUrl.pathname = rpcUrl.pathname.replace(/\/$/, '') + '/jsonrpc'

  const body: JsonRpcRequest = {
    method,
    params,
  }

  api.logger.debug('NZBGet JSON-RPC request', {
    url: rpcUrl.toString(),
    method,
  })

  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  const response = await api.http.fetch(rpcUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`NZBGet API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as JsonRpcResponse<T>
  return data.result
}
