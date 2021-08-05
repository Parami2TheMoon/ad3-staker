// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.7.6;

import "@uniswap/v3-core/contracts/libraries/FixedPoint128.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

library RewardMath {
    function computeRewardAmount(
        uint256 totalRewardUnclaimed,
        uint256 startTime,
        uint256 endTime,
        uint128 liquidity,
        uint160 secondsPerLiquidityInsideInitialX128,
        uint160 secondsPerLiquidityInsideX128
    ) internal view returns (uint256 reward, uint160 secondsInsideX128) {
        assert(block.timestamp >= startTime);
        assert(endTime > startTime);
        assert(endTime - startTime <= 5184000);

        secondsInsideX128 = uint160(
            SafeMath.mul(
                SafeMath.sub(
                    secondsPerLiquidityInsideX128,
                    secondsPerLiquidityInsideInitialX128
                ),
                liquidity
            )
        );

        uint256 totalSecondsUnclaimedX128 = SafeMath.mul(
            SafeMath.sub(Math.min(endTime, block.timestamp), startTime),
            FixedPoint128.Q128
        );

        reward = FullMath.mulDiv(
            totalRewardUnclaimed,
            secondsInsideX128,
            totalSecondsUnclaimedX128
        );
    }
}
