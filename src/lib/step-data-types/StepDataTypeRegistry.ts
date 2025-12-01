import { type DataStructureConstructor } from '../../steps.ts'

type ClassConstructor = new (...args: any[]) => any;

export class StepDataTypeRegistry {
  types: Map<ClassConstructor, string> = new Map([
    [ImageData, 'Image Data (Native)'],
  ])

  constructor(types: DataStructureConstructor[] = []) {
    this.register(types)
  }

  register(type: DataStructureConstructor | DataStructureConstructor[]) {
    if (!Array.isArray(type)) {
      type = [type]
    }
    type.forEach(t => this.registerRaw({
      constructor: t as ClassConstructor,
      displayName: (t as any).displayName,
    }))
  }

  registerRaw({ constructor, displayName }: {
    constructor: ClassConstructor
    displayName: string,
  }): void {
    if (constructor === ImageData) {
      return
    }

    if (!displayName) {
      throw new Error('no MyClass.displayName provided')
    }

    this.types.set(constructor, displayName)
  }

  isValidType(type: any) {
    return this.types.has(type)
  }

  isValidTypeInstance(instance: any) {
    return [...this.types.keys()].some(constructor => {
      return constructor.prototype.isPrototypeOf(instance)
    })
  }

  // gets the display name from an instance or a constructor
  getDisplayName(entity: Function | object): string {
    let constructor: ClassConstructor

    if (typeof entity === 'object' && entity !== null && 'constructor' in entity) {
      constructor = entity.constructor as ClassConstructor
    }
    // if the entity is already a function, use it directly.
    else if (typeof entity === 'function') {
      constructor = entity as ClassConstructor
    } else {
      console.error('Invalid Step Type entity for lookup', entity)
      return 'Invalid Step Type entity'
    }

    const displayName = this.types.get(constructor)

    if (!displayName) {
      const msg = `Constructor ${constructor.name} is not registered in the step data type registry.`
      console.error(msg)
      return msg
    }

    return displayName
  }
}