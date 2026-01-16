import type { NodeDataTypeColors } from '../../../nodes.ts'
import type { NodeDataTypeColor } from '../../pipeline/_types.ts'

export function injectCss(cssString: string) {
  const head = document.head || document.getElementsByTagName('head')[0]
  const style = document.createElement('style')
  style.appendChild(document.createTextNode(cssString))
  head.appendChild(style)
}

export function buildNodeDataTypeCss(items: NodeDataTypeColor[]) {
  return items.map(({ cssClass, key, pillCss }) => {
    return `.${cssClass} { background: var(${key}) !important; ${pillCss} }`
  }).join(' ')
}

export function injectNodeDataTypeCss(stepDataTypeColors: NodeDataTypeColors) {
  const items = [...stepDataTypeColors.values()]
  for (const { key, color } of items) {
    document.documentElement.style.setProperty(key, color)
  }
  injectCss(buildNodeDataTypeCss(items))
}