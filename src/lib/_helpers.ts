export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const EASE = {
  linear: (t: number): number => t,
  quadIn: (t: number): number => t * t,
  quadOut: (t: number): number => t * (2 - t),
  quadInOut: (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  cubicIn: (t: number): number => t * t * t,
  cubicOut: (t: number): number => --t * t * t + 1,
  expoIn: (t: number): number => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  expoOut: (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
