import Web3 from "web3";
import {Contract} from "ethers";
import { JsonRpcProvider } from '@ethersproject/providers'
import { HttpProvider } from "web3/providers";
import MasterAbi from "../../artifacts/contracts/Ad3StakeManager.sol/Ad3StakeManager.json";
function init() {
    const web3 = new Web3();
    const contract= new web3.eth.Contract(MasterAbi.abi as any,'0x18cC8771066450751b8816CEdC10E1889cFcD9c0')
    const res= contract.methods.getAccruedRewardInfo({
        "rewardToken": "0xaa54f12feecf6653b82a297b77a1b577d4a13666",
        "pool": "0x2d816da4efb86ebfee6882ce95a40ab83ab9d11f",
        "startTime": 1636601435,
        "endTime": 1951983617
    }, 10218).call()
    console.log(res);
}

function main(){
    init();
}