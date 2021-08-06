const { ethers, upgrades } = require('hardhat');

const Ad3StakeManager = '0x5277BF7BB3b97C719965e2B4C5239F0C41ee7392'

async function main() {
    const stakeFactory = await ethers.getContractFactory('Ad3StakeManager');
    const stakeManager = await upgrades.upgradeProxy(Ad3StakeManager, stakeFactory);
    console.log('Upgrade Ad3StakeManager') // 0x5277BF7BB3b97C719965e2B4C5239F0C41ee7392
    console.log(stakeManager.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
