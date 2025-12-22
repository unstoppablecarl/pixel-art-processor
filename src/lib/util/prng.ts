import { Mulberry32 } from './prng/mulberry32-prng.ts'
import { generateChunkedArray, type GenerateChunkedArrayOptions } from './prng/binary-array-chunks.ts'
import { shuffleArray, shuffleArrayWithPositionOddEvenConstraint } from './prng/random-array.ts'
import { sampleMultiple } from './prng/random-weighted-array.ts'

export type Prng = ReturnType<typeof makePrng>

export const prng = makePrng()

export function makePrng(initialSeed = 0) {

  const PRNG = new Mulberry32(initialSeed)

  function Prng() {
    return PRNG.next()
  }

  const reset = () => {
    PRNG.reset()
  }

  const setSeed = (newSeed: number) => {
    PRNG.seed = newSeed
  }

  const randomInt = (max: number) => Math.floor(PRNG.next() * max + 1)

  const randomIntRange = (min: number, max: number) => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(PRNG.next() * (max - min + 1)) + min
  }

  const randomFloat = () => PRNG.next()
  const randomFloatRange = (min: number, max: number) => PRNG.next() * (max - min + 1) + min

  function randomArrayValue<T>(array: T[]): T {
    const randomIndex = Math.floor(PRNG.next() * array.length)
    return array[randomIndex] as T
  }

  function weightedArrayItems<T>(
    count: number,
    weightedItems: Parameters<typeof sampleMultiple<T>>[1],
  ): T[] {
    return sampleMultiple<T>(() => PRNG.next(), weightedItems, count)
  }

  function withSeed(newSeed: number, cb: (prng: () => number) => void) {
    const newPrng = PRNG.clone()

    cb(() => newPrng.next())
  }

  const extras = {
    setSeed,
    reset,
    randomInt,
    randomIntRange,
    randomFloat,
    randomFloatRange,
    randomArrayValue,
    currentSeed() {
      return PRNG.id
    },
    shuffleArray<T>(array: T[], newArray = false): T[] {
      return shuffleArray(() => PRNG.next(), array, newArray)
    },
    withSeed,
    shuffleArrayWithPositionOddEvenConstraint<T>(arr: T[]): T[] {
      return shuffleArrayWithPositionOddEvenConstraint<T>(this as Prng, arr)
    },
    generateChunkedBinaryArray(options: Omit<GenerateChunkedArrayOptions, 'prng'>): number[] {
      return generateChunkedArray({
        prng: () => PRNG.next(),
        ...options,
      })
    },
    weightedArrayItems,
  }
  Object.assign(Prng, extras)

  return Prng as typeof Prng & typeof extras
}