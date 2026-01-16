export type TileId = string & { readonly __tileId: unique symbol };

export type WangTileEdge = keyof WangTile<any>['edges']

export interface WangTile<T> {
  readonly id: TileId;
  readonly edges: {
    readonly N: T;
    readonly E: T;
    readonly S: T;
    readonly W: T;
  };
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
            const id = `tile-${N}-${E}-${S}-${W}`
            tiles.push({
              id: id as TileId,
              edges: {
                N: eligibleForN[N].edgeValue,
                E: eligibleForE[E].edgeValue,
                S: eligibleForS[S].edgeValue,
                W: eligibleForW[W].edgeValue,
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
}

export type TileWithEligibleEdges<T> = {
  edgeValue: T,
  eligibleForN?: boolean,
  eligibleForE?: boolean,
  eligibleForS?: boolean,
  eligibleForW?: boolean,
}