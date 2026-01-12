import { Component } from 'vue'
import type { Optional } from '../src/lib/_helpers.ts'
import { type AnyStepDefinition, type NodeDef, NodeType, type StepMeta } from '../src/lib/pipeline/_types.ts'
import { useStepRegistry } from '../src/lib/pipeline/StepRegistry.ts'

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

  return useStepRegistry().defineNode({
    displayName,
    def: def as NodeDef,
    type,
    passthrough,
    inputDataTypes,
    outputDataType,
    component: {} as unknown as Component,
  } as AnyStepDefinition)
}