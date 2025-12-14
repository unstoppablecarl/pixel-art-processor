import Alea from 'alea'
import { sampleMultiple } from './prng/random-array.ts'

export type Prng = ReturnType<typeof makePrng>

export const prng = makePrng()

export function makePrng() {
  let prng = Alea()
  let seed = 0

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

  /**
   * Generates a binary array (0s and 1s) structured into sequential chunks.
   *
   * @param length - The total length of the resulting array.
   * @param chunks - The total number of chunks.
   * @param minChunkSize - The minimum length for any single chunk.
   * @param maxChunkSize - The maximum length for any single chunk.
   * @param padding - The number of 0s to place at the start and end of the array.
   * @returns An array of 0s and 1s.
   */
  function generateChunkedBinaryArray(
    length: number,
    chunks: number,
    minChunkSize: number,
    maxChunkSize: number,
    padding: number,
  ): number[] {
    // Initialize array with all zeros
    const result = new Array(length).fill(0)

    // Calculate available space for chunks (excluding padding)
    const availableLength = length - 2 * padding

    if (availableLength <= 0 || chunks === 0) {
      return result
    }

    // Check if it's possible to fit chunks in available space
    const minPossibleTotal = chunks * minChunkSize
    const maxPossibleTotal = chunks * maxChunkSize

    if (availableLength < minPossibleTotal || availableLength > maxPossibleTotal) {
      // Cannot satisfy constraints - return best effort
      console.warn('Cannot satisfy chunk size constraints with given parameters')
      const avgSize = Math.floor(availableLength / chunks)
      let remaining = availableLength
      let currentPos = padding
      let currentValue = 1

      for (let i = 0; i < chunks; i++) {
        const size = i === chunks - 1 ? remaining : avgSize
        for (let j = 0; j < size; j++) {
          result[currentPos++] = currentValue
        }
        remaining -= size
        currentValue = 1 - currentValue
      }
      return result
    }

    // Generate random chunk sizes
    const chunkSizes: number[] = []

    for (let i = 0; i < chunks; i++) {
      const size = Math.floor(Math.random() * (maxChunkSize - minChunkSize + 1)) + minChunkSize
      chunkSizes.push(size)
    }

    // Calculate the difference between desired total and available space
    const currentTotal = chunkSizes.reduce((sum, size) => sum + size, 0)
    let difference = availableLength - currentTotal

    // Distribute the difference across all chunks randomly
    const maxIterations = Math.abs(difference) * chunks * 2 // Safety limit
    let iterations = 0

    while (difference !== 0 && iterations < maxIterations) {
      const idx = Math.floor(Math.random() * chunks)

      if (difference > 0) {
        // Need to add space - check if we can increase this chunk
        if (chunkSizes[idx] < maxChunkSize) {
          chunkSizes[idx]++
          difference--
        }
      } else {
        // Need to remove space - check if we can decrease this chunk
        if (chunkSizes[idx] > minChunkSize) {
          chunkSizes[idx]--
          difference++
        }
      }

      iterations++
    }

    // If we still have a difference, force it on the last chunk
    if (difference !== 0) {
      chunkSizes[chunks - 1] += difference
    }

    // Place chunks in the array, alternating between 1 and 0
    let currentPos = padding
    let currentValue = 1

    for (const size of chunkSizes) {
      for (let i = 0; i < size; i++) {
        result[currentPos++] = currentValue
      }
      currentValue = 1 - currentValue // Toggle between 0 and 1
    }

    return result
  }

  function weightedArrayItems<T>(
    count: number,
    weightedItems: Parameters<typeof createWeightedAliasTable<T>>[1]
  ): T[] {
    return sampleMultiple<T>(prng, weightedItems, count)
  }

  const extras = {
    setSeed,
    reset,
    randomInt,
    randomIntRange,
    randomFloat,
    randomFloatRange,
    randomArrayValue,
    generateChunkedBinaryArray,
    weightedArrayItems,
  }
  Object.assign(Prng, extras)

  return Prng as typeof Prng & typeof extras
}