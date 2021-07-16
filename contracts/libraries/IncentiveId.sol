// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma abicoder v2;

import "../interfaces/IAd3StakeManager.sol";

library IncentiveId {
    function compute(IAd3StakeManager.IncentiveKey memory key)
        internal
        pure
        returns (bytes32 incentiveId)
    {
        return keccak256(abi.encode(key));
    }
}
