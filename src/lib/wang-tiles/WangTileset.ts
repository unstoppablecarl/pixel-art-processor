export type TileId = string & { readonly __tileId: unique symbol };

export interface WangTile<T> {
  readonly id: TileId;
  readonly edges: {
    readonly N: T;
    readonly E: T;
    readonly S: T;
    readonly W: T;
  };
}

export class WangTileset<T> {
  readonly tiles: readonly WangTile<T>[]
  readonly byId: ReadonlyMap<TileId, WangTile<T>>

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

  constructor(tiles: WangTile<T>[]) {
    this.tiles = tiles
    this.byId = new Map(tiles.map(t => [t.id, t] as const))
  }
}
