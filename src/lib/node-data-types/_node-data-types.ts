import type { BaseDataStructure } from './BaseDataStructure.ts'
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

// extract the first generic arg T from a class extending BaseDataStructure
/* example:
const setter = <T extends NodeDataTypeInstance, >(
  target: T,
  value: ExtractBaseType<T>,
) => {
  target.set(1, 1, value)
}
 */
export type ExtractNodeDataBaseType<T extends NodeDataTypeInstance> = T extends BaseDataStructure<infer X, any, any> ? X : never;

/* NodeDataType and NodeDataTypeInstance validation */
type InstanceOf<T> = T extends new (...args: any[]) => infer R ? R : never;
type InstancesFromConstructors = InstanceOf<NodeDataType>;
type CheckExtendsBase<T> = T extends BaseDataStructure<any, any, any> ? T : never;

type CheckInstancesMatch =
  [NodeDataTypeInstance] extends [InstancesFromConstructors]
    ? [InstancesFromConstructors] extends [NodeDataTypeInstance]
      ? true
      : { error: 'Mismatch'; missing: Exclude<InstancesFromConstructors, NodeDataTypeInstance> }
    : { error: 'Mismatch'; extra: Exclude<NodeDataTypeInstance, InstancesFromConstructors> };

// export used to avoid unused type errors
export type _AssertMatch = CheckInstancesMatch extends true ? true : CheckInstancesMatch;
export type _AssertBase = CheckExtendsBase<NodeDataTypeInstance> extends never ? 'Some types don\'t extend Base' : true;
