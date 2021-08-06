// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";

/// @title Uniswap V3 Staker Interface
/// @notice Allows staking nonfungible liquidity tokens in exchange for reward tokens
interface IAd3StakeManager is IERC721Receiver {
    /// @param rewardToken The token being distributed as a reward
    /// @param pool The Uniswap V3 pool
    /// @param startTime The time when the incentive program begins
    /// @param endTime The time when rewards stop accruing
    struct IncentiveKey {
        address rewardToken;
        IUniswapV3Pool pool;
        uint256 startTime;
        uint256 endTime;
    }

    /// @notice Represents a staked liquidity NFT
    struct Stake {
        address owner;
        uint128 liquidity;
        uint160 secondsPerLiquidityInsideInitialX128;
        uint160 secondsPerLiquidityInsideAccruedX128;
    }

    /// @notice Represents a staking incentive
    struct Incentive {
        uint256 totalRewardUnclaimed;
        uint160 totalSecondsClaimedX128;
        uint96 numberOfStakes;
        int24 minTick;
        int24 maxTick;
    }

    /// @notice Represents the deposit of a liquidity NFT
    struct Deposit {
        address owner;
        uint96 numberOfStakes;
        int24 tickLower;
        int24 tickUpper;
    }

    function updateRange(
        IncentiveKey memory key,
        int24 tickLower,
        int24 tickUpper
    ) external;

    /// @notice The Uniswap V3 Factory
    function factory() external view returns (IUniswapV3Factory);

    /// @notice The nonfungible position manager with which this staking contract is compatible
    function nonfungiblePositionManager()
        external
        view
        returns (INonfungiblePositionManager);

    /// @notice Represents a staking information
    /// @param incentiveId The ID of the incentive for which the token is staked
    /// @param tokenId The ID of the staked token
    /// @return owner The owner of stake NFT
    /// @return liquidity The amount of liquidity in the NFT as of the last time the rewards were computed
    /// @return secondsPerLiquidityInsideInitialX128 secondsPerLiquidity represented as a UQ32.128
    /// @return secondsPerLiquidityInsideAccruedX128 secondsPerLiquidity represented as a UQ32.128
    function stakes(bytes32 incentiveId, uint256 tokenId)
        external
        view
        returns (
            address owner,
            uint128 liquidity,
            uint160 secondsPerLiquidityInsideInitialX128,
            uint160 secondsPerLiquidityInsideAccruedX128
        );

    /// @notice Represents a staking incentive
    /// @param incentiveId The ID of the incentive computed from its parameters
    /// @return totalRewardUnclaimed The amount of reward token not yet claimed by users
    /// @return totalSecondsClaimedX128 Total liquidity-seconds claimed, represented as a UQ32.128
    /// @return numberOfStakes The count of deposits that are currently staked for the incentive
    /// @return minTick The minimum tick of the range
    /// @return maxTick The maximum tick of the range
    function incentives(bytes32 incentiveId)
        external
        view
        returns (
            uint256 totalRewardUnclaimed,
            uint160 totalSecondsClaimedX128,
            uint96 numberOfStakes,
            int24 minTick,
            int24 maxTick
        );

    /// @notice Returns information about a deposited NFT
    /// @return owner The owner of the deposited NFT
    /// @return numberOfStakes Counter of how many incentives for which the liquidity is staked
    /// @return tickLower The lower tick of the range
    /// @return tickUpper The upper tick of the range
    function deposits(uint256 tokenId)
        external
        view
        returns (
            address owner,
            uint96 numberOfStakes,
            int24 tickLower,
            int24 tickUpper
        );

    /// @notice Returns amounts of reward tokens owed to a given address according to the last time all stakes were updated
    /// @param rewardToken The token for which to check rewards
    /// @param recipient The owner for which the rewards owed are checked
    /// @return rewardsOwed The amount of the reward token claimable by the owner
    function rewards(address rewardToken, address recipient)
        external
        view
        returns (uint256 rewardsOwed);

    /// @notice Returns numbers of user staking tokenId
    /// @param to The address for whom stake in contract
    /// @return index The index of tokenId set
    function getUserTokenIdCount(address to)
        external
        view
        returns (uint256 index);

    /// @notice Return tokenId of user index
    /// @param to The address for whom stake in this contract
    /// @param index The index of tokenId set
    /// @return tokenId
    function getTokenId(address to, uint256 index)
        external
        view
        returns (uint256 tokenId);

    /// @notice Returns numbers of staking tokenId
    /// @return index The index of tokenId set
    function getTokenIdCount() external view returns (uint256 index);

    /// @notice Return tokenId of index
    /// @param index The index of tokenId set
    /// @return tokenId
    function getTokenId(uint256 index) external view returns (uint256 tokenId);

    /// @notice Creates a new liquidity mining incentive program
    /// @param key Details of the incentive to create
    /// @param reward The amount of reward tokens to be distributed
    /// @param minTick The minimum tick of the range can get reward
    /// @param maxTick The maximum tick of the range can get reward
    function createIncentive(
        IncentiveKey memory key,
        uint256 reward,
        int24 minTick,
        int24 maxTick
    ) external;

    /// @notice Cancel an incentive after the incentive end time has passed and all stakes have been withdrawn
    /// @param key Details of the incentive to end
    /// @param refundee The remaining reward tokens when the incentive is ended
    function cancelIncentive(IncentiveKey memory key, address refundee)
        external;

    function depositToken(IncentiveKey memory key, uint256 tokenId) external;

    /// @notice Unstakes a Uniswap V3 LP token
    /// @param key The key of the incentive for which to unstake the NFT
    /// @param tokenId The ID of the token to unstake
    /// @param to The address where the LP token will be sent
    function unstakeToken(
        IncentiveKey memory key,
        uint256 tokenId,
        address to
    ) external;

    /// @notice Transfers `amountRequested` of accrued `rewardToken` rewards from the contract to the recipient `to`
    /// @param key Details of the incentive to create
    /// @param tokenId The ID of the token to unstake
    /// @param to The address where claimed rewards will be sent to
    /// @param amountRequested The amount of reward tokens to claim. Claims entire reward amount if set to 0.
    function claimReward(
        IncentiveKey memory key,
        uint256 tokenId,
        address to,
        uint256 amountRequested
    ) external;

    function getAccruedRewardInfo(IncentiveKey memory key, uint256 tokenId)
        external
        view
        returns (
            uint256,
            uint160,
            uint160
        );

    /// @notice Event emitted when a liquidity mining incentive has been created
    /// @param rewardToken The token address being distributed as a reward
    /// @param pool The Uniswap V3 pool
    /// @param startTime The time when the incentive program begins
    /// @param endTime The time when rewards stop accruing
    /// @param reward The amount of reward tokens to be distributed
    event IncentiveCreated(
        address indexed rewardToken,
        IUniswapV3Pool indexed pool,
        uint256 startTime,
        uint256 endTime,
        uint256 reward
    );

    /// @notice Event that can be emitted when a liquidity mining incentive has ended
    /// @param incentiveId The incentive which is ending
    /// @param rewardUnclaimed The amount of reward tokens refunded
    event IncentiveCanceled(
        bytes32 indexed incentiveId,
        uint256 rewardUnclaimed
    );

    event TokenReceived(uint256 indexed tokenId, address indexed owner);

    /// @notice Event emitted when a Uniswap V3 LP token has been staked
    /// @param incentiveId The incentive in which the token is staking
    /// @param tokenId The unique identifier of an Uniswap V3 LP token
    /// @param liquidity The amount of liquidity staked
    event TokenStaked(
        bytes32 indexed incentiveId,
        uint256 indexed tokenId,
        uint128 liquidity
    );

    /// @notice Event emitted when a Uniswap V3 LP token has been unstaked
    /// @param incentiveId The incentive in which the token is staking
    /// @param tokenId The unique identifier of an Uniswap V3 LP token
    event TokenUnstaked(bytes32 indexed incentiveId, uint256 indexed tokenId);

    /// @notice Event emitted when a reward token has been claimed
    /// @param to The address where claimed rewards were sent to
    /// @param reward The amount of reward tokens claimed
    event RewardClaimed(address indexed to, uint256 indexed reward);
}
