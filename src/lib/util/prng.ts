import Alea from 'alea'

export const prng = Alea(11)

export const prngState = prng.exportState()

export function randomInt(max: number) {
  return Math.floor(prng() * max + 1)
}

export function getRandomIntRange(min: number, max: number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(prng() * (max - min + 1)) + min
}

export function getRandomFloatRange(min: number, max: number) {
  return prng() * (max - min + 1) + min
}

export function randomArrayValue<T>(array: T[]): T {
  const randomIndex = Math.floor(prng() * array.length)
  return array[randomIndex] as T
}