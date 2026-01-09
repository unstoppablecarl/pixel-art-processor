import { Component } from 'vue'
import { type NodeDef, NodeType, type StepDataType } from '../src/lib/pipeline/_types.ts'
import { useStepRegistry } from '../src/lib/pipeline/StepRegistry.ts'

export function defineTestStep(
  {
    def,
    displayName = 'Testing',
    type = NodeType.STEP,
    inputDataTypes,
    outputDataType,
    branchDefs = [],
    passthrough = false
  }: {
    def: string,
    displayName?: string,
    type?: NodeType,
    passthrough?: boolean,
    inputDataTypes: readonly StepDataType[],
    outputDataType: StepDataType,
    branchDefs?: string[]
  },
) {
  return useStepRegistry().defineStep({
    displayName,
    def: def as NodeDef,
    type,
    inputDataTypes,
    outputDataType,
    branchDefs: branchDefs as NodeDef[],
    component: {} as unknown as Component,
  })
}