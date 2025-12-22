import Alea from 'alea'
import { generateChunkedArray, type GenerateChunkedArrayOptions } from './prng/binary-array-chunks.ts'
import { shuffleArray, shuffleArrayWithPositionOddEvenConstraint } from './prng/random-array.ts'
import { sampleMultiple } from './prng/random-weighted-array.ts'

export type Prng = ReturnType<typeof makePrng>

export const prng = makePrng()

export function makePrng(initialSeed = 0) {
  let prng = Alea()
  let seed = initialSeed

  const reset = () => {
    prng = Alea(seed)
  }

  const setSeed = (newSeed: number) => {
    seed = newSeed
    reset()
  }
  const randomInt = (max: number) => Math.floor(prng() * max + 1)

  const randomIntRange = (min: number, max: number) => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(prng() * (max - min + 1)) + min
  }

  const randomFloat = () => prng()
  const randomFloatRange = (min: number, max: number) => prng() * (max - min + 1) + min

  function randomArrayValue<T>(array: T[]): T {
    const randomIndex = Math.floor(prng() * array.length)
    return array[randomIndex] as T
  }

  function Prng() {
    return prng()
  }

  function weightedArrayItems<T>(
    count: number,
    weightedItems: Parameters<typeof createWeightedAliasTable<T>>[1],
  ): T[] {
    return sampleMultiple<T>(prng, weightedItems, count)
  }

  function withSeed(newSeed: number, cb: () => void) {
    const state = prng.exportState()
    cb()
    prng.importState(state)
  }

  const extras = {
    setSeed,
    reset,
    randomInt,
    randomIntRange,
    randomFloat,
    randomFloatRange,
    randomArrayValue,
    shuffleArray<T>(array: T[], newArray = false): T[] {
      return shuffleArray(prng, array, newArray)
    },
    withSeed,
    shuffleArrayWithPositionOddEvenConstraint<T>(arr: T[]): T[] {
      return shuffleArrayWithPositionOddEvenConstraint<T>(this, arr)
    },
    generateChunkedBinaryArray(options: Omit<GenerateChunkedArrayOptions, 'prng'>): number[] {
      return generateChunkedArray({
        prng,
        ...options,
      })
    },
    weightedArrayItems,
  }
  Object.assign(Prng, extras)

  return Prng as typeof Prng & typeof extras
}