import { ethers } from 'hardhat'
import { expect } from 'chai';

import { AccountFixture } from '../helpers/accounts';
import { createFixtureLoader, provider } from "../helpers/provider";
import { UniswapFixtureType, UniswapFixture } from "../helpers/fixtures";
import { Ad3StakeManager } from "../../typechain";


describe("unittest/Deployment", () => {
    let context: UniswapFixtureType;
    const wallets = provider.getWallets();
    beforeEach('create fixture loader', async () => {
        let loadFixture = createFixtureLoader(wallets, provider);
        context = await loadFixture(UniswapFixture);
    });

    it('deploy and has an address', async () => {
        const stakerFactory = await ethers.getContractFactory('Ad3StakeManager');
        const staker = (await stakerFactory.deploy(
            context.factory.address,
            context.nft.address
        )) as Ad3StakeManager;
        expect(staker.address).to.be.a.string;
    });

    it('verify immutable variables', async () => {
        const wallets = provider.getWallets();
        const stakerFactory = await ethers.getContractFactory('Ad3StakeManager');
        const staker = (await stakerFactory.deploy(
            context.factory.address,
            context.nft.address
        )) as Ad3StakeManager;

        expect(await staker.factory()).to.equal(context.factory.address, 'factory address does not match');
        expect(await staker.nonfungiblePositionManager()).to.equal(context.nft.address, 'nft address does not match');
        const owner = await staker.owner();
        expect(owner).to.equal(wallets[0].address, `owner address does not match ${wallets[0].address} != ${owner}`);
    })

    it('verify staker deployer', async () => {
        const owner = await context.staker.owner();
        const deployer = new AccountFixture(wallets, provider).stakerDeployer();
        expect(owner).to.equal(deployer.address, `owner address does not match ${deployer.address}`);
    })
});
