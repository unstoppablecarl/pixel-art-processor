const blue = '#CCEDFC'
const green = '#D1FCCC'
const orange = '#FCEECC'
const purple = '#DACCFC'

export function logStepEvent(stepId: string, event: string, ...args: any[]) {
  console.log(`%c[${stepId}] %c${event}`, `background: ${blue}`, `background: ${green}`, ...args)
}

export function logStepWatch(stepId: string, ...args: any[]) {
  console.log(`%c[${stepId}] %cWATCH`, `background: ${blue}`, `background: ${orange}`, ...args)
}

export function logStepDebug(stepId: string, ...args: any[]) {
  console.log(`%c[${stepId}] %DEBUG`, `background: ${blue}`, `background: ${purple}`, ...args)
}