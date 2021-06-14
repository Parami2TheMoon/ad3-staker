import { ethers } from 'hardhat'
import { expect } from 'chai';
import { MockProvider } from 'ethereum-waffle';

import { createFixtureLoader, provider } from "../helpers/provider";
import { BN, BNe18, ERC20Helper, FeeAmount } from '../helpers/constants';
import { createTimeMachine } from '../helpers/time';
import { UniswapFixtureType, UniswapFixture, mintPosition } from "../helpers/fixtures";
import { AccountFixture } from "../helpers/accounts";
import {
    Ad3StakeManager,
    TestIncentiveId,
    TestERC20,
    INonfungiblePositionManager,
    IUniswapV3Pool,
} from "../../typechain";
import { ISwapRouter } from '../../types/ISwapRouter'


//export class StakerHelper {
    //DEFAULT_INCENTIVE_DURATION = 2_000
    //DEFAULT_CLAIM_DURATION = 1_000
    //DEFAULT_LP_AMOUNT = BNe18(1000)
    //DEFAULT_FEE_AMOUNT = FeeAmount.MEDIUM

    //constructor({
        //provider,
        //staker,
        //nft,
        //router,
        //accounts,
        //testIncentiveId
    //}: {
        //accounts: AccountFixture
        //provider: MockProvider
        //staker: Ad3StakeManager
        //nft: INonfungibllePositionManager
        //router: ISwapRouter
        //pool: IUniswapV3Pool
        //testIncentiveId: TestIncentiveId
    //}) {
        //this.accounts = accounts;
        //this.provider = provider;
        //this.staker = staker;
        //this.nft = nft;
        //this.router = router;
        //this.pool = pool;
        //this.testIncentiveId = testIncentiveId;
    //}

    //async function getIncentiveId()
//}
