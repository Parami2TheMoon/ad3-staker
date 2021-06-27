// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';

import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';

interface IAd3StakeManager is IERC721Receiver {

    struct IncentiveKey {
        IERC20 rewardToken;
        IUniswapV3Pool pool;
        uint256 startTime;
        uint256 endTime;
    }

    struct Stake {
        uint160 secondsPerLiquidityInsideInitialX128;
        uint128 liquidity;
        address owner;
    }

    struct Incentive {
        uint256 totalRewardUnclaimed;
        uint160 totalSecondsClaimedX128;
        uint256 minPrice;
        uint256 maxPrice;
    }

    struct Deposit {
        address recipient;
        uint256 numberOfStakes;
    }

    struct Range {
        address pool;
        int24 tickLower;
        int24 tickUpper;
    }

    function addRange(address pool, int24 tickLower, int24 tickUpper) external;
    function checkRange(address pool) external view returns (int24, int24);

    function factory() external view returns (IUniswapV3Factory);

    function nonfungiblePositionManager()
        external
        view
        returns (INonfungiblePositionManager);

    function stakes(bytes32 incentiveId, uint256 tokenId)
        external
        view
        returns (
            address stakeOwner,
            uint160 secondsPerLiquidityInsideInitialX128,
            uint128 liquidity
        );

    function deposits(uint256 tokenId)
        external
        view
        returns (
            address recipient,
            uint256 numberOfStakes
        );

    function rewards(address rewardToken, address owner)
        external
        view
        returns (uint256 rewardsOwed);

    function createIncentive(
        IncentiveKey memory key,
        uint256 reward,
        uint256 minPrice,
        uint256 maxPrice
    ) external;

    function depositToken(uint256 tokenId) external;

    function cancelIncentive(IncentiveKey memory key, address recipient) external;

    function stakeToken(IncentiveKey memory key, uint256 tokenId) external;

    function depositAndStakeToken(IncentiveKey memory key, uint256 tokenId) external;

    function withdrawToken(IncentiveKey memory key, uint256 tokenId, address to) external;

    function unstakeToken(IncentiveKey memory key, uint256 tokenId) external;

    function claimReward(address rewardToken, address recipient) external;

    function getRewardAmount(IncentiveKey memory key, uint256 tokenId) external view returns (uint256, uint160);

    event IncentiveCreated(
        IERC20 indexed rewardToken,
        IUniswapV3Pool indexed pool,
        uint256 startTime,
        uint256 endTime,
        uint256 reward
    );

    event IncentiveCanceled(bytes32 indexed incentiveId, uint256 rewardUnclaimed);

    event TokenReceived(uint256 indexed tokenId, address indexed owner);

    event TokenWithdraw(bytes32 indexed incentiveId, uint256 indexed tokenId, address to);

    event TokenStaked(
        bytes32 indexed incentiveId,
        uint256 indexed tokenId,
        uint128 liquidity
    );

    event TokenUnstaked(bytes32 indexed incentiveId, uint256 indexed tokenId);

    event RewardClaimed(address indexed rewardToken, address indexed recipient, uint256 reward);

    event AddRange(address indexed poolToken, int24 indexed tickLower, int24 indexed tickUpper);
}
