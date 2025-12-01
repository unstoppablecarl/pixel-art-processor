declare module 'poisson-disk-sampling' {
  export default class PoissonDiskSampling {
    constructor(options: object, rng: () => number);

    addRandomPoint(): this

    addPoint(v: [number, number]): this

    next(): this

    fill(): this

    getAllPoints(): [number, number][]
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Global compile-time constants
declare const __DEV__: boolean;