import { Component } from 'vue'
import type { Optional } from '../src/lib/_helpers.ts'
import { type AnyNodeDefinition, type NodeDef, NodeType, type StepMeta } from '../src/lib/pipeline/_types.ts'
import { getNodeRegistry } from '../src/lib/pipeline/NodeRegistry.ts'

let defIncrement = 0

export function defineTestNode(
  {
    def,
    displayName = 'Testing',
    type = NodeType.STEP,
    inputDataTypes,
    outputDataType,
    passthrough,
  }: Optional<StepMeta, 'displayName' | 'def' | 'passthrough' | 'type'>,
) {

  def ??= 'testing_' + defIncrement++

  return getNodeRegistry().defineNode({
    displayName,
    def: def as NodeDef,
    type,
    passthrough,
    inputDataTypes,
    outputDataType,
    component: {} as unknown as Component,
  } as AnyNodeDefinition)
}