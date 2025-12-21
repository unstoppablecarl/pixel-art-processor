/**
 * Creates a weighted random sampler with removal (sampling without replacement).
 * Uses swap-and-pop strategy for efficient item removal.
 * Each sampled item is permanently removed from the pool.
 *
 * Performance: O(n) per sample where n is remaining items.
 * More efficient than alias table with rejection sampling for removal scenarios.
 *
 * @param prng
 * @param weightedItems - Array of objects with { item: T, weight: number }
 * @returns A function that samples and removes items, returning null when empty
 *
 * @example
 * const sampler = createRemovingSampler([
 *   { item: 'common', weight: 80 },
 *   { item: 'rare', weight: 15 },
 *   { item: 'epic', weight: 5 }
 * ]);
 *
 * const first = sampler();  // Returns an item, removes it
 * const second = sampler(); // Returns a different item
 * const third = sampler();  // Returns the last item
 * const fourth = sampler(); // Returns null (pool exhausted)
 */
export function createRemovingSampler<T>(
  prng: () => number,
  weightedItems: Array<{ item: T; weight: number }>
): () => T | null {
  if (weightedItems.length === 0) {
    throw new Error('Items array must not be empty');
  }

  // Validate weights and copy items (so we can mutate)
  for (let i = 0; i < weightedItems.length; i++) {
    if (weightedItems[i].weight < 0) {
      throw new Error(`Weights must be non-negative. Found negative weight at index ${i}`);
    }
  }

  // Create mutable copy of items
  let items = [...weightedItems];

  return function sample(): T | null {
    // Check if pool is exhausted
    if (items.length === 0) {
      return null;
    }

    // Calculate total weight of remaining items
    let totalWeight = 0;
    for (let i = 0; i < items.length; i++) {
      totalWeight += items[i].weight;
    }

    if (totalWeight <= 0) {
      // All remaining items have zero weight, just pop one
      return items.pop()!.item;
    }

    // Generate random value in range [0, totalWeight)
    const random = prng() * totalWeight;

    // Find the selected item using linear search with cumulative weights
    let cumulative = 0;
    for (let i = 0; i < items.length; i++) {
      cumulative += items[i].weight;
      if (cumulative > random) {
        // Found the selected item
        const selected = items[i].item;

        // Swap with last element and remove (O(1) removal)
        items[i] = items[items.length - 1];
        items.pop();

        return selected;
      }
    }

    // Floating point edge case - return and remove last item
    return items.pop()!.item;
  };
}

/**
 * Samples multiple items at once without replacement.
 * More efficient than calling a sampler multiple times.
 *
 * @param prng
 * @param weightedItems - Array of objects with { item: T, weight: number }
 * @param count - Number of items to sample
 * @returns Array of sampled items (may be shorter than count if pool exhausted)
 *
 * @example
 * const results = sampleMultiple([
 *   { item: 'common', weight: 70 },
 *   { item: 'rare', weight: 25 },
 *   { item: 'epic', weight: 5 }
 * ], 2);
 * // Returns 2 different items, e.g., ['common', 'rare']
 */
export function sampleMultiple<T>(
  prng: () => number,
  weightedItems: Array<{ item: T; weight: number }>,
  count: number
): T[] {
  if (weightedItems.length === 0) {
    throw new Error('Items array must not be empty');
  }

  if (count < 0) {
    throw new Error('Count must be non-negative');
  }

  if (count === 0) {
    return [];
  }

  // Validate weights
  for (let i = 0; i < weightedItems.length; i++) {
    if (weightedItems[i].weight < 0) {
      throw new Error(`Weights must be non-negative. Found negative weight at index ${i}`);
    }
  }

  // Create mutable copy and limit count to available items
  let items = [...weightedItems];
  const actualCount = Math.min(count, items.length);
  const results: T[] = [];

  // Calculate initial total weight
  let totalWeight = items.reduce((sum, x) => sum + x.weight, 0);

  // Sample actualCount times
  for (let n = 0; n < actualCount; n++) {
    if (totalWeight <= 0) {
      // All remaining have zero weight, just take one
      const last = items.pop()!;
      results.push(last.item);
      continue;
    }

    const random = prng() * totalWeight;
    let cumulative = 0;

    for (let i = 0; i < items.length; i++) {
      cumulative += items[i].weight;
      if (cumulative > random) {
        const selected = items[i];
        results.push(selected.item);

        // Update total weight
        totalWeight -= selected.weight;

        // Swap and pop
        items[i] = items[items.length - 1];
        items.pop();
        break;
      }
    }
  }

  return results;
}

/**
 * Optimized version for small pools (≤20 items).
 * Caches total weight for better performance with frequent sampling.
 */
export function createRemovingSamplerOptimized<T>(
  prng: () => number,
  weightedItems: Array<{ item: T; weight: number }>
): () => T | null {
  if (weightedItems.length === 0) {
    throw new Error('Items array must not be empty');
  }

  // Validate and copy
  for (let i = 0; i < weightedItems.length; i++) {
    if (weightedItems[i].weight < 0) {
      throw new Error(`Weights must be non-negative. Found negative weight at index ${i}`);
    }
  }

  let items = [...weightedItems];
  let totalWeight = items.reduce((sum, x) => sum + x.weight, 0);

  return function sample(): T | null {
    if (items.length === 0) {
      return null;
    }

    if (totalWeight <= 0) {
      totalWeight = 0;
      return items.pop()!.item;
    }

    const random = prng() * totalWeight;
    let cumulative = 0;

    for (let i = 0; i < items.length; i++) {
      cumulative += items[i].weight;
      if (cumulative > random) {
        const selected = items[i].item;

        // Update cached total weight
        totalWeight -= items[i].weight;

        // Swap and pop
        items[i] = items[items.length - 1];
        items.pop();

        return selected;
      }
    }

    // Edge case
    const last = items.pop()!;
    totalWeight -= last.weight;
    return last.item;
  };
}