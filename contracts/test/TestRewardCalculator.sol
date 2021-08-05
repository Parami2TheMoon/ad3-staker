// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

import "../interfaces/IAd3StakeManager.sol";
import "../libraries/RewardMath.sol";

contract TestRewardMath {
    function computeRewardAmount(
        uint256 totalRewardUnclaimed,
        uint160 totalSecondsClaimedX128,
        uint256 startTime,
        uint256 endTime,
        uint128 liquidity,
        uint160 secondsPerLiquidityInsideAccruedX128,
        uint160 secondsPerLiquidityInsideX128
    ) public view returns (uint256 reward, uint160 secondsInsideX128) {
        (reward, secondsInsideX128) = RewardMath.computeRewardAmount(
            totalRewardUnclaimed,
            totalSecondsClaimedX128,
            startTime,
            endTime,
            liquidity,
            secondsPerLiquidityInsideAccruedX128,
            secondsPerLiquidityInsideX128
        );
    }
}
