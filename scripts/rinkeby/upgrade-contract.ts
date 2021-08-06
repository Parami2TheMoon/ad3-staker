const { ethers, upgrades } = require('hardhat');

const Ad3StakeManager = '0xB6987F36D4189eC1ab2A5dC1bf212B03f69BcFe3'

async function main() {
    const stakeFactory = await ethers.getContractFactory('Ad3StakeManager');
    const stakeManager = await upgrades.upgradeProxy(Ad3StakeManager, stakeFactory);
    console.log('Upgrade Ad3StakeManager') // 0xB6987F36D4189eC1ab2A5dC1bf212B03f69BcFe3
    console.log(stakeManager.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
