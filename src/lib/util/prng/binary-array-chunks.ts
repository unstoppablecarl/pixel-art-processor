import { shuffleArrayWithPositionOddEvenConstraint } from './random-array.ts'

export type GenerateChunkedArrayOptions = {
  prng: () => number,
  length: number,
  chunks: number,
  minGapSize: number,
  maxGapSize: number,
  minChunkSize: number,
  maxChunkSize: number,
  padding: number,
  shuffleSeed: number,
  invert: boolean,
  makePrng: (seed: number) => () => number
}

export type BinaryArray = Uint8Array<ArrayBuffer> & { readonly __brand: 'BinaryArray' };

export function generateChunkedArray(
  {
    prng,
    length,
    chunks,
    minGapSize,
    maxGapSize,
    minChunkSize,
    maxChunkSize,
    padding,
    shuffleSeed,
    makePrng,
    invert,
  }: GenerateChunkedArrayOptions,
): BinaryArray {

  const START_VALUE = invert ? 0 : 1
  const PADDING_VALUE = invert ? 1 : 0
  // Initialize array with all zeros
  const result = new Uint8Array(length).fill(PADDING_VALUE)

  // Calculate available space for chunks (excluding padding)
  const availableLength = length - 2 * padding

  if (availableLength <= 0 || chunks === 0) {
    return result as BinaryArray
  }

  // Validate that the constraints can produce the required length
  let minPossibleTotal = 0
  let maxPossibleTotal = 0

  for (let i = 0; i < chunks; i++) {
    const isChunk = i % 2 === 0 // Chunks alternate with gaps
    minPossibleTotal += isChunk ? minChunkSize : minGapSize
    maxPossibleTotal += isChunk ? maxChunkSize : maxGapSize
  }

  if (availableLength < minPossibleTotal || availableLength > maxPossibleTotal) {
    const msg1 = `Cannot achieve length ${availableLength} with ${chunks} chunks`
    const msg2 = `Possible range: ${minPossibleTotal} to ${maxPossibleTotal}`
    console.error(msg1)
    console.error(msg2)
    throw new Error(msg1 + ' ' + msg2)
    // return result as BinaryArray
  }

  // Generate random chunk sizes with alternating constraints
  let chunkSizes: number[] = []
  let currentValue = START_VALUE

  for (let i = 0; i < chunks; i++) {
    const isChunk = i % 2 === 0
    const minSize = isChunk ? minChunkSize : minGapSize
    const maxSize = isChunk ? maxChunkSize : maxGapSize

    const size = Math.floor(prng() * (maxSize - minSize + 1)) + minSize
    chunkSizes.push(size)

    currentValue = 1 - currentValue // Toggle for next chunk
  }

  // Calculate the difference between desired total and available space
  const currentTotal = chunkSizes.reduce((sum, size) => sum + size, 0)
  let difference = availableLength - currentTotal

  // Preserve randomness by adjusting chunks that have room to change
  // Build a list of adjustable chunks with their capacity
  while (difference !== 0) {
    const adjustable: { idx: number; capacity: number }[] = []

    for (let i = 0; i < chunks; i++) {
      const isChunk = i % 2 === 0
      const minSize = isChunk ? minChunkSize : minGapSize
      const maxSize = isChunk ? maxChunkSize : maxGapSize

      if (difference > 0) {
        // Need to grow - find chunks that can grow
        const capacity = maxSize - chunkSizes[i]
        if (capacity > 0) {
          adjustable.push({ idx: i, capacity })
        }
      } else {
        // Need to shrink - find chunks that can shrink
        const capacity = chunkSizes[i] - minSize
        if (capacity > 0) {
          adjustable.push({ idx: i, capacity })
        }
      }
    }

    // If no adjustable chunks, force the difference onto last chunk and break
    if (adjustable.length === 0) {
      chunkSizes[chunks - 1] += difference
      break
    }

    // Pick a random adjustable chunk and apply as much change as possible
    const chosen = adjustable[Math.floor(prng() * adjustable.length)]
    const amount = Math.min(Math.abs(difference), chosen.capacity)

    if (difference > 0) {
      chunkSizes[chosen.idx] += amount
      difference -= amount
    } else {
      chunkSizes[chosen.idx] -= amount
      difference += amount
    }
  }

  // Validate final total and adjust if needed
  const finalTotal = chunkSizes.reduce((sum, size) => sum + size, 0)

  if (finalTotal !== availableLength) {
    // console.error(`Final total ${finalTotal} does not match availableLength ${availableLength}`)
    // Force correction on last chunk to guarantee exact length
    const correction = availableLength - finalTotal
    chunkSizes[chunks - 1] += correction
    // console.warn(`Applied correction of ${correction} to last chunk`)
  }

  if (shuffleSeed) {
    chunkSizes = shuffleArrayWithPositionOddEvenConstraint(makePrng(shuffleSeed), chunkSizes, true)
  }

  // Place chunks in the array, alternating between 1 and 0
  let currentPos = padding
  currentValue = START_VALUE

  for (const size of chunkSizes) {
    for (let i = 0; i < size; i++) {
      if (currentPos >= length - padding) {
        console.error(`Overflow: trying to write beyond available space`)
        break
      }
      result[currentPos++] = currentValue
    }
    currentValue = 1 - currentValue // Toggle between 0 and 1
  }

  // Validate final result
  const actualLength = result.length

  if (actualLength !== length) {
    console.error(`Result length ${actualLength} does not match expected ${length}`)
  }

  return result as BinaryArray
}

export interface PropertyRange {
  min: number;
  max: number;
}

export interface ValidRanges {
  chunks: PropertyRange,
  padding: PropertyRange,
  minChunkSize: PropertyRange,
  maxChunkSize: PropertyRange,
  minGapSize: PropertyRange,
  maxGapSize: PropertyRange,
}

export function calculateChunkedArrayValidRanges(
  length: number,
  chunks: number,
  minGapSize: number,
  maxGapSize: number,
  minChunkSize: number,
  maxChunkSize: number,
  padding: number,
): ValidRanges {
  const numChunkSegments = Math.ceil(chunks / 2)
  const numGapSegments = Math.floor(chunks / 2)
  const availableLength = length - 2 * padding

  const minChunkSegmentSize = Math.min(minChunkSize, minGapSize)
  const maxChunks = minChunkSegmentSize > 0 ? Math.floor(availableLength / minChunkSegmentSize) : 1

  // Calculate required space constraints
  const minRequiredSpace =
    numChunkSegments * minChunkSize +
    numGapSegments * minGapSize

  // Ensure maxReq >= avail by enforcing minimum max values
  const minMaxChunk = numChunkSegments > 0
    ? Math.ceil((availableLength - numGapSegments * maxGapSize) / numChunkSegments)
    : maxChunkSize
  const minMaxGap = numGapSegments > 0
    ? Math.ceil((availableLength - numChunkSegments * maxChunkSize) / numGapSegments)
    : maxGapSize

  // Calculate valid padding range
  const maxPadding = Math.floor((length - minRequiredSpace) / 2)

  // Calculate valid minChunkSize range
  const maxMinChunkSize = Math.min(
    maxChunkSize,
    Math.floor((availableLength - numGapSegments * minGapSize) / numChunkSegments),
  )

  // Calculate valid maxChunkSize range
  const maxMaxChunkSize = Math.floor(
    (availableLength - numGapSegments * minGapSize) / numChunkSegments,
  )

  // Calculate valid minGapSize range
  const maxMinGapSize = numGapSegments > 0
    ? Math.min(
      maxGapSize,
      Math.floor((availableLength - numChunkSegments * minChunkSize) / numGapSegments),
    )
    : 0

  // Calculate valid maxGapSize range
  const maxMaxGapSize = numGapSegments > 0
    ? Math.floor((availableLength - numChunkSegments * minChunkSize) / numGapSegments)
    : maxGapSize

  return {
    chunks: { min: 1, max: Math.max(1, maxChunks) },

    padding: {
      min: 0,
      max: Math.max(0, maxPadding),
    },
    minChunkSize: {
      min: 1,
      max: Math.max(1, maxMinChunkSize),
    },
    maxChunkSize: {
      min: Math.max(minChunkSize, minMaxChunk),
      max: Math.max(minChunkSize, minMaxChunk, maxMaxChunkSize, 1),
    },
    minGapSize: {
      min: numGapSegments > 0 ? 1 : 0,
      max: Math.max(minGapSize, maxMinGapSize, numGapSegments > 0 ? 1 : 0),
    },
    maxGapSize: {
      min: Math.max(minGapSize, minMaxGap),
      max: Math.max(maxGapSize, minMaxGap, maxMaxGapSize, minGapSize),
    },
  }
}

export function binaryChunkedArrayToChunkLengths(arr: number[]): number[] {
  if (arr.length === 0) {
    return []
  }

  const lengths: number[] = []
  let currentLength = 1
  let currentValue = arr[0]

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === currentValue) {
      currentLength++
    } else {
      lengths.push(currentLength)
      currentLength = 1
      currentValue = arr[i]
    }
  }

  // Push the last chunk
  lengths.push(currentLength)

  return lengths
}

export function chunkLengthsToBinaryArray(lengths: number[], startWith: number = 0): number[] {
  if (lengths.length === 0) {
    return []
  }

  if (startWith !== 0 && startWith !== 1) {
    throw new Error('startWith must be 0 or 1')
  }

  const result: number[] = []
  let currentValue = startWith

  for (const length of lengths) {
    for (let i = 0; i < length; i++) {
      result.push(currentValue)
    }
    currentValue = 1 - currentValue // Toggle between 0 and 1
  }

  return result
}