import { defineStore } from 'pinia'
import { type Component, type Reactive, reactive, ref, type Ref } from 'vue'
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

export type StepStore = ReturnType<typeof useStepStore>

type SerializedStepData = {
  idIncrement: number,
  stepIdOrder: string[],
  stepsById: Record<string, SerializedStep>
}
export const useStepStore = defineStore('steps', () => {

    const stepRegistry = useStepRegistry()

    const idIncrement = ref(0)
    const stepIdOrder = ref<string[]>([]) as Ref<string[]>
    const stepsById = reactive({}) as Reactive<Record<string, StepRef>>

    function $reset() {
      idIncrement.value = 0
      stepIdOrder.value = []
      Object.assign(stepsById, {})
    }

    function $serializeState(): SerializedStepData {
      return {
        idIncrement: idIncrement.value,
        stepIdOrder: stepIdOrder.value,
        stepsById: serializeSteps(stepsById),
      }
    }

    // Custom restoration method for the plugin
    function $restoreState(data: SerializedStepData) {
      idIncrement.value = data.idIncrement ?? 0
      stepIdOrder.value = data.stepIdOrder

      Object.values(data.stepsById)
        .forEach((stepData: DeSerializedStep) => {
          const step = createLoadedStep(stepData)
          stepsById[step.id] = step
        })
    }

    function add(def: string): StepRef {
      stepRegistry.validateDef(def)
      idIncrement.value += 1
      const step = createNewStep(def, idIncrement.value)
      stepIdOrder.value.push(step.id)
      stepsById[step.id] = step

      return step
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
      validate(stepId)

      const prevId = getPrev(stepId)?.id
      const idx = stepIdOrder.value.indexOf(stepId)
      stepIdOrder.value.splice(idx, 1)
      delete stepsById[stepId]

      if (prevId) {
        _invalidateFromStep(prevId)
      }
    }

    function getPrev(stepId: string): StepRef | null {
      if (isFirst(stepId)) return null
      const currentIndex = stepIdOrder.value.indexOf(stepId)
      const prevStepId = stepIdOrder.value[currentIndex - 1]!
      return get(prevStepId)
    }

    function getNext<T extends AnyStepContext>(stepId: string): StepRef<T> | null {
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
      const nextStep = getNext(stepId)
      if (!nextStep) return

      _syncImageData(stepId, nextStep.id)
    }

    function _syncImageData<T extends AnyStepContext>(stepId: string, nextStepId: string) {
      const currentStep = get<T>(stepId)
      const nextStep = getNext<AnyStepContext>(stepId)
      console.log(`[${stepId}] _syncImageData`, stepId, '->', nextStepId)
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

    function moveTo(stepId: string, newIndex: number): void {
      validate(stepId)

      const currentIndex = stepIdOrder.value.indexOf(stepId)
      stepIdOrder.value.splice(currentIndex, 1)
      stepIdOrder.value.splice(newIndex, 0, stepId)

      const minIndex = Math.min(currentIndex, newIndex)
      const minStepId = stepIdOrder.value[minIndex]!
      _invalidateFromStep(minStepId)
    }

    function _invalidateFromStep(stepId: string) {
      syncImageDataFromPrev(stepId)
      syncImageDataToNext(stepId)
    }

    function updateStep(
      stepId: string,
      outputData: ImageData | null,
      validationErrors: StepValidationError[] = [],
    ) {
      console.log(`[${stepId}] updateStep`, { outputData, validationErrors })

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
      return stepIdOrder.value.indexOf(stepId) === stepIdOrder.value.length - 1
    }

    function isFirst(stepId: string) {
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

      const result = run({ config: step.config, inputData })

      let { outputData, preview, validationErrors } = parseStepRunnerResult<T>(result)

      console.log(`[${stepId}] updateStep`, { outputData, preview, validationErrors })

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
      const prev = getPrev(stepId)
      if (!prev) {
        return []
      }

      const prevHandler = getHandler(prev.id)
      const currentHandler = getHandler(stepId)
      return [
        ...currentHandler.validateInputType(prevHandler.outputDataType, currentHandler.inputDataTypes),
        ...currentHandler.validateInput(prev.outputData),
      ]
    }

    const length = () => stepIdOrder.value.length

    return {
      idIncrement,
      stepIdOrder,
      stepsById,

      $reset,
      $serializeState,
      $restoreState,

      add,
      get,
      remove,
      moveTo,
      all,
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
    }
  },
  {
    persist: {
      key: 'steps',
    },
  })

