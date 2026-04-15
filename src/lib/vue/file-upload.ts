import { toaster } from './toast.ts'

export function jsonFileParser(cb: (obj: object) => void) {
  return (event: any) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {

          if (typeof e?.target?.result === 'string') {
            cb(JSON.parse(e.target.result))
            return
          }

        } catch (error: any) {
          toaster().error('Invalid Save File', error)
          console.error('Error parsing JSON:', error)
        }

        toaster().error('There was an internal error when importing')
        throw new Error('e.target.result is not a string')

      }
      reader.readAsText(file)
    }
  }
}