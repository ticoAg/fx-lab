// The subset of the Workers R2 binding that the Pages Functions use.

export type R2ObjectBody = {
  etag?: string
  arrayBuffer(): Promise<ArrayBuffer>
  text(): Promise<string>
}

export type R2Bucket = {
  get(key: string): Promise<R2ObjectBody | null>
  put(
    key: string,
    value: ArrayBuffer | string | Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string }
      onlyIf?: { etagMatches?: string }
    },
  ): Promise<unknown>
  delete(key: string): Promise<unknown>
  list(opts: { prefix: string; cursor?: string }): Promise<{
    objects: { key: string }[]
    truncated?: boolean
    cursor?: string
  }>
}
