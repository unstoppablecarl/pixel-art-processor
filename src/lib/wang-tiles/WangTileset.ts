import type { Direction, DirectionSet } from '../pipeline/_types.ts'

export type TileId = string & { readonly __tileId: unique symbol };

export interface WangTile<T> {
  readonly id: TileId;
  readonly edges: DirectionSet<T>;
}

export function populateIndexedWangTile<T>(tile: WangTile<number>, values: T[]): WangTile<T> {
  return {
    id: tile.id,
    edges: {
      N: values[tile.edges.N],
      E: values[tile.edges.E],
      S: values[tile.edges.S],
      W: values[tile.edges.W],
    },
  }
}

export class WangTileset<T> {
  readonly tiles: readonly WangTile<T>[]
  readonly byId: ReadonlyMap<TileId, WangTile<T>>
  private byEdgeValue: Map<T, readonly WangTile<T>[]> | undefined

  static createFromColors<T>(colors: T[]): WangTileset<T> {
    const tiles: WangTile<T>[] = []
    for (let N = 0; N < colors.length; N++) {
      for (let E = 0; E < colors.length; E++) {
        for (let S = 0; S < colors.length; S++) {
          for (let W = 0; W < colors.length; W++) {
            const id = `tile-${N}-${E}-${S}-${W}`
            tiles.push({
              id: id as TileId,
              edges: {
                N: colors[N],
                E: colors[E],
                S: colors[S],
                W: colors[W],
              },
            })
          }
        }
      }
    }

    return new WangTileset<T>(tiles)
  }

  static createFromLimitedEdges<
    T,
    I extends TileWithEligibleEdges<T> = TileWithEligibleEdges<T>
  >(items: I[]): WangTileset<T> {
    const tiles: WangTile<T>[] = []

    const eligibleForN = items.filter(t => t.eligibleForN)
    const eligibleForE = items.filter(t => t.eligibleForE)
    const eligibleForS = items.filter(t => t.eligibleForS)
    const eligibleForW = items.filter(t => t.eligibleForW)

    for (let N = 0; N < eligibleForN.length; N++) {
      for (let E = 0; E < eligibleForE.length; E++) {
        for (let S = 0; S < eligibleForS.length; S++) {
          for (let W = 0; W < eligibleForW.length; W++) {

            const iN = eligibleForN[N].edgeValue
            const iE = eligibleForE[E].edgeValue
            const iS = eligibleForS[S].edgeValue
            const iW = eligibleForW[W].edgeValue

            const id = `tile-${iN}-${iE}-${iS}-${iW}`
            tiles.push({
              id: id as TileId,
              edges: {
                N: iN,
                E: iE,
                S: iS,
                W: iW,
              },
            })
          }
        }
      }
    }

    return new WangTileset<T>(tiles)
  }

  constructor(tiles: WangTile<T>[]) {
    this.tiles = tiles
    this.byId = new Map(tiles.map(t => [t.id, t] as const))
  }

  buildEdgeIndex() {
    const edgeMap = new Map<T, WangTile<T>[]>()
    for (const tile of this.tiles) {
      for (const edge of Object.values(tile.edges)) {
        if (!edgeMap.has(edge)) edgeMap.set(edge, [])
        edgeMap.get(edge)!.push(tile)
      }
    }
    this.byEdgeValue = edgeMap
  }

  tilesWithEdge(value: T): readonly WangTile<T>[] {
    if (this.byEdgeValue === undefined) {
      this.buildEdgeIndex()
    }
    return this.byEdgeValue!.get(value) ?? []
  }

  getTilesWithSameEdge(tile: WangTile<T>, edge: Direction) {
    const edgeId = tile.edges[edge]
    const tilesWithEdge = this.tilesWithEdge(edgeId)
    const tilesWithSameEdgeOnSameSide = tilesWithEdge.filter(t => t.edges[edge] === edgeId)
    const tilesWithSameEdgeOnOppositeSide = tilesWithEdge.filter(t => t.edges[oppositeEdge[edge]] === edgeId)

    return {
      sameEdge: tilesWithSameEdgeOnSameSide,
      mirroredEdge: tilesWithSameEdgeOnOppositeSide,
    }
  }
}

export class AxialEdgeWangTileset<T> extends WangTileset<T> {
  constructor(
    tiles: WangTile<T>[],
    readonly verticalEdgeValues: T[],
    readonly horizontalEdgeValues: T[],
  ) {
    super(tiles)
  }
}

export function createAxialEdgeWangTileset<T>(verticalEdgeValues: T[], horizontalEdgeValues: T[]): AxialEdgeWangTileset<T> {
  const tiles: WangTile<T>[] = []

  const eligibleForN = verticalEdgeValues
  const eligibleForE = horizontalEdgeValues
  const eligibleForS = verticalEdgeValues
  const eligibleForW = horizontalEdgeValues

  for (let N = 0; N < eligibleForN.length; N++) {
    for (let E = 0; E < eligibleForE.length; E++) {
      for (let S = 0; S < eligibleForS.length; S++) {
        for (let W = 0; W < eligibleForW.length; W++) {

          const iN = eligibleForN[N]
          const iE = eligibleForE[E]
          const iS = eligibleForS[S]
          const iW = eligibleForW[W]

          const id = `tile-${iN}-${iE}-${iS}-${iW}`
          tiles.push({
            id: id as TileId,
            edges: {
              N: iN,
              E: iE,
              S: iS,
              W: iW,
            },
          })
        }
      }
    }
  }

  return new AxialEdgeWangTileset<T>(tiles, verticalEdgeValues, horizontalEdgeValues)
}

export type TileWithEligibleEdges<T> = {
  edgeValue: T,
  eligibleForN?: boolean,
  eligibleForE?: boolean,
  eligibleForS?: boolean,
  eligibleForW?: boolean,
}

export const oppositeEdge: Record<Direction, Direction> = {
  N: 'S' as Direction,
  S: 'N' as Direction,
  E: 'W' as Direction,
  W: 'E' as Direction,
} as const

export function makeAxialEdgeWangTileset(horizontalCount: number = 2, verticalCount?: number) {
  verticalCount ??= horizontalCount

  const edges: TileWithEligibleEdges<number>[] = []
  let index = 0

  for (let i = 0; i < horizontalCount; i++) {
    edges.push({
      edgeValue: index,
      eligibleForN: true,
      eligibleForS: true,
    })
    index++
  }

  for (let i = 0; i < verticalCount; i++) {
    edges.push({
      edgeValue: index,
      eligibleForW: true,
      eligibleForE: true,
    })
    index++
  }

  return WangTileset.createFromLimitedEdges<number>(edges)
}