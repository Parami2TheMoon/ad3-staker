import { ethers } from "hardhat";

const NFTAddress = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
const UniswapV3FactoryAddress = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const Goverance = '0x5a0350846f321524d0fBe0C6A94027E89bE23bE5';
const Frontend = '0x927fB96ae00b114825d5361B90A0D176a7DfA034'


async function main() {
    const factory = await ethers.getContractFactory("Ad3StakeManager");
    let contract = await factory.deploy(
        Goverance,
        UniswapV3FactoryAddress,
        NFTAddress
    );
    console.log(contract.address);
    console.log(contract.deployTransaction.hash);
    await contract.deployed();
    //await contract.setGoverance(Frontend);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
