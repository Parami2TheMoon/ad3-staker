import { BigNumberish, BigNumber, Wallet } from 'ethers';
import bn from 'bignumber.js';
import { provider } from "../helpers/provider";
import {Ad3StakeManager, TestERC20} from '../../typechain';
import { isArray, isString } from 'lodash';


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

export const BN = BigNumber.from;
export const BNe = (n: BigNumberish, exponent: BigNumberish) => BN(n).mul(BN(10).pow(exponent));
export const BNe18 = (n: BigNumberish) => BNe(n, 18);

export const arrayWrap = (x: any) => {
    if (!isArray(x)) {
        return [x];
    } else {
        return x;
    }
}

export class ERC20Helper {
    ensureBalanceAndApprovals = async (
        account: Wallet,
        tokens: TestERC20 | Array<TestERC20>,
        balance: BigNumber,
        spender?: string
    ) => {
        for (let token of arrayWrap(tokens)) {
            await this.ensureBalance(account, token, balance);
            if (spender) {
                await this.ensureApproval(account, token, balance, spender);
            }
        }
    }

    ensureBalance = async (
        account: Wallet,
        token: TestERC20,
        balance: BigNumber
    ) => {
        const currentBalance = await token.balanceOf(account.address);
        if (currentBalance.lt(balance)) {
            await token.transfer(account.address, balance.sub(currentBalance));
        }
        return await token.balanceOf(account.address);
    }

    ensureApproval = async (
        account: Wallet,
        token: TestERC20,
        balance: BigNumber,
        spender: string
    ) => {
        const currentAllowance = await token.allowance(account.address, spender);
        if (currentAllowance.lt(balance)) {
            await token.connect(account).approve(spender, balance);
        }
    }
}

export function getTickSpacing(fee: FeeAmount): number {
    let tickSpacing: number;
    if (fee == FeeAmount.LOW) {
        tickSpacing = 10;
    } else if (fee == FeeAmount.MEDIUM) {
        tickSpacing = 60;
    } else {
        tickSpacing = 200;
    }
    return tickSpacing;
}

export function getMinTick(tickSpacing: number): number {
    return Math.ceil(-887272 / tickSpacing) * tickSpacing;
}

export function getMaxTick(tickSpacing: number): number {
    return Math.floor(887272 / tickSpacing) * tickSpacing;
}

export function getMaxLiquidityPerTick(tickSpacing: number): BigNumber {
    return BigNumber.from(2)
            .pow(128)
            .sub(1)
            .div((getMaxTick(tickSpacing) - getMinTick(tickSpacing)) / tickSpacing + 1);
}

export const blockTimestamp = async () => {
    const block = await provider.getBlock('latest');
    if (!block) {
        throw new Error('null block returned from provider');
    }
    return block.timestamp;
}

export const makeTimestamps = (
  n: number,
  duration: number = 1_000,
) => ({
  startTime: n + 100,
  endTime: n + 100 + duration,
})
