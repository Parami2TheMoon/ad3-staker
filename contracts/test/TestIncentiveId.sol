// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../interfaces/IAd3StakeManager.sol";
import "../libraries/IncentiveId.sol";

contract TestIncentiveId {
    function compute(IAd3StakeManager.IncentiveKey memory key)
        public
        pure
        returns (bytes32)
    {
        return IncentiveId.compute(key);
    }
}
