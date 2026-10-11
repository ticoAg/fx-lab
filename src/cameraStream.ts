// One camera stream for the whole page. Leases share it.
// Unmount, the last lease dropping, or a stream that arrives after
// cancellation always stops the tracks. Hiding the page stops them too.

export type CameraFailure = 'denied' | 'missing' | 'unsupported'

type Consumer = {
  id: number
  video: HTMLVideoElement
  onLive: () => void
  onError: (failure: CameraFailure) => void
}

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
}

const consumers = new Map<number, Consumer>()
let nextId = 1
let stream: MediaStream | null = null
let requestGen = 0
let inflight: Promise<MediaStream> | null = null
let inflightGen = -1
let pageHidden = false
let hideHooked = false

function classify(err: unknown): CameraFailure {
  const name = err instanceof DOMException || err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'denied'
  }
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'NotReadableError' ||
    name === 'OverconstrainedError' ||
    name === 'AbortError'
  ) {
    return 'missing'
  }
  return 'unsupported'
}

function stopTracks(media: MediaStream | null) {
  media?.getTracks().forEach((track) => {
    track.stop()
  })
}

function dropLiveStream() {
  requestGen += 1
  const current = stream
  stream = null
  stopTracks(current)
}

function detach(video: HTMLVideoElement) {
  if (video.srcObject) video.srcObject = null
}

function bind(consumer: Consumer, media: MediaStream) {
  const video = consumer.video
  video.muted = true
  if (video.srcObject !== media) video.srcObject = media
  const played = video.play()
  if (played) played.catch(() => {})
  consumer.onLive()
}

function watch(media: MediaStream) {
  const onEnded = () => {
    if (stream !== media) return
    if (media.getTracks().some((track) => track.readyState === 'live')) return
    const snapshot = [...consumers.values()]
    consumers.clear()
    dropLiveStream()
    for (const consumer of snapshot) {
      detach(consumer.video)
      consumer.onError('missing')
    }
  }
  media.getTracks().forEach((track) => {
    track.addEventListener('ended', onEnded)
  })
}

function requestMedia(gen: number): Promise<MediaStream> {
  if (inflight && inflightGen === gen) return inflight
  inflightGen = gen
  const pending = navigator.mediaDevices.getUserMedia(CONSTRAINTS)
  inflight = pending.finally(() => {
    if (inflightGen === gen) {
      inflight = null
      inflightGen = -1
    }
  })
  return inflight
}

async function ensure(gen: number) {
  if (pageHidden || consumers.size === 0) return
  if (!navigator.mediaDevices?.getUserMedia) {
    const snapshot = [...consumers.values()]
    consumers.clear()
    for (const consumer of snapshot) consumer.onError('unsupported')
    return
  }
  const live = stream?.getTracks().some((track) => track.readyState === 'live') ? stream : null
  if (live) {
    for (const consumer of consumers.values()) bind(consumer, live)
    return
  }

  let media: MediaStream
  try {
    media = await requestMedia(gen)
  } catch (err) {
    if (gen !== requestGen || pageHidden) return
    const failure = classify(err)
    const snapshot = [...consumers.values()]
    consumers.clear()
    for (const consumer of snapshot) consumer.onError(failure)
    return
  }

  if (gen !== requestGen || pageHidden || consumers.size === 0) {
    stopTracks(media)
    return
  }

  stream = media
  watch(media)
  for (const consumer of consumers.values()) bind(consumer, media)
}

function releaseConsumer(id: number) {
  const consumer = consumers.get(id)
  if (!consumer) return
  consumers.delete(id)
  detach(consumer.video)
  if (consumers.size === 0) dropLiveStream()
}

function onVisibility() {
  pageHidden = document.hidden
  if (document.hidden) {
    for (const consumer of consumers.values()) detach(consumer.video)
    dropLiveStream()
    return
  }
  if (consumers.size > 0) {
    const gen = requestGen
    void ensure(gen)
  }
}

function hookHide() {
  if (hideHooked || typeof document === 'undefined') return
  hideHooked = true
  pageHidden = document.hidden
  document.addEventListener('visibilitychange', onVisibility)
}

export function acquireSharedCamera(options: {
  video: HTMLVideoElement
  onLive?: () => void
  onError?: (failure: CameraFailure) => void
}): () => void {
  hookHide()
  const id = nextId
  nextId += 1
  const consumer: Consumer = {
    id,
    video: options.video,
    onLive: options.onLive ?? (() => {}),
    onError: options.onError ?? (() => {}),
  }
  consumers.set(id, consumer)
  const gen = requestGen
  void ensure(gen)
  let released = false
  return () => {
    if (released) return
    released = true
    releaseConsumer(id)
  }
}
