import type { Color32 } from './color.ts'

// x,y,z are vectors [-1, 1]
export type Normal = {
  x: number,
  y: number,
  z: number
}

export type Normal32 = number & { __brand: 'Normal32' };

/**
 * Since we are using the color technique, a Normal32 and Color32
 * share the same bit layout. This is essentially a type-cast.
 */
export function packedNormalToPackedColor(norm: Normal32): Color32 {
  return norm as unknown as Color32
}

// x,y,z are vectors [-1, 1]
export function normalToPackedColor(vx: number, vy: number, vz: number): Color32 {
  const r = ((vx + 1) * 127.5) | 0
  const g = ((vy + 1) * 127.5) | 0
  const b = ((vz + 1) * 127.5) | 0
  const a = 255

  return (
    (r & 0xFF) |
    ((g & 0xFF) << 8) |
    ((b & 0xFF) << 16) |
    ((a & 0xFF) << 24)
  ) as Color32
}

// x,y,z are vectors [-1, 1]

export function packNormal(vx: number, vy: number, vz: number): Normal32 {
  const r = ((vx + 1) * 127.5) | 0
  const g = ((vy + 1) * 127.5) | 0
  const b = ((vz + 1) * 127.5) | 0
  const a = 255

  return (
    (r & 0xFF) |
    ((g & 0xFF) << 8) |
    ((b & 0xFF) << 16) |
    ((a & 0xFF) << 24)
  ) as Normal32
}

export function packNormalObj({ x, y, z }: Normal): Normal32 {
  return packNormal(x, y, z)
}

export function unpackNormal(packed: Normal32): Normal {
  return unpackNormalTo(packed, { x: 0, y: 0, z: 0 })
}

const SCRATCH_NORM: Normal = { x: 0, y: 0, z: 0 }

/**
 * High-performance unpack that populates an existing object to avoid GC.
 */
export function unpackNormalTo(packed: Normal32, target = SCRATCH_NORM): Normal {
  // Extract bytes and remap from [0, 255] to [-1, 1]
  // We use >>> for logical right shift to handle the sign bit correctly
  target.x = ((packed & 0xFF) / 127.5) - 1.0
  target.y = (((packed >>> 8) & 0xFF) / 127.5) - 1.0
  target.z = (((packed >>> 16) & 0xFF) / 127.5) - 1.0

  return target
}