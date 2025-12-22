export function shuffleArray<T>(prng: () => number, array: T[], newArray = false): T[] {
  const arrToShuffle = newArray ? [...array] : array

  for (let i = arrToShuffle.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [arrToShuffle[i], arrToShuffle[j]] = [arrToShuffle[j], arrToShuffle[i]]
  }

  return arrToShuffle
}

export function shuffleArrayWithPositionOddEvenConstraint<T>(prng: () => number, arr: T[], newArray = false): T[] {
  const evenIdxItems: T[] = []
  const oddIdxItems: T[] = []
  for (let i = 0; i < arr.length; i++) {
    if (i % 2 === 0) {
      evenIdxItems.push(arr[i])
    } else {
      oddIdxItems.push(arr[i])
    }
  }

  shuffleArray(prng, evenIdxItems)
  shuffleArray(prng, oddIdxItems)

  const n = arr.length
  let result: T[] = arr
  if (newArray) {
    result = new Array(n)
  }
  let evenPtr = 0
  let oddPtr = 0
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) {
      result[i] = evenIdxItems[evenPtr++]
    } else {
      result[i] = oddIdxItems[oddPtr++]
    }
  }
  return result
}