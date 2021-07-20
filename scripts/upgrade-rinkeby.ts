const { ethers, upgrades } = require('hardhat');

const Ad3StakeManager = '0x578B692e65BC2b21ea9e615869cdE7c4582EaC96'

async function main() {
    const stakeFactory = await ethers.getContractFactory('Ad3StakeManager');
    const stakeManager = await upgrades.upgradeProxy(Ad3StakeManager, stakeFactory);
    console.log('Upgrade Ad3StakeManager') // 0x578B692e65BC2b21ea9e615869cdE7c4582EaC96
    console.log(stakeManager.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
