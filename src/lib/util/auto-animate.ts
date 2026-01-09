import { type AutoAnimationPlugin, getTransitionSizes } from '@formkit/auto-animate'

export const CustomAutoAnimationPlugin: AutoAnimationPlugin = (el, action, oldCoords, newCoords) => {
  let keyframes: Keyframe[] = []
  let easing: string = 'ease-in-out'

  if (action === 'add') {
    keyframes = [
      { opacity: 0 },
      { opacity: 1 },
    ]
    easing = 'ease-in'
  }

  if (action === 'remove') {
    keyframes = [
      { opacity: 1 },
      { opacity: 0 },
    ]
    easing = 'ease-out'
  }

  if (action === 'remain') {
    let deltaLeft = oldCoords!.left - newCoords!.left
    let deltaTop = oldCoords!.top - newCoords!.top
    const deltaRight =
      oldCoords!.left + oldCoords!.width - (newCoords!.left + newCoords!.width)
    const deltaBottom =
      oldCoords!.top + oldCoords!.height - (newCoords!.top + newCoords!.height)

    // element is probably anchored and doesn't need to be offset
    if (deltaBottom == 0) deltaTop = 0
    if (deltaRight == 0) deltaLeft = 0

    const [widthFrom, widthTo, heightFrom, heightTo] = getTransitionSizes(
      el,
      oldCoords!,
      newCoords!,
    )
    const start: Record<string, any> = {
      transform: `translate(${deltaLeft}px, ${deltaTop}px)`,
    }
    const end: Record<string, any> = {
      transform: `translate(0, 0)`,
    }
    if (widthFrom !== widthTo) {
      start.width = `${widthFrom}px`
      end.width = `${widthTo}px`
    }
    if (heightFrom !== heightTo) {
      start.height = `${heightFrom}px`
      end.height = `${heightTo}px`
    }

    keyframes = [start, end]
  }

  return new KeyframeEffect(el, keyframes, { duration: 150, easing })
}