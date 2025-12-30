import { defineStore } from 'pinia'
import { computed, nextTick, type Reactive, reactive, ref, type Ref, watch } from 'vue'
import type { StepDataTypeInstance } from '../../steps.ts'
import { GenericValidationError, StepValidationError } from '../errors.ts'
import {
  type AnyStepContext,
  type AnyStepRef,
  assertConfiguredStep,
  type ConfiguredStep,
  createLoadedStep,
  createNewStep,
  type SerializedStep,
  serializeSteps,
  type Step,
  type StepRef,
} from '../pipeline/Step.ts'
import { type Config, makeStepHandler, type StepHandlerOptions, type WatcherTarget } from '../pipeline/StepHandler.ts'
import { useStepRegistry } from '../pipeline/StepRegistry.ts'
import {
  type ForkStepRunner,
  type ForkStepRunnerOutput,
  type NormalStepRunner,
  type NormalStepRunnerOutput,
  type StepRunnerResult,
  toForkStepRunnerResult,
  toNormalStepRunnerResult,
} from '../pipeline/StepRunner.ts'
import { analyzeArrayChange, arrayRemove, logStepEvent } from '../util/misc.ts'
import { prng } from '../util/prng.ts'
import { deepUnwrap } from '../util/vue-util.ts'

export type StepStore = ReturnType<typeof useStepStore>

type SerializedStepData = {
  idIncrement: number,
  rootStepIds: string[],
  stepsById: Record<string, SerializedStep>,
  forkBranches: Record<string, Branch[]>,
  imgScale: number,
  seed: number,
}

type Branch = {
  seed: number,
  stepIds: string[]
}

export const useStepStore = defineStore('steps', () => {
    const stepRegistry = useStepRegistry()
    const globalSeed = ref(3)

    const idIncrement = ref(0)
    const stepsById = reactive({}) as Reactive<Record<string, AnyStepRef>>
    const rootStepIds = ref<string[]>([]) as Ref<string[]>
    // key: stepId (that is a fork)
    // value: array of branches from the fork, each branch is an array of stepIds in order
    const forkBranches = reactive({}) as Reactive<Record<string, Branch[]>>
    const imgScale = ref(4)

    function $reset() {
      globalSeed.value = 3
      idIncrement.value = 0
      rootStepIds.value = []
      imgScale.value = 4
      Object.keys(forkBranches).forEach(key => delete forkBranches[key])
      Object.keys(stepsById).forEach(key => delete stepsById[key])
    }

    function $serializeState(): SerializedStepData {
      return {
        idIncrement: idIncrement.value,
        rootStepIds: rootStepIds.value,
        imgScale: imgScale.value,
        stepsById: serializeSteps(stepsById),
        forkBranches: deepUnwrap(forkBranches),
        seed: globalSeed.value,
      }
    }

    // Custom restoration method for the plugin
    function $restoreState(data: SerializedStepData) {
      idIncrement.value = data.idIncrement ?? 0
      rootStepIds.value = data.rootStepIds
      globalSeed.value = data.seed
      imgScale.value = data.imgScale

      Object.values(data.stepsById)
        .forEach((stepData: SerializedStep) => {
          const step = createLoadedStep(stepData)
          stepsById[step.id] = step
        })

      Object.assign(forkBranches, data.forkBranches ?? {})
    }

    watch(globalSeed, () => {
      prng.setSeed(globalSeed.value)
      invalidateAll()
    })

    function _insertStep(step: AnyStepRef, afterStepId?: string): void {
      if (afterStepId === undefined) {
        // No position specified, add to end of root
        rootStepIds.value.push(step.id)
        return
      }

      const afterStep = get(afterStepId)
      if (afterStep.parentForkId !== null) {
        // Insert into branch after afterStep
        const branch = getBranch(afterStep.parentForkId, afterStep.branchIndex!)
        const afterIndex = branch.stepIds.indexOf(afterStepId)

        step.parentForkId = afterStep.parentForkId
        step.branchIndex = afterStep.branchIndex
        branch.stepIds.splice(afterIndex + 1, 0, step.id)
      } else {
        // Insert into root after afterStep
        const afterIndex = rootStepIds.value.indexOf(afterStepId)
        rootStepIds.value.splice(afterIndex + 1, 0, step.id)
      }
    }

    function _createNewStepOrFork(
      def: string,
    ): AnyStepRef

    function _createNewStepOrFork(
      def: string,
      parentForkId: string,
      branchIndex: number,
    ): AnyStepRef

    function _createNewStepOrFork(
      def: string,
      parentForkId?: string,
      branchIndex?: number,
    ): AnyStepRef {
      stepRegistry.validateDef(def)
      idIncrement.value += 1

      const step = createNewStep(def, idIncrement.value, parentForkId, branchIndex)
      stepsById[step.id] = step

      if (stepIsFork(step)) {
        forkBranches[step.id] = [{
          seed: 0,
          stepIds: [],
        }]
      }
      return step
    }

    const stepIsFork = stepRegistry.stepIsFork

    function add(def: string, afterStepId?: string): AnyStepRef {
      const step = _createNewStepOrFork(def)
      _insertStep(step, afterStepId)

      return step
    }

    function addToBranch(forkId: string, branchIndex: number, def: string, afterStepId?: string): AnyStepRef {
      getFork(forkId)

      const branches = forkBranches[forkId]
      if (!branches || branchIndex >= branches.length) {
        throw new Error(`Invalid branch index ${branchIndex} for fork ${forkId}`)
      }

      const step = _createNewStepOrFork(def, forkId, branchIndex)

      if (afterStepId !== undefined) {
        const afterIndex = branches[branchIndex].stepIds.indexOf(afterStepId)
        if (afterIndex === -1) {
          throw new Error(`Step ${afterStepId} not found in branch ${branchIndex}`)
        }
        branches[branchIndex].stepIds.splice(afterIndex + 1, 0, step.id)
      } else {
        branches[branchIndex].stepIds.push(step.id)
      }

      return step
    }

    function getBranches(forkId: string): Branch[] {
      getFork(forkId)
      return forkBranches[forkId]
    }

    function getBranch(forkId: string, branchIndex: number): Branch {
      const branches = getBranches(forkId)
      const branch = branches[branchIndex]
      if (!branch) {
        throw new Error(`Invalid branch index: ${branchIndex} for forkId: ${forkId}`)
      }
      return branch
    }

    function setBranchStepIds(forkId: string, branchIndex: number, newStepIds: string[]) {
      const oldStepIds = getBranch(forkId, branchIndex)

      const { movedStepId, oldIndex, newIndex, isTransfer } = analyzeArrayChange(oldStepIds.stepIds, newStepIds)

      const branches = getBranches(forkId)
      branches[branchIndex].stepIds = newStepIds

      if (isTransfer) {
        const step = get(movedStepId)

        // step is leaving this branch (removed from array)
        if (newIndex === -1) {
          // Step was removed - it transferred OUT
          // Invalidate from the old position in the now-modified branch
          if (newStepIds.length > 0) {
            // Branch still has steps - invalidate from where the step was removed
            const invalidateIndex = Math.min(oldIndex, newStepIds.length - 1)
            resolveStep(newStepIds[invalidateIndex])
          } else {
            // Branch is now empty - invalidate the fork itself
            resolveStep(forkId)
          }
        } else {
          // Step came INTO this branch from different context
          step.parentForkId = forkId
          step.branchIndex = branchIndex

          // Invalidate from the moved step's new position onward
          if (newIndex < newStepIds.length) {
            resolveStep(newStepIds[newIndex])
          }
        }

        return
      }

      // Reorder within same branch
      const minAffectedIndex = Math.min(oldIndex, newIndex)
      if (minAffectedIndex < newStepIds.length) {
        resolveStep(newStepIds[minAffectedIndex])
      }
    }

    function setRootStepIds(newStepIds: string[]) {
      const oldStepIds = rootStepIds.value

      const { movedStepId, oldIndex, newIndex, isTransfer } = analyzeArrayChange(oldStepIds, newStepIds)

      rootStepIds.value = newStepIds

      if (isTransfer) {
        const step = get(movedStepId)

        // Check if step is leaving root (removed from array)
        if (newIndex === -1) {
          // Step was removed - it transferred OUT to a branch
          // Invalidate from the old position in root
          if (newStepIds.length > 0) {
            const invalidateIndex = Math.min(oldIndex, newStepIds.length - 1)
            resolveStep(newStepIds[invalidateIndex])
          }
          // If root is empty, nothing to invalidate
        } else {
          // Step came INTO root from a branch
          step.parentForkId = null!
          step.branchIndex = null!
          // Invalidate from the moved step's new position onward
          if (newIndex < newStepIds.length) {
            resolveStep(newStepIds[newIndex])
          }
        }
        return
      }

      // Reorder within root
      const minAffectedIndex = Math.min(oldIndex, newIndex)
      if (minAffectedIndex < newStepIds.length) {
        resolveStep(newStepIds[minAffectedIndex])
      }
    }

    function addBranch(forkId: string) {
      getFork(forkId)
      forkBranches[forkId].push({
        seed: 0,
        stepIds: [],
      })
    }

    function resolveBranch(forkId: string, branchIndex: number) {
      const branch = getBranch(forkId, branchIndex)
      if (!branch.stepIds.length) return
      return resolveStep(branch.stepIds[0])
    }

    function duplicateBranch(forkId: string, branchIndex: number) {
      getFork(forkId)

      const branches = getBranches(forkId)

      const sourceBranch = getBranch(forkId, branchIndex)
      const newBranchIndex = branches.length

      // Add new empty branch
      branches.push({
        seed: sourceBranch.seed,
        stepIds: [],
      })

      // Duplicate each step in the source branch
      const stepIdMap = new Map<string, string>() // old ID -> new ID mapping

      // let fork step update from branches.length changing
      nextTick(() => {

        sourceBranch.stepIds.forEach(sourceStepId => {
          const sourceStep = get(sourceStepId)

          // Create new step in the new branch
          idIncrement.value += 1
          const newStep = createNewStep(
            sourceStep.def,
            idIncrement.value,
            forkId,
            newBranchIndex,
          )

          stepsById[newStep.id] = newStep
          branches[newBranchIndex].stepIds.push(newStep.id)

          // Copy config if handler exists
          if (sourceStep.handler) {
            const freshConfig = sourceStep.handler.config()
            Object.assign(freshConfig, deepUnwrap(sourceStep.config))
            newStep.config = freshConfig
          }

          stepIdMap.set(sourceStepId, newStep.id)
        })
      })
    }

    function removeBranch(forkId: string, branchIndex: number) {
      const branches = getBranches(forkId)

      // Remove steps in the branch
      const branchSteps = getBranch(forkId, branchIndex)
      branchSteps.stepIds.forEach(stepId => {
        delete stepsById[stepId]
      })

      // Remove the branch
      branches.splice(branchIndex, 1)

      // Update branchIndex for remaining branches
      for (let i = branchIndex; i < branches.length; i++) {
        branches[i].stepIds.forEach(stepId => {
          get(stepId).branchIndex = i
        })
      }
    }

    function duplicate(stepId: string) {
      const step = get(stepId)

      let newStep: AnyStepRef

      if (step.parentForkId) {
        // Duplicate within branch
        newStep = addToBranch(step.parentForkId, step.branchIndex!, step.def)
      } else {
        // Duplicate in main trunk
        newStep = add(step.def)
      }

      newStep.loadSerialized = { config: step.handler!.serializeConfig(step.config) }

      if (step.parentForkId) {
        // Move within branch
        const branch = getBranch(step.parentForkId, step.branchIndex!)
        const index = branch.stepIds.indexOf(stepId)
        const isLastBranch = index === branch.stepIds.length - 1
        if (!isLastBranch) {
          const currentIndex = branch.stepIds.indexOf(newStep.id)
          branch.stepIds.splice(currentIndex, 1)
          branch.stepIds.splice(index + 1, 0, newStep.id)
        }
      } else {
        // Move in main trunk
        if (!isLast(stepId)) {
          const index = rootStepIds.value.indexOf(stepId)
          moveTo(newStep.id, index + 1)
        }
      }

      return newStep
    }

    function get(stepId: string): AnyStepRef {
      const step = stepsById[stepId]
      if (step === undefined) {
        throw new Error('Invalid step id: ' + stepId)
      }
      return step
    }

    function getFork(forkId: string) {
      const fork = get(forkId)
      if (!stepIsFork(fork)) {
        throw new Error(`Step ${forkId} is not a fork`)
      }
      return fork
    }

    function remove(stepId: string): void {
      const step = get(stepId)

      if (stepIsFork(step)) {
        getBranches(stepId).forEach(({ stepIds }) => {
          stepIds.forEach(branchStepId => {
            delete stepsById[branchStepId]
          })
        })
        delete forkBranches[stepId]
      }

      if (step.parentForkId) {
        // Remove from branch
        const branch = getBranch(step.parentForkId, step.branchIndex!)
        arrayRemove(branch.stepIds, stepId)
      } else {
        // Remove from main trunk
        arrayRemove(rootStepIds.value, stepId)
      }

      delete stepsById[stepId]
    }

    function getPrev(stepId: string): AnyStepRef | null {
      const step = get(stepId)

      if (step.parentForkId) {
        // Step is in a branch
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        const currentIndex = branch.stepIds.indexOf(stepId)

        if (currentIndex === 0) {
          // First step in branch, return the fork
          return get(step.parentForkId)
        }

        const prevStepId = branch.stepIds[currentIndex - 1]!
        return get(prevStepId)
      }

      // Step is in main trunk
      if (isFirst(stepId)) return null
      const currentIndex = rootStepIds.value.indexOf(stepId)
      const prevStepId = rootStepIds.value[currentIndex - 1]!
      return get(prevStepId)
    }

    function getNext(stepId: string): AnyStepRef | null {
      const step = get(stepId)

      if (stepIsFork(step)) {
        // Fork steps don't have a single "next"
        return null
      }

      if (step.parentForkId) {
        // Step is in a branch
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        const currentIndex = branch.stepIds.indexOf(stepId)

        if (currentIndex === branch.stepIds.length - 1) {
          // Last step in branch, no next
          return null
        }

        const nextStepId = branch.stepIds[currentIndex + 1]!
        return get(nextStepId)
      }

      // Step is in main trunk
      if (isLast(stepId)) return null
      const currentIndex = rootStepIds.value.indexOf(stepId)
      const nextStepId = rootStepIds.value[currentIndex + 1]!
      return get(nextStepId)
    }

    function getHandler(stepId: string) {
      const step = get(stepId)
      if (!step.handler) {
        throw new Error('Step does not have handler yet')
      }
      return step.handler
    }

    function getStepContext<T extends AnyStepContext>(step: StepRef<T>): {
      array: string[],
      parentForkId: string | null,
      branchIndex: number | null
    } {

      if (step.parentForkId) {
        const branches = getBranches(step.parentForkId)
        return {
          array: branches[step.branchIndex!].stepIds,
          parentForkId: step.parentForkId,
          branchIndex: step.branchIndex,
        }
      }

      return {
        array: rootStepIds.value,
        parentForkId: null,
        branchIndex: null,
      }
    }

    function moveTo(stepId: string, newIndex: number): void {
      const step = get(stepId)
      moveToContext(stepId, step.parentForkId, step.branchIndex, newIndex)
    }

    function moveToContext(
      stepId: string,
      targetParentForkId: string | null,
      targetBranchIndex: number | null,
      newIndex: number,
    ): void {
      const step = get(stepId)
      const sourceContext = getStepContext(step)

      if (newIndex < 0) {
        throw new Error(`Invalid newIndex: ${newIndex}`)
      }

      // Determine target context
      let targetArray: string[]
      if (targetParentForkId) {
        if (targetBranchIndex === null) {
          throw new Error(`targetBranchIndex cannot be null if targetParentForkId is provided`)
        }

        targetArray = getBranch(targetParentForkId, targetBranchIndex).stepIds

      } else {
        targetArray = rootStepIds.value
      }

      // Remove from source context
      const currentIndex = sourceContext.array.indexOf(stepId)
      if (currentIndex === -1) {
        throw new Error(`Step ${stepId} not found in source context`)
      }
      sourceContext.array.splice(currentIndex, 1)

      // Update step metadata if changing contexts
      if (sourceContext.parentForkId !== targetParentForkId ||
        sourceContext.branchIndex !== targetBranchIndex) {
        step.parentForkId = targetParentForkId
        step.branchIndex = targetBranchIndex
      }

      // Add to target context
      targetArray.splice(newIndex, 0, stepId)

      // Determine what needs invalidation
      const sameContext = sourceContext.array === targetArray

      if (sameContext) {
        // Moving within same context - invalidate from min index
        const minIndex = Math.min(currentIndex, newIndex)
        const minStepId = targetArray[minIndex]!
        resolveStep(minStepId)
      } else {
        // Moving between contexts - invalidate both locations

        // Invalidate source context from the position where step was removed
        if (sourceContext.array.length > 0) {
          const sourceInvalidateIndex = Math.min(currentIndex, sourceContext.array.length - 1)
          resolveStep(sourceContext.array[sourceInvalidateIndex])
        } else if (sourceContext.parentForkId) {
          // Branch is now empty, invalidate from the fork
          resolveStep(sourceContext.parentForkId)
        }

        // @TODO check for redundant resolve case
        // Invalidate target context from the new position
        const targetInvalidateIndex = Math.min(newIndex, targetArray.length - 1)
        resolveStep(targetArray[targetInvalidateIndex])
      }
    }

    function invalidateAll() {
      if (!rootStepIds.value.length) return
      return resolveStep(rootStepIds.value[0])
    }

    const rootSteps = computed((): Step<AnyStepContext>[] => {
      return rootStepIds.value.map(id => get(id))
    })

    function isLast(stepId: string) {
      const step = get(stepId)

      if (step.parentForkId) {
        const branch = getBranch(step.parentForkId, step.branchIndex!)
        return branch.stepIds.indexOf(stepId) === branch.stepIds.length - 1
      }

      return rootStepIds.value.indexOf(stepId) === rootStepIds.value.length - 1
    }

    function isFirst(stepId: string) {
      const step = get(stepId)

      if (step.parentForkId) {
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
        return branch.stepIds.indexOf(stepId) === 0
      }

      return rootStepIds.value.indexOf(stepId) === 0
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

      get(stepId).validationErrors = errors
    }

    function setPassthroughTypeFromPrev<T extends AnyStepContext>(step: ConfiguredStep<T>) {
      const prev = getPrev(step.id)
      if (!prev) {
        step.handler.clearPassThroughDataType()
        return
      }

      const outputDataType = getHandler(prev.id).outputDataType
      step.handler.setPassThroughDataType(outputDataType)
    }

    function getPrevOutputData<T extends AnyStepContext>(step: ConfiguredStep<T>): {
      outputData: StepDataTypeInstance | null,
      validationErrors: StepValidationError[]
    } {
      const prev = getPrev(step.id)
      if (!prev) {
        return {
          outputData: null,
          validationErrors: [],
        }
      }

      let outputData: StepDataTypeInstance | null

      if (step.parentForkId && stepIsFork(prev)) {
        outputData = prev.outputData[step.branchIndex]
        console.log(' outputData = prev.outputData[step.branchIndex]', prev.outputData[step.branchIndex])
        console.log('prev', deepUnwrap(prev))

      } else {
        outputData = prev.outputData
        console.log('outputData = prev.outputData', prev.outputData)
        console.log('prev', deepUnwrap(prev))
      }

      if (outputData === undefined) {
        console.log('prev', deepUnwrap(prev))
        console.log('prev.outputData', deepUnwrap(prev).outputData)

        throw new Error('wtf')
      }

      if (stepRegistry.stepIsPassthrough(step)) {
        setPassthroughTypeFromPrev(step)
      }

      const currentHandler = getHandler(step.id)

      const validationErrors = [
        ...currentHandler.validateInput(outputData, currentHandler.inputDataTypes),
      ]

      if (validationErrors.length) {
        outputData = null
      }

      return {
        outputData,
        validationErrors,
      }
    }

    function resolveStep<T extends AnyStepContext>(stepId: string) {
      const step = get(stepId) as StepRef<T>
      assertConfiguredStep(step)

      // prev is processing and it will trigger this when done
      const prev = getPrev(step.id)
      if (prev) {
        if (!prev.initialized) return
        if (prev.isProcessing) return
        if (!prev.handler) return
      }

      step.isProcessing = true

      const startTime = performance.now()

      try {
        step.handler.clearPassThroughDataType()

        let { outputData, validationErrors } = getPrevOutputData(step)

        if (step.muted) {
          setPassthroughTypeFromPrev(step)

          step.outputData = null
          step.outputData = outputData
          step.outputPreview = null
          step.validationErrors = []
          step.lastExecutionTimeMS = 0
        } else {
          if (outputData) {
            outputData = outputData.copy()
          }
          prng.setSeed(calculateSeed(step.id))

          const duration = performance.now() - startTime
          let result: StepRunnerResult

          if (stepIsFork(step)) {
            const runner = step.handler.run as ForkStepRunner<T>

            const output = runner({
              config: step.config,
              inputData: outputData,
              branchCount: getBranches(stepId).length,
            }) as ForkStepRunnerOutput<T['Input']>

            result = toForkStepRunnerResult(output)

          } else {
            const runner = step.handler.run as NormalStepRunner<T>
            const output = runner({
              config: step.config,
              inputData: outputData,
            }) as NormalStepRunnerOutput<T['Input']>
            result = toNormalStepRunnerResult(output)
          }

          const { output, preview, validationErrors: runnerValidationErrors } = result

          logStepEvent(stepId, 'resolveStep', {
            output,
            preview,
            validationErrors,
            durationMs: duration.toFixed(2),
          })

          step.outputData = output
          step.outputPreview = preview
          step.validationErrors = [
            ...validationErrors,
            ...runnerValidationErrors,
          ]
          step.lastExecutionTimeMS = duration
        }

        const next = getNext(stepId)
        if (next) {
          return resolveStep(next.id)
        }
      } finally {
        step.isProcessing = false
      }
    }

    function registerStep<T extends AnyStepContext>(
      stepId: string,
      handlerOptions: StepHandlerOptions<T>,
    ): {
      step: ConfiguredStep<T>,
      watcherTargets: WatcherTarget[],
    } {
      const step = get(stepId) as StepRef<T>
      const handler = makeStepHandler<T>(step.def, handlerOptions)

      step.handler = handler
      if (step.config === undefined) {
        step.config = handler.reactiveConfig(handler.config())
      }

      if (step.loadSerialized !== null) {
        handler.loadConfig(step.config as Config, step.loadSerialized.config)
        step.loadSerialized = null
      }

      const targets = [
        step.config,
        () => step.seed,
        () => step.muted,
      ]

      if (stepIsFork(step)) {
        targets.push(() => forkBranches[step.id].length)
      }

      const watcherTargets = handler.watcher(step as ConfiguredStep<T>, targets)

      return {
        step: step as ConfiguredStep<T>,
        watcherTargets,
      }
    }

    const length = () => rootStepIds.value.length

    function getAllLeafSteps(stepId: string): AnyStepRef[] {
      const step = get(stepId)
      const leaves: AnyStepRef[] = []

      if (stepIsFork(step)) {
        const branches = getBranches(stepId)
        branches.forEach(branch => {
          if (branch.stepIds.length === 0) {
            // Empty branch - the fork itself is a leaf
            leaves.push(step)
          } else {
            const lastStepId = branch.stepIds[branch.stepIds.length - 1]
            leaves.push(...getAllLeafSteps(lastStepId))
          }
        })
      } else {
        // Normal step is a leaf
        leaves.push(step)
      }

      return leaves
    }

    function getAllPipelineLeaves(): AnyStepRef[] {
      const leaves: AnyStepRef[] = []

      if (rootStepIds.value.length === 0) return leaves

      const lastMainStepId = rootStepIds.value[rootStepIds.value.length - 1]
      return getAllLeafSteps(lastMainStepId)
    }

    const stepLeaves = computed((): AnyStepRef[] => getAllPipelineLeaves())

    const startStepOutputSize = computed(() => {
      let width = 0
      let height = 0

      const firstId = rootStepIds.value?.[0]
      if (firstId) {
        const step = get(firstId)
        width = step.outputData?.width ?? width
        height = step.outputData?.height ?? height
      }

      return {
        width,
        height,
      }
    })

    function calculateSeed(stepId: string) {
      const step = get(stepId)
      let result = globalSeed.value + step.seed

      if (step.parentForkId) {
        result += get(step.parentForkId).seed
        result += getBranch(step.parentForkId, step.branchIndex).seed
      }
      return result
    }

    function getStepsAddableAfter(stepId: string) {
      const step = get(stepId)
      const steps = stepRegistry.getStepsCompatibleWithOutput(step.def)
      if (!isLast(stepId)) {
        return steps.filter(s => stepRegistry.isFork(s.def))
      }
      return steps
    }

    return {
      idIncrement,
      rootStepIds,
      stepsById,
      forkBranches,
      globalSeed,
      startStepOutputSize,
      imgScale,

      $reset,
      $serializeState,
      $restoreState,

      isLast,
      stepIsFork,
      add,
      getFork,
      addToBranch,
      getBranches,
      getBranch,
      getStepsAddableAfter,
      setRootStepIds,
      setBranchStepIds,
      resolveBranch,
      addBranch,
      removeBranch,
      duplicateBranch,
      get,
      duplicate,
      remove,
      rootSteps,
      registerStep,
      resolveStep,
      length,
      handleStepError,
      stepLeaves,
      invalidateAll,
    }
  },
  {
    persist: {
      key: 'steps',
    },
  })