import { ethers } from 'hardhat'
import { expect } from 'chai';
import assert = require('assert');

import { createFixtureLoader, provider } from "../helpers/provider";
import {
    BN,
    BNe18,
    ERC20Helper,
    FeeAmount,
    blockTimestamp,
    makeTimestamps,
    getTickSpacing,
    getMinTick,
    getMaxTick
} from '../helpers/constants';
import { createTimeMachine } from '../helpers/time';
import {
    UniswapFixtureType,
    UniswapFixture,
    mintPosition
} from "../helpers/fixtures";
import { AccountFixture } from "../helpers/accounts";
import {
    Ad3StakeManager,
    TestIncentiveId,
    TestERC20
} from "../../typechain";

type LoadFixtureFunction = ReturnType<typeof createFixtureLoader>;
let loadFixture: LoadFixtureFunction;


describe('unittest/StakeAndWithdraw', () => {
    const wallets = provider.getWallets();
    const totalReward = BNe18(100);
    const tickSpacing = getTickSpacing(FeeAmount.MEDIUM);
    const minTick = getMinTick(tickSpacing);
    const maxTick = getMaxTick(tickSpacing);
    const erc20Helper = new ERC20Helper();
    const accounts = new AccountFixture(wallets, provider)
    const gov = accounts.goverance();
    const timeMachine = createTimeMachine(provider);
    const lpUser0 = accounts.lpUser0();
    const lpUser1 = accounts.lpUser1();
    const amountDesired = BNe18(10);
    const recipient = lpUser0.address;

    const SAFE_TRANSFER_FROM_SIGNATURE = 'safeTransferFrom(address,address,uint256,bytes)';
    const INCENTIVE_KEY_ABI = 'tuple(address rewardToken, address pool, uint256 startTime, uint256 endTime)';

    let tokenId: string;
    let context: UniswapFixtureType;
    let rewardToken: string;
    let pool01: string;
    let incentiveKey: any;
    let incentiveId;

    before('loader', async () => {
        loadFixture = createFixtureLoader(provider.getWallets(), provider)
    });

    beforeEach('create fixture loader', async () => {
        context = await loadFixture(UniswapFixture);

        // setup IncentiveKey
        rewardToken = context.rewardToken.address
        pool01 = context.pool01;
        const {startTime, endTime} = makeTimestamps(await blockTimestamp());
        incentiveKey = {
            rewardToken: rewardToken,
            pool: pool01,
            startTime: startTime,
            endTime: endTime
        };
        incentiveId = await context.testIncentiveId.compute(incentiveKey);
        await erc20Helper.ensureBalanceAndApprovals(
            gov,
            context.rewardToken,
            totalReward,
            context.staker.address
        );
        await context.staker.connect(gov).createIncentive(
            incentiveKey,
            totalReward,
            minTick,
            maxTick
        );

        // setup NFT
        await erc20Helper.ensureBalanceAndApprovals(
            lpUser0,
            [context.token0, context.token1],
            amountDesired,
            context.nft.address
        );
        const tickSpacing = getTickSpacing(FeeAmount.MEDIUM);
        const tickLower = getMinTick(tickSpacing);
        const tickUpper = getMaxTick(tickSpacing);
        tokenId = await mintPosition(context.nft.connect(lpUser0), {
            token0: context.token0.address,
            token1: context.token1.address,
            fee: FeeAmount.MEDIUM,
            tickLower: tickLower,
            tickUpper: tickUpper,
            recipient: lpUser0.address,
            amount0Desired: amountDesired,
            amount1Desired: amountDesired,
            amount0Min: 0,
            amount1Min: 0,
            deadline: (await blockTimestamp()) + 1000
        });
        await context.nft.connect(lpUser0).approve(context.staker.address, tokenId);
    });

    describe('Stake', () => {
        it('emits the stake event', async () => {
            const { liquidity } = await context.nft.positions(tokenId)
            await timeMachine.set(incentiveKey.startTime + 1);
            await expect(context.staker.connect(lpUser0).depositToken(
                    incentiveKey,
                    tokenId
                ))
                .to.emit(context.staker, 'TokenStaked')
                .withArgs(incentiveId, tokenId, liquidity);
        });

        //it('unstake token', async () => {
            //await timeMachine.setAndMine(incentiveKey.startTime + 1);
            //await context.staker.connect(lpUser0).depositToken(incentiveKey, tokenId);
            //expect((await context.staker.deposits(tokenId)).numberOfStakes).to.eq(1);
            //expect((await context.staker.stakes(incentiveId, tokenId)).secondsPerLiquidityInsideInitialX128).to.gt(0);

            //await expect(context.staker.connect(lpUser0).unstakeToken(incentiveKey, tokenId))
                    //.to.emit(context.staker, 'TokenUnstaked')
                    //.withArgs(incentiveId, tokenId);
            //expect((await context.staker.deposits(tokenId)).numberOfStakes).to.eq(0);
            //expect((await context.staker.stakes(incentiveId, tokenId)).secondsPerLiquidityInsideInitialX128).to.eq(0);
        //});

        it('check struct with propely values', async () => {
            const liquidity = (await context.nft.positions(tokenId)).liquidity;
            const stakedBefore = await context.staker.stakes(incentiveId, tokenId);
            const nStakedBefore = (await context.staker.deposits(tokenId)).numberOfStakes;

            await timeMachine.set(incentiveKey.startTime + 1);
            await context.staker.connect(lpUser0).depositToken(incentiveKey, tokenId);
            const stakedAfter = await context.staker.stakes(incentiveId, tokenId);
            const nStakedAfter = (await context.staker.deposits(tokenId)).numberOfStakes;

            const secondsStakedBefore = stakedBefore.secondsPerLiquidityInsideInitialX128;
            const secondsStakedAfter = stakedAfter.secondsPerLiquidityInsideInitialX128;

            expect(nStakedBefore).to.eq(0);
            expect(secondsStakedBefore).to.eq(0);
            expect(secondsStakedAfter).to.gt(0);
            expect(nStakedAfter).to.eq(nStakedBefore.add(1));
        })

        describe('failed situations', async () => {
            it('sender is not nft owner', async () => {
                await timeMachine.set(incentiveKey.startTime + 1);
                await expect(context.staker.connect(lpUser1).depositToken(
                        incentiveKey,
                        tokenId
                    )).revertedWith('not approved');
            });
            it('incentive not started', async () => {
                await expect(context.staker.connect(lpUser0).depositToken(
                        incentiveKey,
                        tokenId
                    )).revertedWith('incentive not started');
            });
        });
    });

    //describe('Withdraw', async () => {
        //beforeEach(async () => {
            //await timeMachine.set(incentiveKey.startTime + 1);
            //await context.staker.connect(lpUser0).depositToken(incentiveKey, tokenId);
        //});
        //it('withdraw token', async () => {
            //expect((await context.staker.deposits(tokenId)).numberOfStakes).to.eq(1);
            //expect((await context.staker.stakes(incentiveId, tokenId)).secondsPerLiquidityInsideInitialX128).to.gt(0);

            //await expect(context.staker.connect(lpUser0).unstakeToken(incentiveKey, tokenId))
                    //.to.emit(context.staker, 'TokenUnstaked')
                    //.withArgs(incentiveId, tokenId);
            //expect((await context.staker.deposits(tokenId)).numberOfStakes).to.eq(0);
            //expect((await context.staker.stakes(incentiveId, tokenId)).secondsPerLiquidityInsideInitialX128).to.eq(0);
            //expect(await context.nft.ownerOf(tokenId)).to.eq(context.staker.address);

            //await context.staker.connect(lpUser0).withdrawToken(tokenId, lpUser0.address);
            //expect(await context.nft.ownerOf(tokenId)).to.eq(lpUser0.address);
        //});
    //});

    describe('getRewardAmount', async () => {
        beforeEach(async () => {
            await timeMachine.set(incentiveKey.startTime + 1);
            await context.staker.connect(lpUser0).depositToken(incentiveKey, tokenId);
        });

      it('returns correct rewardAmount and secondsInPeriodX128 for the position', async () => {
            const stake = await context.staker.stakes(incentiveId, tokenId);
            await provider.send('evm_mine', [incentiveKey.startTime + 100])

            const { reward, secondsInsideX128} = await context.staker.connect(lpUser0).getAccruedRewardInfo(incentiveKey, tokenId)
            const { tickLower, tickUpper } = await context.nft.positions(tokenId)
            const secondsPerLiquidityInsideX128 = (await context.pool.connect(lpUser0).snapshotCumulativesInside(tickLower, tickUpper))
                                                    .secondsPerLiquidityInsideX128

            const expectedSecondsInPeriod = secondsPerLiquidityInsideX128
                    .sub(stake.secondsPerLiquidityInsideInitialX128)
                    .mul(stake.liquidity);
            expect(secondsInsideX128).to.eq(expectedSecondsInPeriod);
        });

        it('returns 0 when cancel incentive', async () => {
            await timeMachine.set(incentiveKey.endTime + 1);
            await context.staker.connect(gov).cancelIncentive(incentiveKey, lpUser1.address);
            const { reward } = await context.staker.connect(lpUser0).getAccruedRewardInfo(incentiveKey, tokenId);
            expect(reward).to.eq(0);
        });

        it('returns 0 when incentive not exist', async() => {
            let incentiveKeyInner = {
                rewardToken: rewardToken,
                pool: pool01,
                startTime: 1,
                endTime: 2
            };
            const { reward } = await context.staker.connect(lpUser0).getAccruedRewardInfo(incentiveKeyInner, tokenId);
            expect(reward).to.eq(0);
        })
    });

    describe('claimReward', async () => {
        beforeEach(async () => {
            await provider.send('evm_mine', [incentiveKey.startTime + 100])
            await context.staker.connect(lpUser0).depositToken(incentiveKey, tokenId);
            await provider.send('evm_mine', [incentiveKey.startTime + 1000])
            //await timeMachine.set(incentiveKey.startTime + 100);
            //await context.staker.connect(lpUser0).unstakeToken(incentiveKey, tokenId);
        });
        it('emits RewardClaimed event', async () => {
            const { reward, secondsInsideX128} = await context.staker.connect(lpUser0).getAccruedRewardInfo(incentiveKey, tokenId)
            await expect(context.staker.connect(lpUser0).claimReward(incentiveKey, tokenId, recipient, reward))
                .to.emit(context.staker, 'RewardClaimed')
                .withArgs(recipient, reward);
        });
        it('transfer reward and check _rewards', async () => {
            const balance = await context.rewardToken.balanceOf(recipient);
            expect(await context.staker.rewards(rewardToken, recipient)).to.eq(0);
            const { reward, secondsInsideX128} = await context.staker.connect(lpUser0).getAccruedRewardInfo(incentiveKey, tokenId)
            await expect(context.staker.connect(lpUser0).claimReward(incentiveKey, tokenId, recipient, reward))
                .to.emit(context.staker, 'RewardClaimed')
                .withArgs(recipient, reward);
            expect(await context.rewardToken.balanceOf(recipient)).to.equal(balance.add(reward));
            expect(await context.staker.rewards(rewardToken, recipient)).to.gt(0);
        })
    })
});
