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


describe('unittest/Deposit', () => {
    const wallets = provider.getWallets();
    const totalReward = BNe18(100);
    const tickSpacing = getTickSpacing(FeeAmount.MEDIUM);
    const minTick = getMinTick(tickSpacing);
    const maxTick = getMaxTick(tickSpacing);
    const erc20Helper = new ERC20Helper();
    const accounts = new AccountFixture(wallets, provider)
    const stakerOwner = accounts.stakerDeployer();
    const timeMachine = createTimeMachine(provider);
    const lpUser0 = accounts.lpUser0();
    const gov = accounts.goverance();
    const amountDesired = BNe18(10);
    const recipient = lpUser0.address;

    let tokenId: string;
    let context: UniswapFixtureType;

    before('loader', async () => {
        loadFixture = createFixtureLoader(provider.getWallets(), provider)
    });

    beforeEach('create fixture loader', async () => {
        context = await loadFixture(UniswapFixture);
    });

    describe('depositToken', () => {
        let rewardToken: string;
        let pool01: string;
        let incentiveKey: any;

        beforeEach(async () => {
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

            rewardToken = context.rewardToken.address;
            pool01 = context.pool01;
            const { startTime, endTime } = makeTimestamps(await blockTimestamp());
            await erc20Helper.ensureBalanceAndApprovals(
                gov,
                context.rewardToken,
                totalReward,
                context.staker.address
            );
            incentiveKey = {
                rewardToken: rewardToken,
                pool: pool01,
                startTime: startTime,
                endTime: endTime
            };
            await context.staker.connect(gov).createIncentive(
                incentiveKey,
                totalReward,
                minTick,
                maxTick
            );
        })
        it('emit a Deposit event', async () => {
            await timeMachine.setAndMine(incentiveKey.startTime + 1);
            await expect(context.staker.connect(lpUser0).depositToken(incentiveKey, tokenId))
                    .to.emit(context.staker, 'TokenReceived')
                    .withArgs(tokenId, lpUser0.address)
        });

        it('transfer ownership of tokenId', async () => {
            expect(await context.nft.ownerOf(tokenId)).to.eq(lpUser0.address);
            await timeMachine.setAndMine(incentiveKey.startTime + 1);
            await context.staker.connect(lpUser0).depositToken(incentiveKey, tokenId);
            expect(await context.nft.ownerOf(tokenId)).to.eq(context.staker.address);
        });

        it('sets owner and maintains numberOfStakes at 0', async () => {
            await timeMachine.setAndMine(incentiveKey.startTime + 1);
            await context.staker.connect(lpUser0).depositToken(incentiveKey, tokenId);
            const deposit = await context.staker.deposits(tokenId)
            expect(deposit.owner).to.eq(lpUser0.address)
            expect(deposit.numberOfStakes).to.eq(1)
        });
    })
});
