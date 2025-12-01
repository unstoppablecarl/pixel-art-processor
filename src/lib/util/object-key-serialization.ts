import type { Reactive, ShallowReactive } from 'vue'
import { deserializeImageData, type SerializedImageData, serializeImageData } from './ImageData.ts'
import type { Config, ConfigKeyAdapters } from '../pipeline/StepHandler.ts'

export type ConfigKeyAdapter<Serialized = any, Deserialized = any> = {
  serialize(value: Deserialized): Serialized,
  deserialize(value: Serialized): Deserialized,
}

export const configImageDataAdapter: ConfigKeyAdapter<SerializedImageData | null, ImageData | null> = {
  serialize: serializeImageData,
  deserialize: deserializeImageData,
}

export function deserializeObjectKeys<
  C extends Config = Config,
  SerializedConfig extends Config = C,
>(
  objectKeyAdapters: ConfigKeyAdapters<C, SerializedConfig>,
  serializedConfig: SerializedConfig,
) {
  if (!objectKeyAdapters) return {}

  const result = {} as any
  for (const key in objectKeyAdapters) {
    const adapter = objectKeyAdapters[key]!
    const value = serializedConfig[key]
    if (value !== undefined) {
      result[key] = adapter.deserialize(value)
    }
  }
  return result
}

export function serializeObjectKeys<
  C extends Config = Config,
  RC extends ShallowReactive<C> | Reactive<C> = ShallowReactive<C>,
  SerializedConfig extends Config = C,
>(
  objectKeyAdapters: ConfigKeyAdapters<C, SerializedConfig>,
  config: RC,
): Record<string, any> {
  if (!objectKeyAdapters) return {}

  const result: Record<string, any> = {}
  for (const key in objectKeyAdapters) {
    const value = config[key as keyof typeof config]
    if (value !== undefined) {
      result[key] = objectKeyAdapters[key]!.serialize(value)
    }
  }
  return result
}

export type DeserializedFromAdapters<Adapters extends Record<string, ConfigKeyAdapter<any, any>>> = {
  [K in keyof Adapters]: Adapters[K] extends ConfigKeyAdapter<any, infer D> ? D : never
}