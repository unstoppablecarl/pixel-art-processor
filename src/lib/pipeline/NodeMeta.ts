import type { Component } from 'vue'
import type { DataStructureConstructor } from '../node-data-types/BaseDataStructure'
import { type NodeDef, NodeType } from './_types'
import type {
  AnyBranchMeta,
  AnyForkMeta,
  AnyNodeDefinition,
  AnyNodeMeta,
  NormalBranchMeta,
  NormalForkMeta,
  NormalStepMeta,
  PassthroughBranchMeta,
  PassthroughForkMeta,
  PassthroughStepMeta,
  StartStepMeta,
} from './types/definitions'

/* ------------------------------------------------------------
   Public API
------------------------------------------------------------ */

export async function loadNodeComponentsMetaData(
  globResults: Record<string, any>,
  stepDataTypes: DataStructureConstructor[],
): Promise<AnyNodeDefinition[]> {

  const errors = collectErrors(globResults, stepDataTypes)
  if (errors.length) {
    errors.forEach(console.error)
    throw new Error('Node Component Errors:\n' + errors.join('\n'))
  }

  return Object.entries(globResults).map(([_, module]) =>
    buildDefinition((module as any).STEP_META as AnyNodeMeta, module.default as Component),
  )
}

/* ------------------------------------------------------------
   Error collection
------------------------------------------------------------ */

function collectErrors(
  globResults: Record<string, any>,
  stepDataTypes: DataStructureConstructor[],
): string[] {
  return Object.entries(globResults)
    .map(([path, module]) => validateModule(path, module, stepDataTypes))
    .filter(Boolean)
    .map((e) => {
      const err = e as ComponentError
      return `${err.path}\n${err.errors.join('\n')}`
    })
}

/* ------------------------------------------------------------
   Definition builder (DRY)
------------------------------------------------------------ */

function buildDefinition(meta: AnyNodeMeta, component: Component): AnyNodeDefinition {
  switch (meta.type) {
    case NodeType.STEP:
      return buildStepDefinition(meta, component)
    case NodeType.FORK:
      return buildForkDefinition(meta, component)
    case NodeType.BRANCH:
      return buildBranchDefinition(meta, component)
    default:
      throw new Error(`Unknown node type: ${(meta as any).type}`)
  }
}

/* ------------------------------------------------------------
   Node definition builder
------------------------------------------------------------ */

function buildStepDefinition(meta: AnyNodeMeta, component: Component): AnyNodeDefinition {
  if ('noInput' in meta && meta.noInput === true) {
    const m = meta as StartStepMeta<any>
    return {
      def: m.def,
      type: m.type,
      displayName: m.displayName,
      component,
      noInput: true,
      outputDataType: m.outputDataType,
      isValidDescendantDef: m.isValidDescendantDef,
      render: m.render,
    }
  }

  if ('passthrough' in meta && meta.passthrough === true) {
    const m = meta as PassthroughStepMeta
    return {
      def: m.def,
      type: m.type,
      displayName: m.displayName,
      component,
      passthrough: true,
      isValidDescendantDef: m.isValidDescendantDef,
      render: m.render,
    }
  }

  const m = meta as NormalStepMeta<any, any>
  return {
    def: m.def,
    type: m.type,
    displayName: m.displayName,
    component,
    inputDataTypes: m.inputDataTypes,
    outputDataType: m.outputDataType,
    isValidDescendantDef: m.isValidDescendantDef,
    render: m.render,
  }
}

/* ------------------------------------------------------------
   Fork definition builder
------------------------------------------------------------ */

function buildForkDefinition(meta: AnyNodeMeta, component: Component): AnyNodeDefinition {
  if ('passthrough' in meta && meta.passthrough === true) {
    const m = meta as PassthroughForkMeta
    return {
      def: m.def,
      type: m.type,
      displayName: m.displayName,
      component,
      passthrough: true,
      branchDefs: m.branchDefs,
      isValidDescendantDef: m.isValidDescendantDef,
      render: m.render,
    }
  }

  const m = meta as NormalForkMeta<any, any>
  return {
    def: m.def,
    type: m.type,
    displayName: m.displayName,
    component,
    inputDataTypes: m.inputDataTypes,
    outputDataType: m.outputDataType,
    branchDefs: m.branchDefs,
    isValidDescendantDef: m.isValidDescendantDef,
    render: m.render,
  }
}

/* ------------------------------------------------------------
   Branch definition builder
------------------------------------------------------------ */

function buildBranchDefinition(meta: AnyNodeMeta, component: Component): AnyNodeDefinition {
  if ('passthrough' in meta && meta.passthrough === true) {
    const m = meta as PassthroughBranchMeta
    return {
      def: m.def,
      type: m.type,
      displayName: m.displayName,
      component,
      passthrough: true,
      isValidDescendantDef: m.isValidDescendantDef,
      render: m.render,
    }
  }

  const m = meta as NormalBranchMeta<any, any>
  return {
    def: m.def,
    type: m.type,
    displayName: m.displayName,
    component,
    inputDataTypes: m.inputDataTypes,
    outputDataType: m.outputDataType,
    isValidDescendantDef: m.isValidDescendantDef,
    render: m.render,
  }
}

function validateModule(
  path: string,
  module: any,
  stepDataTypes: DataStructureConstructor[],
): ComponentError | void {
  const meta = (module as any).STEP_META as AnyNodeMeta
  if (!meta) return { path, errors: ['STEP_META not exported'] }

  const errors: string[] = []

  validateCommon(meta, errors)
  validateByType(meta, errors, stepDataTypes)

  if (errors.length) return { path, errors }
}

function validateCommon(meta: AnyNodeMeta, errors: string[]) {
  if (!meta.def) errors.push('STEP_META.def not set')
  if (!meta.type) errors.push('STEP_META.type not set')
  if (!meta.displayName) errors.push('STEP_META.displayName not set')
}

function validateByType(
  meta: AnyNodeMeta,
  errors: string[],
  stepDataTypes: DataStructureConstructor[],
) {
  switch (meta.type) {
    case NodeType.STEP:
      return validateStep(meta, errors, stepDataTypes)
    case NodeType.FORK:
      return validateFork(meta, errors, stepDataTypes)
    case NodeType.BRANCH:
      return validateBranch(meta, errors, stepDataTypes)
  }
}

function validateStep(
  meta: AnyNodeMeta,
  errors: string[],
  stepDataTypes: DataStructureConstructor[],
) {
  if ('noInput' in meta && meta.noInput === true) {
    if (!meta.outputDataType)
      errors.push('Start nodes must define outputDataType')
    validateOutput(meta.def, meta.outputDataType, stepDataTypes)
    return
  }

  if ('passthrough' in meta && meta.passthrough === true) {
    if (meta.inputDataTypes !== undefined)
      errors.push('Passthrough steps must not define inputDataTypes')
    if (meta.outputDataType !== undefined)
      errors.push('Passthrough steps must not define outputDataType')
    return
  }

  const m = meta as NormalStepMeta<any, any>
  if (!m.inputDataTypes)
    errors.push('Normal steps must define inputDataTypes')
  if (!m.outputDataType)
    errors.push('Normal steps must define outputDataType')

  validateInput(m.def, m.inputDataTypes!, stepDataTypes)
  validateOutput(m.def, m.outputDataType!, stepDataTypes)
}

function validateFork(
  meta: AnyForkMeta,
  errors: string[],
  stepDataTypes: DataStructureConstructor[],
) {

  if (!meta.branchDefs?.length)
    errors.push('Fork nodes must define branchDefs')

  if ('noInput' in meta && meta.noInput === true) {
    if (!meta.outputDataType)
      errors.push('Start nodes must define outputDataType')
    validateOutput(meta.def, meta.outputDataType, stepDataTypes)
    return
  }

  if ('passthrough' in meta && meta.passthrough === true) {
    if (meta.inputDataTypes !== undefined)
      errors.push('Passthrough forks must not define inputDataTypes')
    if (meta.outputDataType !== undefined)
      errors.push('Passthrough forks must not define outputDataType')
    return
  }

  const m = meta as NormalForkMeta<any, any>
  validateInput(m.def, m.inputDataTypes!, stepDataTypes)
  validateOutput(m.def, m.outputDataType!, stepDataTypes)
}

function validateBranch(
  meta: AnyBranchMeta,
  errors: string[],
  stepDataTypes: DataStructureConstructor[],
) {
  if ('noInput' in meta && meta.noInput === true) {
    if (!meta.outputDataType)
      errors.push('Start nodes must define outputDataType')
    validateOutput(meta.def, meta.outputDataType, stepDataTypes)
    return
  }

  if ('passthrough' in meta && meta.passthrough === true) {
    if (meta.inputDataTypes !== undefined)
      errors.push('Passthrough branches must not define inputDataTypes')
    if (meta.outputDataType !== undefined)
      errors.push('Passthrough branches must not define outputDataType')
    return
  }
  const m = meta as NormalBranchMeta<any, any>

  validateInput(m.def, m.inputDataTypes!, stepDataTypes)
  validateOutput(m.def, m.outputDataType!, stepDataTypes)
}

/* ------------------------------------------------------------
   IO validation helpers
------------------------------------------------------------ */

function validateInput(
  def: NodeDef,
  inputDataTypes: readonly any[],
  valid: DataStructureConstructor[],
) {
  const invalid = inputDataTypes.filter(t => !valid.includes(t))
  if (invalid.length) {
    const msg = `Step "${def}" has invalid Input Data Type(s)`
    console.error(msg, invalid)
    throw new Error(msg)
  }
}

function validateOutput(
  def: NodeDef,
  outputDataType: any,
  valid: DataStructureConstructor[],
) {
  if (!valid.includes(outputDataType)) {
    const msg = `Step "${def}" has invalid Output Data Type`
    console.error(msg, outputDataType)
    throw new Error(msg)
  }
}

type ComponentError = {
  path: string
  errors: string[]
}
