import type { CheckboxColorListItem } from '../../components/UIForms/CheckboxColorList.vue'
import { makeCheckboxColorConfig } from './CheckboxColorConfig.ts'

const {
  create,
  configToCheckboxColorListItems,
} = makeCheckboxColorConfig()

export const DEFAULT_SHOW_GRID = create({
  label: 'Grid',
  CONFIG: {
    showGrid: true,
    showGridColor: 'rgba(0, 0, 0, 0.2)',
  },
})

export function canvasDrawCheckboxColors<T extends Record<string, unknown>>(
  config: T,
): CheckboxColorListItem[] {
  return configToCheckboxColorListItems(config)
}
