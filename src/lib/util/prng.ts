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

  const extras = {
    setSeed,
    reset,
    randomInt,
    randomIntRange,
    randomFloat,
    randomFloatRange,
    randomArrayValue,
  }
  Object.assign(Prng, extras)

  return Prng as typeof Prng & typeof extras
}
