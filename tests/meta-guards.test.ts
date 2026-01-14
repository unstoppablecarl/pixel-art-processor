import { describe, expect, it } from 'vitest'
import { BitMask } from '../src/lib/node-data-types/BitMask.ts'
import { HeightMap } from '../src/lib/node-data-types/HeightMap.ts'
import { NormalMap } from '../src/lib/node-data-types/NormalMap.ts'
import { NodeDef, NodeType } from '../src/lib/pipeline/_types.ts'
import {
  type AnyNodeMeta,
  getMetaInput,
  isNormalMeta,
  isPassthroughMeta,
  isStartMeta,
  type NormalStepMeta,
  type PassthroughStepMeta,
  type StartStepMeta,
} from '../src/lib/pipeline/types/definitions.ts'

// --- Mock meta objects -------------------------------------------------------

const normalMeta: NormalStepMeta<[typeof BitMask, typeof NormalMap], typeof HeightMap> = {
  def: 'normal' as NodeDef,
  displayName: 'Normal',
  type: NodeType.STEP,
  inputDataTypes: [BitMask, NormalMap],
  outputDataType: HeightMap,
}

const passthroughMeta: PassthroughStepMeta = {
  def: 'pass' as NodeDef,
  displayName: 'Pass',
  type: NodeType.STEP,
  passthrough: true,
}

const startMeta: StartStepMeta<typeof NormalMap> = {
  def: 'start' as NodeDef,
  displayName: 'Start',
  type: NodeType.STEP,
  noInput: true,
  outputDataType: NormalMap,
}

// -----------------------------------------------------------------------------

describe('isPassthroughMeta', () => {
  it('returns true for passthrough meta', () => {
    expect(isPassthroughMeta(passthroughMeta)).toBe(true)
  })

  it('returns false for normal meta', () => {
    expect(isPassthroughMeta(normalMeta)).toBe(false)
  })

  it('narrows type correctly', () => {
    const meta: AnyNodeMeta = passthroughMeta
    if (isPassthroughMeta(meta)) {
      // TypeScript should now treat meta as PassthroughStepMeta
      expect(meta.passthrough).toBe(true)
    }
  })
})

describe('isStartMeta', () => {
  it('returns true for start meta', () => {
    expect(isStartMeta(startMeta)).toBe(true)
  })

  it('returns false for normal meta', () => {
    expect(isStartMeta(normalMeta)).toBe(false)
  })

  it('narrows type correctly', () => {
    const meta: AnyNodeMeta = startMeta
    if (isStartMeta(meta)) {
      expect(meta.noInput).toBe(true)
      expect(meta.outputDataType).toBe('out')
    }
  })
})

describe('isNormalMeta', () => {
  it('returns true for normal meta', () => {
    expect(isNormalMeta(normalMeta)).toBe(true)
  })

  it('returns false for passthrough meta', () => {
    expect(isNormalMeta(passthroughMeta)).toBe(false)
  })

  it('returns false for start meta', () => {
    expect(isNormalMeta(startMeta)).toBe(false)
  })

  it('narrows type correctly', () => {
    const meta: AnyNodeMeta = normalMeta
    if (isNormalMeta(meta)) {
      expect(meta.inputDataTypes).toEqual(['a', 'b'])
      expect(meta.outputDataType).toBe('out')
    }
  })
})

describe('getMetaInput', () => {
  it('returns inputDataTypes for normal meta', () => {
    const result = getMetaInput(normalMeta)
    expect(result).toEqual(['a', 'b'])
  })

  it('returns [] for passthrough meta', () => {
    const result = getMetaInput(passthroughMeta)
    expect(result).toEqual([])
  })

  it('returns [] for start meta', () => {
    const result = getMetaInput(startMeta)
    expect(result).toEqual([])
  })

  it('respects MetaInput<M> type inference', () => {
    const meta: AnyNodeMeta = normalMeta
    const input = getMetaInput(meta)
    expect(Array.isArray(input)).toBe(true)
  })
})
