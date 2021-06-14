import { MockProvider } from 'ethereum-waffle';

type TimeSetterFunction = (timestamp: number) => Promise<void>;

type TimeSetters = {
    set: TimeSetterFunction,
    step: TimeSetterFunction,
    setAndMine: TimeSetterFunction
}

export const createTimeMachine = (provider: MockProvider): TimeSetters => {
    return {
        set: async (timestamp: number) => {
            await provider.send('evm_setNextBlockTimestamp', [timestamp]);
        },
        step: async (timestamp: number) => {
            await provider.send('evm_increaseTime', [timestamp]);
        },
        setAndMine: async (timestamp: number) => {
            await provider.send('evm_setNextBlockTimestamp', [timestamp]);
            await provider.send('evm_mine', []);
        }
    }
}
