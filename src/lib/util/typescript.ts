/**
 * Stabilizes an object literal's inferred type without changing its runtime value.
 *
 * TypeScript normally widens object literals (e.g. `0` → `number`,
 * `{ foo: 'bar' }` → `{ foo: string }`), which can break downstream
 * inference—especially when intersecting types or passing the object
 * into generic functions.
 *
 * `defineConfig` acts as a typed identity function:
 *   - preserves literal types
 *   - prevents unwanted widening
 *   - keeps tuple and nested inference intact
 *   - produces a stable, exact type for the object
 *
 * This is the same pattern used by helpers like `defineComponent`,
 * `defineStore`, and `defineConfig` in other ecosystems.
 *
 * @template T - The exact object type being stabilized.
 * @param t - The object literal whose type should be preserved.
 * @returns The input object `t`, unchanged at runtime but with a locked‑in type.
 */
export const defineObject = <T extends object>(t: T): T => t
