import { RequestBase } from '@/common/RequestBase'
import type { TokenKind, StatusEffect, FogStroke, AnnotationKind, PencilAnnotationData, TextAnnotationData, AoEAnnotationData } from '@/types'

export class AddTokenRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly battleMapId: string,
    public readonly kind: TokenKind,
    public readonly characterId: string | null,
    public readonly name: string,
    public readonly baseName: string,
    public readonly libraryKey: string | null,
    public readonly imageUrl: string | null,
    public readonly storagePath: string | null,
    public readonly color: string,
    public readonly x: number,
    public readonly y: number,
  ) { super() }
}

export class UpdateTokenRequest extends RequestBase {
  constructor(
    public readonly tokenId: string,
    public readonly patch: {
      name?: string
      x?: number
      y?: number
      size?: number
      visibleToPlayers?: boolean
      showRange?: boolean
      statusEffects?: StatusEffect[]
      color?: string
      imageUrl?: string | null
      storagePath?: string | null
    },
  ) { super() }
}

export class GetTokensRequest extends RequestBase {
  constructor(public readonly battleMapId: string) { super() }
}

export class DeleteTokenRequest extends RequestBase {
  constructor(public readonly tokenId: string) { super() }
}

export class GetFogRequest extends RequestBase {
  constructor(public readonly battleMapId: string) { super() }
}

export class SetFogRequest extends RequestBase {
  constructor(
    public readonly battleMapId: string,
    public readonly strokes: FogStroke[],
  ) { super() }
}

export class GetScaleRequest extends RequestBase {
  constructor(public readonly battleMapId: string) { super() }
}

export class SetScaleRequest extends RequestBase {
  constructor(
    public readonly battleMapId: string,
    public readonly feetPerUnit: number,
  ) { super() }
}

export class GetAnnotationsRequest extends RequestBase {
  constructor(public readonly battleMapId: string) { super() }
}

export class AddAnnotationRequest extends RequestBase {
  constructor(
    public readonly battleMapId: string,
    public readonly kind: AnnotationKind,
    public readonly data: PencilAnnotationData | TextAnnotationData | AoEAnnotationData,
  ) { super() }
}

export class DeleteAnnotationRequest extends RequestBase {
  constructor(public readonly annotationId: string) { super() }
}

export class ClearAnnotationsRequest extends RequestBase {
  constructor(
    public readonly battleMapId: string,
    public readonly kind: AnnotationKind | null,
  ) { super() }
}

export class GetLibraryRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class AddLibraryEntryRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly baseName: string,
    public readonly imageUrl: string,
    public readonly storagePath: string,
    public readonly color: string,
  ) { super() }
}

export class DeleteLibraryEntryRequest extends RequestBase {
  constructor(
    public readonly entryId: string,
    public readonly storagePath: string,
  ) { super() }
}
