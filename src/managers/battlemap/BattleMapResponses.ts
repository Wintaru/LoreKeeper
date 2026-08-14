import { ResponseBase } from '@/common/ResponseBase'
import type { BattleToken, BattleMapFog, BattleMapScale, BattleMapAnnotation, BattleTokenLibraryEntry } from '@/types'

export class TokenResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly token: BattleToken | null

  constructor(correlationId: string, token: BattleToken | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.token = token
    this.success = token !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class TokensResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly tokens: BattleToken[]

  constructor(correlationId: string, tokens: BattleToken[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.tokens = tokens
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class DeleteResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null

  constructor(correlationId: string, success: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.success = success
    this.errorMessage = errorMessage ?? null
  }
}

export class FogResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly fog: BattleMapFog | null

  constructor(correlationId: string, fog: BattleMapFog | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.fog = fog
    this.success = fog !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class ScaleResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly scale: BattleMapScale | null

  constructor(correlationId: string, scale: BattleMapScale | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.scale = scale
    this.success = scale !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class AnnotationResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly annotation: BattleMapAnnotation | null

  constructor(correlationId: string, annotation: BattleMapAnnotation | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.annotation = annotation
    this.success = annotation !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class AnnotationsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly annotations: BattleMapAnnotation[]

  constructor(correlationId: string, annotations: BattleMapAnnotation[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.annotations = annotations
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class LibraryEntryResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly entry: BattleTokenLibraryEntry | null

  constructor(correlationId: string, entry: BattleTokenLibraryEntry | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.entry = entry
    this.success = entry !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class LibraryResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly entries: BattleTokenLibraryEntry[]

  constructor(correlationId: string, entries: BattleTokenLibraryEntry[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.entries = entries
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}
