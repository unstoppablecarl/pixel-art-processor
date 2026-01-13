import { BitMask } from './BitMask.ts'
import { HeightMap } from './HeightMap.ts'
import { NormalMap } from './NormalMap.ts'
import { PassThrough } from './PassThrough.ts'
import { PixelMap } from './PixelMap.ts'

// requires [BitMask, NormalMap] as const
export type NodeDataTypeTuple = readonly [NodeDataType, ...NodeDataType[]]

export type NodeDataType =
  | typeof BitMask
  | typeof NormalMap
  | typeof HeightMap
  | typeof PixelMap
  | typeof PassThrough

export type NodeDataTypeInstance =
  | BitMask
  | NormalMap
  | HeightMap
  | PixelMap
  | PassThrough

export type StepInputTypesToInstances<
  Input extends readonly NodeDataType[] = readonly NodeDataType[]
> =
  Input extends readonly []
    ? never
    : InstanceType<Input[number]>