import { BigNumberish, BigNumber } from 'ethers';
import bn from 'bignumber.js';

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

export const encodePriceSqrt = (reverse1: BigNumberish, reverse2: BigNumberish): BigNumber => {
    return BigNumber.from(
        new bn(reverse1.toString())
        .div(reverse2.toString())
        .sqrt()
        .multipliedBy(new bn(2).pow(96))
        .integerValue(3)
        .toString()
    );
}

export enum FeeAmount {
    LOW = 500,
    MEDIUM = 3000,
    HIGH = 10000
}

export const MAX_GAS_LIMIT = 12_450_000;
