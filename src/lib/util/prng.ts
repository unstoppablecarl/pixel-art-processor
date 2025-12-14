import Alea from 'alea'

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

  function weightedArrayTable<T>(
    weightedItems: Parameters<typeof createWeightedAliasTable<T>>[1]
  ): () => T {
    return createWeightedAliasTable<T>(prng, weightedItems)
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
    weightedArrayTable,
  }
  Object.assign(Prng, extras)

  return Prng as typeof Prng & typeof extras
}
/**
 * Creates an alias table for O(1) weighted random sampling.
 * Best for high-frequency sampling scenarios (thousands+ of samples).
 * Uses the Vose's Alias Method for constant-time selection.
 *
 * @param prng
 * @param weightedItems - Array of objects with { item: T, weight: number }
 * @returns A function that samples in O(1) time
 *
 * @example
 * const sampler = createAliasTable([
 *   { item: 'common', weight: 80 },
 *   { item: 'rare', weight: 15 },
 *   { item: 'epic', weight: 5 }
 * ]);
 *
 * // Extremely fast repeated sampling
 * for (let i = 0; i < 100000; i++) {
 *   const result = sampler();
 * }
 */
export function createWeightedAliasTable<T>(
  prng: () => number,
  weightedItems: Array<{ item: T; weight: number }>
): () => T {
  if (weightedItems.length === 0) {
    throw new Error('Items array must not be empty');
  }

  const n = weightedItems.length;
  const prob = new Array(n);
  const alias = new Array(n);
  const items = new Array(n);

  // Extract items and validate/sum weights
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const { item, weight } = weightedItems[i];

    if (weight < 0) {
      throw new Error(`Weights must be non-negative. Found negative weight at index ${i}`);
    }

    items[i] = item;
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    throw new Error('Total weight must be greater than 0');
  }

  // Scale weights to average of 1.0 (sum to n)
  const scaled = new Array(n);
  for (let i = 0; i < n; i++) {
    scaled[i] = (weightedItems[i].weight / totalWeight) * n;
  }

  // Partition indices into small (< 1.0) and large (>= 1.0)
  const small: number[] = [];
  const large: number[] = [];

  for (let i = 0; i < n; i++) {
    if (scaled[i] < 1.0) {
      small.push(i);
    } else {
      large.push(i);
    }
  }

  // Build alias table using Vose's algorithm
  while (small.length > 0 && large.length > 0) {
    const less = small.pop()!;
    const more = large.pop()!;

    // Assign probability and alias for the 'less' bucket
    prob[less] = scaled[less];
    alias[less] = more;

    // Remove the allocated probability from 'more'
    scaled[more] = (scaled[more] + scaled[less]) - 1.0;

    // Re-classify 'more' based on its new scaled weight
    if (scaled[more] < 1.0) {
      small.push(more);
    } else {
      large.push(more);
    }
  }

  // Handle remaining items (due to floating point precision)
  // These should have probability ~1.0
  while (large.length > 0) {
    prob[large.pop()!] = 1.0;
  }
  while (small.length > 0) {
    prob[small.pop()!] = 1.0;
  }

  // Return O(1) sampling function
  return function sample(): T {
    // Pick a random bucket
    const i = Math.floor(prng() * n);

    // Flip a coin weighted by prob[i]
    return prng() < prob[i] ? items[i] : items[alias[i]];
  };
}
