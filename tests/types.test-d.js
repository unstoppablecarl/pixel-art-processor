import { describe, expectTypeOf, it } from 'vitest';
import { shallowReactive } from 'vue';
import { BitMask } from '../src/lib/step-data-types/BitMask';
import { NormalMap } from '../src/lib/step-data-types/NormalMap';
describe('basic type testing', async () => {
    it('StepContext types', () => {
        expectTypeOf().toEqualTypeOf(null);
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toExtend();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toExtend();
    });
    it('StepInputTypesToInstances', () => {
        function tester(options) {
            return {};
        }
        const result = tester({
            inputDataTypes: [BitMask, NormalMap],
        });
        expectTypeOf(result).toEqualTypeOf();
    });
    it('useStepHandler Config raw', () => {
        function tester(options) {
            return {
                config: options.config(),
            };
        }
        const result = tester({
            config: () => {
                return shallowReactive({
                    name: 'foo',
                });
            },
        });
        expectTypeOf(result.config).toEqualTypeOf();
    });
    it('useStepHandler Config StepContext', () => {
        function tester(options) {
            return {
                config: options.config(),
            };
        }
        const result = tester({
            config: () => {
                return shallowReactive({
                    name: 'foo',
                });
            },
        });
        expectTypeOf(result.config).toEqualTypeOf();
    });
});
