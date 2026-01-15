import { type Ref, toRef } from 'vue'
import type { CheckboxColorListItem } from '../../components/UIForms/CheckboxColorList.vue'

export type ColorFeatureMeta = {
  label: string
  flagKey: string
  colorKey: string
  defaultColor: string
}

export type FeatureDefinition = {
  label: string,
  CONFIG: Record<string, unknown>
}

export function makeCheckboxColorConfig() {
  const FEATURES: FeatureDefinition[] = []

  function create<T extends FeatureDefinition>(obj: T): T {
    FEATURES.push(obj)
    return obj
  }

  function inferColorMetaFromFeature(feature: FeatureDefinition): ColorFeatureMeta {
    const cfg = feature.CONFIG
    const [flagKey, colorKey] = Object.keys(cfg)

    const defaultColor = String(cfg[colorKey as string])

    return {
      label: feature.label,
      flagKey: flagKey as string,
      colorKey: colorKey as string,
      defaultColor,
    }
  }

  function configToCheckboxColorListItems<T extends Record<string, unknown>>(
    config: T,
  ): CheckboxColorListItem[] {

    return FEATURES.map(inferColorMetaFromFeature)
      .filter((meta) => meta.flagKey in config && meta.colorKey in config)
      .map((meta) => ({
        label: meta.label,
        active: toRef(config as Record<string, any>, meta.flagKey) as Ref<boolean>,
        color: toRef(config as Record<string, any>, meta.colorKey),
        defaultColor: meta.defaultColor,
      }))
  }

  return {
    create,
    configToCheckboxColorListItems,
    getDefaultConfig() {
      return Object.assign({}, ...FEATURES.map((f) => f.CONFIG))
    },
  }
}