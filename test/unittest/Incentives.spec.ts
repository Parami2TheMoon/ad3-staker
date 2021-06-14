import { ethers } from 'hardhat'
import { expect } from 'chai';

import { createFixtureLoader, provider } from "../helpers/provider";
import {
    BN,
    BNe18,
    ERC20Helper,
    FeeAmount,
    blockTimestamp,
    makeTimestamps
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


describe('unittest/Incentive', () => {
    const wallets = provider.getWallets();
    const totalReward = BNe18(100);
    const minPrice = BNe18(1);
    const maxPrice = BNe18(10);
    const erc20Helper = new ERC20Helper();
    const accounts = new AccountFixture(wallets, provider)
    const stakerOwner = accounts.stakerDeployer();
    const timeMachine = createTimeMachine(provider);
    const lpUser0 = accounts.lpUser0();
    const lpUser1 = accounts.lpUser1();
    let context: UniswapFixtureType;

    before('loader', async () => {
        loadFixture = createFixtureLoader(provider.getWallets(), provider)
    });

    beforeEach('create fixture loader', async () => {
        context = await loadFixture(UniswapFixture);
    });

    describe('createIncentive', async () => {
        let rewardToken: string;
        let pool01: string;
        let incentiveKey: any;

        beforeEach('setup', async () => {
            rewardToken = context.rewardToken.address
            pool01 = context.pool01;
            const {startTime, endTime} = makeTimestamps(await blockTimestamp());
            incentiveKey = {
                rewardToken: rewardToken,
                pool: pool01,
                startTime: startTime,
                endTime: endTime
            };
        });

        it('only owner can create incentive', async () => {
            await erc20Helper.ensureBalanceAndApprovals(
                stakerOwner,
                context.rewardToken,
                totalReward,
                context.staker.address
            );
            const _incentiveId = await context.testIncentiveId.compute(incentiveKey);
            const balanceOf = await context.rewardToken.balanceOf(stakerOwner.address);
            expect(balanceOf.toString()).to.equal(totalReward.toString());
            const allowance = await context.rewardToken.allowance(stakerOwner.address, context.staker.address);
            expect(allowance.toString()).to.equal(totalReward.toString());

            await context.staker.connect(stakerOwner).createIncentive(
                incentiveKey,
                totalReward,
                minPrice,
                maxPrice
            );
            const incentive = await context.staker.connect(stakerOwner).incentives(_incentiveId);
            expect(incentive).to.not.equal({});
        });

        it('not owner can not create incentive', async () => {
            await erc20Helper.ensureBalanceAndApprovals(
                lpUser0,
                context.rewardToken,
                totalReward,
                context.staker.address
            );
            const _incentiveId = await context.testIncentiveId.compute(incentiveKey);
            await expect(context.staker.connect(lpUser0).createIncentive(
                incentiveKey,
                totalReward,
                minPrice,
                maxPrice
            )).to.be.revertedWith('Only Owner');
        })

    });

    describe('createIncentive and cancelIncentive', () => {
        let rewardToken: string;
        let incentiveKey: any;
        let pool01: string;
        beforeEach('createIncentive', async () => {
            rewardToken = context.rewardToken.address
            pool01 = context.pool01;
            const {startTime, endTime} = makeTimestamps(await blockTimestamp());
            incentiveKey = {
                rewardToken: rewardToken,
                pool: pool01,
                startTime: startTime,
                endTime: endTime
            }
            await erc20Helper.ensureBalanceAndApprovals(
                stakerOwner,
                context.rewardToken,
                totalReward,
                context.staker.address
            );
            const _incentiveId = await context.testIncentiveId.compute(incentiveKey);
            await context.staker.connect(stakerOwner).createIncentive(
                incentiveKey,
                totalReward,
                minPrice,
                maxPrice
            );
        });

        it('only owner can cancel incentive', async () => {
            await expect(context.staker.connect(lpUser0).cancelIncentive(
                incentiveKey,
                lpUser1.address)).to.be.revertedWith('Only Owner');
        });

        it('cannot cancel incentive before endTime', async () => {
            await expect(context.staker.connect(stakerOwner).cancelIncentive(
                incentiveKey,
                lpUser1.address
            )).to.revertedWith('revert cannot cancel incentive before end time');
        });

        it('owner cancel incentive after endTime', async () => {
            let balanceOf = await context.rewardToken.balanceOf(lpUser1.address);
            expect(balanceOf.toString()).to.equal('0');
            await timeMachine.set(incentiveKey.endTime + 1);
            await context.staker.connect(stakerOwner).cancelIncentive(
                incentiveKey,
                lpUser1.address
            );
            balanceOf = await context.rewardToken.balanceOf(lpUser1.address);
            expect(balanceOf.toString()).to.equal(totalReward.toString());
        })
    });
})
