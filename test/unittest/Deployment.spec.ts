import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai';

import { AccountFixture } from '../helpers/accounts';
import { createFixtureLoader, provider } from "../helpers/provider";
import { UniswapFixtureType, UniswapFixture } from "../helpers/fixtures";
import { Ad3StakeManager } from "../../typechain";


describe("unittest/Deployment", () => {
    let context: UniswapFixtureType;
    const wallets = provider.getWallets();
    const gov = new AccountFixture(wallets, provider).goverance();
    beforeEach('create fixture loader', async () => {
        let loadFixture = createFixtureLoader(wallets, provider);
        context = await loadFixture(UniswapFixture);
    });

    it('deploy upgradeable and has an address', async () => {
        const stakerFactory = await ethers.getContractFactory('Ad3StakeManager');
        const staker = (await upgrades.deployProxy(
            stakerFactory,
            [gov.address, context.factory.address, context.nft.address])) as Ad3StakeManager
        expect(staker.address).to.be.a.string;
    });

    it('verify immutable variables', async () => {
        const wallets = provider.getWallets();
        const stakerFactory = await ethers.getContractFactory('Ad3StakeManager');
        const staker = (await upgrades.deployProxy(
            stakerFactory,
            [gov.address, context.factory.address, context.nft.address])) as Ad3StakeManager

        expect(await staker.factory()).to.equal(context.factory.address, 'factory address does not match');
        expect(await staker.nonfungiblePositionManager()).to.equal(context.nft.address, 'nft address does not match');
    })
});
