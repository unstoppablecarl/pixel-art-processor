import { defineStore } from 'pinia'
import { type Component, computed, reactive, type Reactive, type Ref, ref, watch } from 'vue'
import { GenericValidationError, StepValidationError } from '../errors.ts'
import {
  type AnyStepContext,
  createLoadedStep,
  createNewStep,
  type DeSerializedStep,
  type SerializedStep,
  serializeSteps,
  type Step,
  type StepRef,
  StepType,
} from '../pipeline/Step.ts'
import {
  type Config,
  type IStepHandler,
  makeStepHandler,
  parseStepRunnerResult,
  type StepHandlerOptions,
  type StepRunner,
} from '../pipeline/StepHandler.ts'
import { useStepRegistry } from '../pipeline/StepRegistry.ts'
import { copyStepDataOrNull } from '../step-data-types/_step-data-type-helpers.ts'
import { copyImageDataOrNull } from '../util/ImageData.ts'
import { logStepEvent } from '../util/misc.ts'
import { prng } from '../util/prng.ts'
import { deepUnwrap } from '../util/vue-util.ts'

export type StepStore = ReturnType<typeof useStepStore>

type SerializedStepData = {
  idIncrement: number,
  stepIdOrder: string[],
  stepsById: Record<string, SerializedStep>,
  forkBranches: Record<string, string[][]>,
  seed: number,
}

export const useStepStore = defineStore('steps', () => {

    const stepRegistry = useStepRegistry()
    const seed = ref(3)

    const idIncrement = ref(0)
    const stepIdOrder = ref<string[]>([]) as Ref<string[]>
    const stepsById = reactive({}) as Reactive<Record<string, StepRef>>
    const forkBranches = reactive({}) as Reactive<Record<string, string[][]>>

    function $reset() {
      seed.value = 3
      idIncrement.value = 0
      stepIdOrder.value = []
      Object.assign(forkBranches, {})
      Object.assign(stepsById, {})
    }

    function $serializeState(): SerializedStepData {
      return {
        idIncrement: idIncrement.value,
        stepIdOrder: stepIdOrder.value,
        stepsById: serializeSteps(stepsById),
        forkBranches: deepUnwrap(forkBranches),
        seed: seed.value,
      }
    }

    // Custom restoration method for the plugin
    function $restoreState(data: SerializedStepData) {
      idIncrement.value = data.idIncrement ?? 0
      stepIdOrder.value = data.stepIdOrder
      seed.value = data.seed

      Object.values(data.stepsById)
        .forEach((stepData: DeSerializedStep) => {
          const step = createLoadedStep(stepData)
          stepsById[step.id] = step
        })

      Object.assign(forkBranches, data.forkBranches ?? {})
    }

    watch(seed, () => {
      prng.setSeed(seed.value)
      invalidateAll()
    })

    function add(def: string, afterStepId?: string): StepRef {
      stepRegistry.validateDef(def)
      idIncrement.value += 1
      const step = createNewStep(def, idIncrement.value)
      stepIdOrder.value.push(step.id)
      stepsById[step.id] = step

      if (afterStepId !== undefined) {
        moveAfter(step.id, afterStepId)
      }

      return step
    }

    function addFork(def: string, branchCount: number = 2, afterStepId?: string): StepRef {
      stepRegistry.validateDef(def)
      idIncrement.value += 1
      const step = createNewStep(def, idIncrement.value, StepType.FORK)
      stepIdOrder.value.push(step.id)
      stepsById[step.id] = step

      // Initialize empty branches
      forkBranches[step.id] = Array.from({ length: branchCount }, () => [])

      if (afterStepId !== undefined) {
        moveAfter(step.id, afterStepId)
      }

      return step
    }

    function addToBranch(forkId: string, branchIndex: number, def: string, afterStepId?: string): StepRef {
      const fork = get(forkId)
      if (fork.type !== StepType.FORK) {
        throw new Error(`Step ${forkId} is not a fork`)
      }

      const branches = forkBranches[forkId]
      if (!branches || branchIndex >= branches.length) {
        throw new Error(`Invalid branch index ${branchIndex} for fork ${forkId}`)
      }

      stepRegistry.validateDef(def)
      idIncrement.value += 1
      const step = createNewStep(def, idIncrement.value, StepType.NORMAL, forkId, branchIndex)
      stepsById[step.id] = step

      // Add to branch
      if (afterStepId !== undefined) {
        const afterIndex = branches[branchIndex].indexOf(afterStepId)
        if (afterIndex === -1) {
          throw new Error(`Step ${afterStepId} not found in branch ${branchIndex}`)
        }
        branches[branchIndex].splice(afterIndex + 1, 0, step.id)
      } else {
        branches[branchIndex].push(step.id)
      }

      return step
    }

    function getBranches(forkId: string): string[][] {
      const fork = get(forkId)
      if (fork.type !== StepType.FORK) {
        throw new Error(`Step ${forkId} is not a fork`)
      }
      return forkBranches[forkId] ?? []
    }

    function getAllBranchSteps(forkId: string, branchIndex: number): StepRef[] {
      const branches = getBranches(forkId)
      if (branchIndex >= branches.length) {
        throw new Error(`Invalid branch index ${branchIndex}`)
      }
      return branches[branchIndex].map(id => get(id))
    }

    function removeBranch(forkId: string, branchIndex: number): void {
      const branches = getBranches(forkId)
      if (branchIndex >= branches.length) {
        throw new Error(`Invalid branch index ${branchIndex}`)
      }

      // Remove all steps in the branch
      const branchSteps = branches[branchIndex]
      branchSteps.forEach(stepId => {
        delete stepsById[stepId]
      })

      // Remove the branch
      branches.splice(branchIndex, 1)

      // Update branchIndex for remaining branches
      for (let i = branchIndex; i < branches.length; i++) {
        branches[i].forEach(stepId => {
          get(stepId).branchIndex = i
        })
      }
    }

    function getDescendants(stepId: string): StepRef[] {
      const step = get(stepId)
      const descendants: StepRef[] = []

      if (step.type === StepType.FORK) {
        // Collect all steps from all branches
        const branches = getBranches(stepId)
        branches.forEach(branch => {
          branch.forEach(branchStepId => {
            descendants.push(get(branchStepId))
            // Recursively get descendants of each branch step
            descendants.push(...getDescendants(branchStepId))
          })
        })
      } else {
        // For normal steps, get the next step
        const next = getNext(stepId)
        if (next) {
          descendants.push(next)
          descendants.push(...getDescendants(next.id))
        }
      }

      return descendants
    }

    function getAncestors(stepId: string): StepRef[] {
      const step = get(stepId)
      const ancestors: StepRef[] = []

      if (step.parentForkId) {
        // Step is in a branch, get the fork
        const fork = get(step.parentForkId)
        ancestors.push(fork)
        ancestors.push(...getAncestors(fork.id))
      } else {
        // Step is in main trunk
        const prev = getPrev(stepId)
        if (prev) {
          ancestors.push(prev)
          ancestors.push(...getAncestors(prev.id))
        }
      }

      return ancestors
    }

    function getIndex(stepId: string) {
      const step = get(stepId)

      if (step.parentForkId) {
        // Step is in a branch
        const branches = getBranches(step.parentForkId)
        return branches[step.branchIndex!].indexOf(stepId)
      }

      // Step is in main trunk
      return stepIdOrder.value.indexOf(stepId)
    }

    function duplicate(stepId: string) {
      const step = get(stepId)

      let newStep: StepRef

      if (step.parentForkId) {
        // Duplicate within branch
        newStep = addToBranch(step.parentForkId, step.branchIndex!, step.def)
      } else {
        // Duplicate in main trunk
        newStep = add(step.def)
      }

      const freshConfig = step.handler!.config()

      Object.assign(
        freshConfig,
        deepUnwrap(step.config),
      )

      newStep.config = freshConfig

      if (step.parentForkId) {
        // Move within branch
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        const index = branch.indexOf(stepId)
        if (index !== branch.length - 1) {
          const currentIndex = branch.indexOf(newStep.id)
          branch.splice(currentIndex, 1)
          branch.splice(index + 1, 0, newStep.id)
        }
      } else {
        // Move in main trunk
        if (!isLast(stepId)) {
          const index = stepIdOrder.value.indexOf(stepId)
          moveTo(newStep.id, index + 1)
        }
      }

      return newStep
    }

    function get<T extends AnyStepContext>(stepId: string): StepRef<T> {
      const step = stepsById[stepId] as StepRef<T>
      if (step === undefined) {
        throw new Error('Invalid step id: ' + stepId)
      }
      return step
    }

    function validate(stepId: string) {
      get(stepId)
    }

    function remove(stepId: string): void {
      const step = get(stepId)
      const prevId = getPrev(stepId)?.id

      if (step.type === StepType.FORK) {
        // Remove all branch steps
        const branches = getBranches(stepId)
        branches.forEach(branch => {
          branch.forEach(branchStepId => {
            delete stepsById[branchStepId]
          })
        })
        delete forkBranches[stepId]
      }

      if (step.parentForkId) {
        // Remove from branch
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        const idx = branch.indexOf(stepId)
        branch.splice(idx, 1)
      } else {
        // Remove from main trunk
        const idx = stepIdOrder.value.indexOf(stepId)
        stepIdOrder.value.splice(idx, 1)
      }

      delete stepsById[stepId]

      // Invalidate from previous step
      if (prevId) {
        _invalidateFromStep(prevId)
      } else if (step.parentForkId) {
        // If first step in branch, invalidate from fork
        _invalidateFromStep(step.parentForkId)
      }
    }

    function getPrev(stepId: string): StepRef | null {
      const step = get(stepId)

      if (step.parentForkId) {
        // Step is in a branch
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        const currentIndex = branch.indexOf(stepId)

        if (currentIndex === 0) {
          // First step in branch, return the fork
          return get(step.parentForkId)
        }

        const prevStepId = branch[currentIndex - 1]!
        return get(prevStepId)
      }

      // Step is in main trunk
      if (isFirst(stepId)) return null
      const currentIndex = stepIdOrder.value.indexOf(stepId)
      const prevStepId = stepIdOrder.value[currentIndex - 1]!
      return get(prevStepId)
    }

    function getNext<T extends AnyStepContext>(stepId: string): StepRef<T> | null {
      const step = get(stepId)

      if (step.type === StepType.FORK) {
        // Fork steps don't have a single "next" - return null
        return null
      }

      if (step.parentForkId) {
        // Step is in a branch
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        const currentIndex = branch.indexOf(stepId)

        if (currentIndex === branch.length - 1) {
          // Last step in branch, no next
          return null
        }

        const nextStepId = branch[currentIndex + 1]!
        return get<T>(nextStepId)
      }

      // Step is in main trunk
      if (isLast(stepId)) return null
      const currentIndex = stepIdOrder.value.indexOf(stepId)
      const nextStepId = stepIdOrder.value[currentIndex + 1]!
      return get<T>(nextStepId)
    }

    function syncImageDataFromPrev(stepId: string) {
      const prev = getPrev(stepId)
      if (!prev) return

      _syncImageData(prev.id, stepId)
    }

    function syncImageDataToNext(stepId: string) {
      const step = get(stepId)

      if (step.type === StepType.FORK) {
        // Fork: sync to ALL branch heads
        const branches = forkBranches[stepId]
        if (branches) {
          branches.forEach(branch => {
            if (branch.length > 0) {
              _syncImageData(stepId, branch[0])
            }
          })
        }
      } else {
        // Normal step: sync to single next
        const nextStep = getNext(stepId)
        if (nextStep) {
          _syncImageData(stepId, nextStep.id)
        }
      }
    }

    function _syncImageData<T extends AnyStepContext>(stepId: string, nextStepId: string) {
      const currentStep = get<T>(stepId)
      const nextStep = get<AnyStepContext>(nextStepId)
      logStepEvent(stepId, '_syncImageData', stepId, '->', nextStepId)

      if (nextStep === null) {
        return
      }

      let outputData = copyStepDataOrNull(currentStep.outputData)

      if (!nextStep.handler) {
        nextStep.pendingInput = outputData
        return
      }

      let newInputData = getHandler<T>(nextStep.id).prevOutputToInput(outputData)

      // force refresh even if input is the same
      nextStep.inputData = null
      nextStep.inputData = newInputData
    }

    function loadPendingInput(stepId: string) {
      const step = get(stepId)
      if (!step.pendingInput) {
        return
      }

      const prevStep = getPrev(stepId)
      if (!prevStep) {
        step.pendingInput = null
        return
      }
      const handler = getHandler(stepId)

      step.inputData = handler.prevOutputToInput(step.pendingInput)
      step.pendingInput = null
    }

    function loadStepData(stepId: string) {
      const step = get(stepId)
      if (step.loadSerialized === null) {
        throw new Error('step has no data to load: ' + stepId)
      }

      const handler = getHandler(stepId)

      handler.loadConfig(step.config as Config, step.loadSerialized.config)

      step.loadSerialized = null
    }

    function getHandler<T extends AnyStepContext>(stepId: string) {
      const step = get<T>(stepId)
      if (!step.handler) {
        throw new Error('Step does not have handler yet')
      }
      return step.handler
    }

    function moveAfter(stepId: string, afterStepId: string) {
      const index = getIndex(afterStepId)
      moveTo(stepId, index + 1)
    }

    function moveTo(stepId: string, newIndex: number): void {
      const step = get(stepId)

      if (step.parentForkId) {
        // Moving within a branch
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        const currentIndex = branch.indexOf(stepId)
        branch.splice(currentIndex, 1)
        branch.splice(newIndex, 0, stepId)

        const minIndex = Math.min(currentIndex, newIndex)
        const minStepId = branch[minIndex]!
        _invalidateFromStep(minStepId)
      } else {
        // Moving in main trunk
        validate(stepId)
        const currentIndex = stepIdOrder.value.indexOf(stepId)
        stepIdOrder.value.splice(currentIndex, 1)
        stepIdOrder.value.splice(newIndex, 0, stepId)

        const minIndex = Math.min(currentIndex, newIndex)
        const minStepId = stepIdOrder.value[minIndex]!
        _invalidateFromStep(minStepId)
      }
    }

    function invalidateAll() {
      if (!stepIdOrder.value.length) {
        return
      }

      const firstStepId = stepIdOrder.value[0]
      _invalidateFromStep(firstStepId)
    }

    function _invalidateFromStep(stepId: string) {
      syncImageDataFromPrev(stepId)
      syncImageDataToNext(stepId)

      const step = get(stepId)

      if (step.type === StepType.FORK) {
        // Invalidate all branches
        const branches = forkBranches[stepId]
        if (branches) {
          branches.forEach(branch => {
            if (branch.length > 0) {
              _invalidateFromStep(branch[0])
            }
          })
        }
      } else {
        // Invalidate next step in chain
        const next = getNext(stepId)
        if (next) {
          _invalidateFromStep(next.id)
        }
      }
    }

    function updateStep(
      stepId: string,
      outputData: ImageData | null,
      validationErrors: StepValidationError[] = [],
    ) {
      logStepEvent(stepId, 'updateStep', { outputData, validationErrors })
      const currentStep = get(stepId)

      currentStep.outputData = copyImageDataOrNull(outputData)
      currentStep.validationErrors = validationErrors

      syncImageDataToNext(stepId)
    }

    function setStepValidationErrors(stepId: string, errors: StepValidationError | StepValidationError[]) {
      if (!Array.isArray(errors)) errors = [errors]

      get(stepId).validationErrors = errors
    }

    function all(): Step<AnyStepContext>[] {
      return stepIdOrder.value.map(id => get(id))
    }

    function isLast(stepId: string) {
      const step = get(stepId)

      if (step.parentForkId) {
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        return branch.indexOf(stepId) === branch.length - 1
      }

      return stepIdOrder.value.indexOf(stepId) === stepIdOrder.value.length - 1
    }

    function isFirst(stepId: string) {
      const step = get(stepId)

      if (step.parentForkId) {
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        return branch.indexOf(stepId) === 0
      }

      return stepIdOrder.value.indexOf(stepId) === 0
    }

    function defToComponent(def: string): Component {
      return stepRegistry.get(def).component
    }

    function handleStepError(stepId: string, error: Error) {
      const errors: StepValidationError[] = []

      if (error instanceof StepValidationError) {
        errors.push(error)
      } else {
        errors.push(new GenericValidationError(error.message + ''))
      }

      if (!(error instanceof StepValidationError)) {
        throw error
      }

      setStepValidationErrors(stepId, errors)
    }

    function resolveStep<T extends AnyStepContext>(stepId: string, inputData: T['Input'] | null, run: StepRunner<T>) {

      const step = get(stepId) as Step<T>
      step.isProcessing = true

      inputData ??= null

      const inputTypeErrors = validateInputDataFromPrev(step.id)
      if (inputTypeErrors.length) {
        inputData = null
      }
      if (inputData) {
        inputData = inputData.copy()
      }

      prng.reset()

      const result = run({ config: step.config, inputData })

      let { outputData, preview, validationErrors } = parseStepRunnerResult<T>(step, result)

      logStepEvent(stepId, 'updateStep', { outputData, preview, validationErrors })
      step.outputData = copyStepDataOrNull(outputData)
      step.outputPreview = preview
      step.validationErrors = [
        ...inputTypeErrors,
        ...validationErrors,
      ]
      step.isProcessing = false

      syncImageDataToNext(stepId)
    }

    function registerStep<T extends AnyStepContext>(
      stepId: string,
      handlerOptions: StepHandlerOptions<T>,
    ): {
      step: Step<T>,
      handler: IStepHandler<T>
    } {
      const step = get<T>(stepId)

      const handler = makeStepHandler<T>(step.def, handlerOptions)
      step.handler = handler
      if (step.config === undefined) {
        step.config = handler.config()
      }

      if (step.loadSerialized !== null) {
        loadStepData(stepId)
      }

      syncImageDataFromPrev(step.id)

      return {
        step,
        handler,
      }
    }

    function validateInputDataFromPrev(stepId: string): StepValidationError[] {
      let prev = getPrev(stepId)
      console.log({prev}, prev?.type)
      if (prev?.type === StepType.FORK) {
        prev = getPrev(prev.id)

        console.log({prev})
      }

      if (!prev) {
        return []
      }

      const prevHandler = getHandler(prev.id)
      const currentHandler = getHandler(stepId)

      const hasInputTypes = currentHandler.inputDataTypes.length
      if (!hasInputTypes) {
        return []
      }

      // console.log({prevHandler})
      return [
        ...currentHandler.validateInputType(prevHandler.outputDataType, currentHandler.inputDataTypes),
        ...currentHandler.validateInput(prev.outputData),
      ]
    }

    const length = () => stepIdOrder.value.length

    const finalPreview = computed((): ImageData | null => {
      if (!stepIdOrder.value.length) return null

      const lastStepId = stepIdOrder.value[stepIdOrder.value.length - 1]
      const step = stepsById[lastStepId]
      return step.outputPreview
    })

    return {
      idIncrement,
      stepIdOrder,
      stepsById,
      forkBranches,
      seed,

      $reset,
      $serializeState,
      $restoreState,

      add,
      addFork,
      addToBranch,
      getBranches,
      getAllBranchSteps,
      removeBranch,
      getDescendants,
      getAncestors,
      get,
      duplicate,
      remove,
      moveTo,
      all,
      getIndex,
      loadStepData,
      syncImageDataFromPrev,
      setStepValidationErrors,
      registerStep,
      resolveStep,
      length,
      updateStep,
      loadPendingInput,
      defToComponent,
      handleStepError,
      finalPreview,
    }
  },
  {
    persist: {
      key: 'steps',
    },
  })