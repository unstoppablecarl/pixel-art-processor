import { defineStore } from 'pinia'
import { type Component, computed, reactive, type Reactive, type Ref, ref, watch } from 'vue'
import type { StepDataTypeInstance } from '../../steps.ts'
import { GenericValidationError, StepValidationError } from '../errors.ts'
import {
  type AnyStepContext,
  type AnyStepRef,
  createLoadedStep,
  createNewStep,
  type DeSerializedStep,
  type SerializedStep,
  serializeSteps,
  type Step,
  type StepRef,
} from '../pipeline/Step.ts'
import { type Config, type IStepHandler, makeStepHandler, type StepHandlerOptions } from '../pipeline/StepHandler.ts'
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
import { copyStepDataOrNull } from '../step-data-types/_step-data-type-helpers.ts'
import { copyImageDataOrNull } from '../util/ImageData.ts'
import { arrayRemove, logStepEvent } from '../util/misc.ts'
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
  inputData: StepDataTypeInstance | null,
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

    // key: stepId
    // value: effective seed (globalSeed + step.seed + fork.seed + branch.seed)
    const stepSeeds = reactive({}) as Reactive<Record<string, number>>

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
        .forEach((stepData: DeSerializedStep<AnyStepContext>) => {
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
          inputData: null,
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
      validateIsFork(forkId)

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
      validateIsFork(forkId)
      return forkBranches[forkId] ?? []
    }

    function getBranch(forkId: string, branchIndex: number): Branch {
      const branches = getBranches(forkId)
      const branch = branches[branchIndex]
      if (!branch) {
        throw new Error(`Invalid branch index: ${branchIndex} for forkId: ${forkId}`)
      }
      return branch
    }

    function setStepSeed(stepId: string, seed: number): void {
      const step = get(stepId)
      step.seed = seed
      _invalidateFromStep(stepId)
    }

    function setBranchSeed(forkId: string, branchIndex: number, seed: number): void {
      const branch = getBranch(forkId, branchIndex)
      branch.seed = seed

      if (!branch.stepIds.length) return
      _invalidateFromStep(branch.stepIds[0])
    }

    function setBranchStepIds(forkId: string, branchIndex: number, newStepIds: string[]) {
      const oldStepIds = getBranch(forkId, branchIndex)

      const { movedStepId, oldIndex, newIndex, isTransfer } = _analyzeArrayChange(oldStepIds.stepIds, newStepIds)

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
            _invalidateFromStep(newStepIds[invalidateIndex])
          } else {
            // Branch is now empty - invalidate the fork itself
            _invalidateFromStep(forkId)
          }
        } else {
          // Step came INTO this branch from different context
          step.parentForkId = forkId
          step.branchIndex = branchIndex

          // Invalidate from the moved step's new position onward
          if (newIndex < newStepIds.length) {
            _invalidateFromStep(newStepIds[newIndex])
          }
        }

        return
      }

      // Reorder within same branch
      const minAffectedIndex = Math.min(oldIndex, newIndex)
      if (minAffectedIndex < newStepIds.length) {
        _invalidateFromStep(newStepIds[minAffectedIndex])
      }
    }

    function setRootStepIds(newStepIds: string[]) {
      const oldStepIds = rootStepIds.value

      const { movedStepId, oldIndex, newIndex, isTransfer } = _analyzeArrayChange(oldStepIds, newStepIds)

      rootStepIds.value = newStepIds

      if (isTransfer) {
        const step = get(movedStepId)

        // Check if step is leaving root (removed from array)
        if (newIndex === -1) {
          // Step was removed - it transferred OUT to a branch
          // Invalidate from the old position in root
          if (newStepIds.length > 0) {
            const invalidateIndex = Math.min(oldIndex, newStepIds.length - 1)
            _invalidateFromStep(newStepIds[invalidateIndex])
          }
          // If root is empty, nothing to invalidate
        } else {
          // Step came INTO root from a branch
          step.parentForkId = null
          step.branchIndex = null

          // Invalidate from the moved step's new position onward
          if (newIndex < newStepIds.length) {
            _invalidateFromStep(newStepIds[newIndex])
          }
        }
        return
      }

      // Reorder within root
      const minAffectedIndex = Math.min(oldIndex, newIndex)
      if (minAffectedIndex < newStepIds.length) {
        _invalidateFromStep(newStepIds[minAffectedIndex])
      }
    }

    function _analyzeArrayChange(
      oldArray: string[],
      newArray: string[],
    ): {
      movedStepId: string
      oldIndex: number
      newIndex: number
      isTransfer: boolean
    } {
      // Find the step that moved
      let movedStepId: string | null = null
      let newIndex = -1

      // Check for new item (transfer in)
      for (let i = 0; i < newArray.length; i++) {
        if (!oldArray.includes(newArray[i])) {
          movedStepId = newArray[i]
          newIndex = i
          return {
            movedStepId,
            oldIndex: -1,
            newIndex,
            isTransfer: true,
          }
        }
      }

      // Check for removed item
      for (let i = 0; i < oldArray.length; i++) {
        if (!newArray.includes(oldArray[i])) {
          // Item was removed - it moved elsewhere
          return {
            movedStepId: oldArray[i],
            oldIndex: i,
            newIndex: -1,
            isTransfer: true,
          }
        }
      }

      // Find reordered item (same items, different positions)
      for (let i = 0; i < newArray.length; i++) {
        if (oldArray[i] !== newArray[i]) {
          movedStepId = newArray[i]
          newIndex = i
          const oldIndex = oldArray.indexOf(movedStepId)
          return {
            movedStepId,
            oldIndex,
            newIndex,
            isTransfer: false,
          }
        }
      }

      throw new Error('no array change found')
    }

    function getAllBranchSteps(forkId: string, branchIndex: number): AnyStepRef[] {
      return getBranch(forkId, branchIndex).stepIds.map(id => get(id))
    }

    async function addBranch(forkId: string) {
      validateIsFork(forkId)
      forkBranches[forkId].push({
        seed: 0,
        stepIds: [],
        inputData: null,
      })
      return _forkBranchChanged(forkId)
    }

    async function _forkBranchChanged(forkId: string) {
      syncImageDataFromPrev(forkId)
      return resolveStep(forkId)
    }

    function duplicateBranch(forkId: string, branchIndex: number): number {
      validateIsFork(forkId)

      const branches = getBranches(forkId)

      const sourceBranch = getBranch(forkId, branchIndex)
      const newBranchIndex = branches.length

      // Add new empty branch
      branches.push({
        seed: sourceBranch.seed,
        stepIds: [],
        inputData: null,
      })

      // Duplicate each step in the source branch
      const stepIdMap = new Map<string, string>() // old ID -> new ID mapping

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

      // Invalidate the new branch (starting from first step if exists)
      if (branches[newBranchIndex].stepIds.length > 0) {
        _invalidateFromStep(branches[newBranchIndex].stepIds[0])
      }

      return newBranchIndex
    }

    async function removeBranch(forkId: string, branchIndex: number) {
      const branches = getBranches(forkId)

      // Remove rootSteps steps in the branch
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

      return _forkBranchChanged(forkId)
    }

    function getDescendants(stepId: string): AnyStepRef[] {
      const descendants: AnyStepRef[] = []
      const visited = new Set<string>([stepId]) // Mark root as visited
      const stack: string[] = []

      const rootStep: AnyStepRef = get(stepId)

      // Initialize stack with root's children
      if (stepIsFork(rootStep)) {
        const branches = getBranches(stepId)
        branches.forEach(branch => {
          branch.stepIds.forEach(branchStepId => stack.push(branchStepId))
        })
      } else {
        const next = getNext(stepId)
        if (next) stack.push(next.id)
      }

      // Now process descendants
      while (stack.length > 0) {
        const currentId = stack.pop()!

        if (visited.has(currentId)) continue
        visited.add(currentId)

        const step: AnyStepRef = get(currentId)
        descendants.push(step)

        if (stepIsFork(step)) {
          const branches = getBranches(currentId)
          branches.forEach(branch => {
            branch.stepIds.forEach(branchStepId => {
              if (!visited.has(branchStepId)) {
                stack.push(branchStepId)
              }
            })
          })
        } else {
          const next = getNext(currentId)
          if (next && !visited.has(next.id)) {
            stack.push(next.id)
          }
        }
      }

      return descendants
    }

    function getAncestors(stepId: string): AnyStepRef[] {
      const ancestors: AnyStepRef[] = []
      let currentId: string | null = stepId
      const visited = new Set<string>()

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const step: AnyStepRef = get(currentId)

        if (step.parentForkId) {
          const fork = get(step.parentForkId) as AnyStepRef
          ancestors.push(fork)
          currentId = fork.id
        } else {
          const prev = getPrev(currentId)
          if (prev) {
            ancestors.push(prev)
            currentId = prev.id
          } else {
            currentId = null
          }
        }
      }

      return ancestors
    }

    function getIndex(stepId: string) {
      const step = get(stepId)

      if (step.parentForkId) {
        // Step is in a branch
        const branches = getBranches(step.parentForkId)
        return branches[step.branchIndex!].stepIds.indexOf(stepId)
      }

      // Step is in main trunk
      return rootStepIds.value.indexOf(stepId)
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

    function validateIsFork(forkId: string) {
      getFork(forkId)
    }

    function remove(stepId: string): void {
      const step = get(stepId)
      const prevId = getPrev(stepId)?.id

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

      // Invalidate from previous step
      if (prevId) {
        _invalidateFromStep(prevId)
      } else if (step.parentForkId) {
        // If first step in branch, invalidate from fork
        _invalidateFromStep(step.parentForkId)
      } else {
        // First step in main trunk, invalidate next step if exists
        if (rootStepIds.value.length > 0) {
          _invalidateFromStep(rootStepIds.value[0])
        }
      }
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
        // Fork steps don't have a single "next" - return null
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

    function syncImageDataFromPrev(stepId: string) {
      const prev = getPrev(stepId)
      if (!prev) return

      _syncImageData(prev.id, stepId)
    }

    function syncImageDataToNext(stepId: string) {
      const step = get(stepId)

      if (stepIsFork(step)) {
        // Fork: sync to ALL branch heads
        const branches = forkBranches[stepId]
        if (branches) {
          branches.forEach(branch => {
            if (branch.stepIds.length > 0) {
              _syncImageData(stepId, branch.stepIds[0])
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
      const currentStep = get(stepId)
      const nextStep = get(nextStepId)
      logStepEvent(stepId, '_syncImageData', stepId, '->', nextStepId)

      if (nextStep === null) {
        return
      }

      let outputData: StepDataTypeInstance | null

      if (stepIsFork(currentStep)) {
        outputData = getBranch(currentStep.id, nextStep.branchIndex!).inputData
      } else {
        outputData = copyStepDataOrNull(currentStep.outputData)
      }

      if (!nextStep.handler) {
        nextStep.pendingInput = outputData
        return
      }

      nextStep.inputData = getHandler<T>(nextStep.id).prevOutputToInput(outputData)
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
      const step = get(stepId)
      if (!step.handler) {
        throw new Error('Step does not have handler yet')
      }
      return step.handler
    }

    function getStepContext(stepId: string): {
      array: string[],
      parentForkId: string | null,
      branchIndex: number | null
    } {
      const step = get(stepId)

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

    function moveAfter(stepId: string, afterStepId: string) {
      const afterContext = getStepContext(afterStepId)
      const afterIndex = afterContext.array.indexOf(afterStepId)

      if (afterIndex === -1) {
        throw new Error(`Step ${afterStepId} not found in its context`)
      }

      moveToContext(stepId, afterContext.parentForkId, afterContext.branchIndex, afterIndex + 1)
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
      const sourceContext = getStepContext(stepId)

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
        _invalidateFromStep(minStepId)
      } else {
        // Moving between contexts - invalidate both locations

        // Invalidate source context from the position where step was removed
        if (sourceContext.array.length > 0) {
          const sourceInvalidateIndex = Math.min(currentIndex, sourceContext.array.length - 1)
          _invalidateFromStep(sourceContext.array[sourceInvalidateIndex])
        } else if (sourceContext.parentForkId) {
          // Branch is now empty, invalidate from the fork
          _invalidateFromStep(sourceContext.parentForkId)
        }

        // Invalidate target context from the new position
        const targetInvalidateIndex = Math.min(newIndex, targetArray.length - 1)
        _invalidateFromStep(targetArray[targetInvalidateIndex])
      }
    }

    function invalidateAll() {
      if (!rootStepIds.value.length) {
        return
      }

      const firstStepId = rootStepIds.value[0]
      _invalidateFromStep(firstStepId)
    }

    function _invalidateFromStep(stepId: string) {
      syncImageDataFromPrev(stepId)
      // resolveStep triggers here
      syncImageDataToNext(stepId)
      invalidateStepFinalSeed(stepId)

      const step = get(stepId)

      if (stepIsFork(step)) {
        const branches = forkBranches[stepId]
        if (branches) {
          branches.forEach(branch => {
            if (branch.stepIds.length > 0) {
              _invalidateFromStep(branch.stepIds[0])
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

    const rootSteps = computed((): Step<AnyStepContext>[] => {
      return rootStepIds.value.map(id => get(id))
    })

    function isLast(stepId: string) {
      const step = get(stepId)

      if (step.parentForkId) {
        const branches = getBranches(step.parentForkId)
        const branch = branches[step.branchIndex!]
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

    async function resolveStep<T extends AnyStepContext>(stepId: string) {
      const step = get(stepId) as StepRef<T>
      let inputData = step.inputData

      step.isProcessing = true

      const startTime = performance.now()

      try {
        inputData ??= null

        const inputTypeErrors = validateInputDataFromPrev(step.id)
        if (inputTypeErrors.length) {
          inputData = null
        }
        if (inputData) {
          inputData = inputData.copy()
        }

        if (step.muted) {
          step.outputData = null
          step.outputData = inputData
          step.outputPreview = null
          step.validationErrors = []
          step.lastExecutionTimeMS = 0
        } else {
          let runnerSeed = stepSeeds[step.id]
          prng.setSeed(runnerSeed)

          // runner can be async or not
          const duration = performance.now() - startTime

          if (!step.config) {
            throw new Error(`Step ${stepId} has no config`)
          }

          let result: StepRunnerResult

          if (stepIsFork(step)) {
            const runner = step.handler!.run as ForkStepRunner<T>

            const output = runner({
              config: step.config,
              inputData: inputData,
              branchCount: getBranches(stepId).length,
            }) as ForkStepRunnerOutput<T['Input']>

            result = toForkStepRunnerResult(output)

          } else {
            const runner = step.handler!.run as NormalStepRunner<T>
            const output = runner({
              config: step.config,
              inputData: inputData,
            }) as NormalStepRunnerOutput<T['Input']>
            result = toNormalStepRunnerResult(output)
          }

          const { output, preview, validationErrors } = result

          logStepEvent(stepId, 'resolveStep', {
            output,
            preview,
            validationErrors,
            durationMs: duration.toFixed(2),
          })

          step.outputData = output
          step.outputPreview = preview
          step.validationErrors = [
            ...inputTypeErrors,
            ...validationErrors,
          ]
          step.lastExecutionTimeMS = duration
        }

        syncImageDataToNext(stepId)
      } finally {
        step.isProcessing = false
      }
    }

    function registerStep<T extends AnyStepContext>(
      stepId: string,
      handlerOptions: StepHandlerOptions<T>,
    ): {
      step: Step<T>,
      handler: IStepHandler<T>
    } {
      const step = get(stepId) as StepRef<T>

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
      if (!prev) {
        return []
      }

      const prevHandler = getHandler(prev.id)
      const currentHandler = getHandler(stepId)

      const hasInputTypes = currentHandler.inputDataTypes.length
      if (!hasInputTypes) {
        return []
      }

      return [
        ...currentHandler.validateInputType(prevHandler.outputDataType, currentHandler.inputDataTypes),
        ...currentHandler.validateInput(prev.outputData),
      ]
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

      if (rootStepIds.value.length === 0) {
        return leaves
      }

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

    function invalidateStepFinalSeed(stepId: string) {
      stepSeeds[stepId] = calculateSeed(stepId)
    }

    function calculateSeed(stepId: string) {
      const step = get(stepId)

      const stepSeed = step.seed
      let forkSeed = 0
      let branchSeed = 0

      if (step.parentForkId) {
        forkSeed = get(step.parentForkId).seed
        branchSeed = getBranch(step.parentForkId, step.branchIndex!).seed
      }
      return globalSeed.value + stepSeed + forkSeed + branchSeed
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
      setBranchSeed,
      getStepsAddableAfter,
      getAllBranchSteps,
      setStepSeed,
      setRootStepIds,
      setBranchStepIds,
      addBranch,
      removeBranch,
      duplicateBranch,
      getDescendants,
      getAncestors,
      get,
      duplicate,
      remove,
      moveAfter,
      rootSteps,
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
      stepLeaves,
    }
  },
  {
    persist: {
      key: 'steps',
    },
  })