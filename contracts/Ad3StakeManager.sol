// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3MintCallback.sol";
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";

import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol';
import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';

import "./interfaces/IAd3StakeManager.sol";
import "./libraries/NFTPositionInfo.sol";
import './libraries/IncentiveId.sol';
import "./libraries/RewardCalculator.sol";


contract Ad3StakeManager is IAd3StakeManager, ReentrancyGuard
{
    using SafeMath for uint256;

    IUniswapV3Factory public immutable override factory;
    INonfungiblePositionManager public immutable override nonfungiblePositionManager;

    mapping(uint256 => Deposit) _deposits;
    mapping(bytes32 => mapping(uint256 => Stake)) _stakes;
    mapping(address => mapping(address => uint256)) _rewards;
    mapping(bytes32 => Incentive) public incentives;
    mapping(address => Range) _ranges;

    address public gov;
    address public nextgov;

    modifier onlyGov {
        require(msg.sender == gov, 'only gov');
        _;
    }

    modifier isAuthorizedForToken(uint256 tokenId) {
        require(msg.sender == nonfungiblePositionManager.ownerOf(tokenId), 'not approved');
        _;
    }

    constructor(
        address _gov,
        address _factory,
        address _nonfungiblePositionManager
    )
    {
        gov = _gov;
        factory = IUniswapV3Factory(_factory);
        nonfungiblePositionManager = INonfungiblePositionManager(_nonfungiblePositionManager);
    }

    function setGoverance(address _gov) external onlyGov {
        nextgov = _gov;
    }

    function acceptGoverance() external {
        require(msg.sender == nextgov);
        gov = msg.sender;
        nextgov = address(0);
    }

    function addRange(address pool, int24 tickLower, int24 tickUpper)
        external
        override
        onlyGov
    {
        Range storage range = _ranges[pool];
        if (range.pool != address(0)) {
            updateRange(pool, tickLower, tickUpper);
        } else {
            range.pool = pool;
            range.tickLower = tickLower;
            range.tickUpper = tickUpper;
            emit AddRange(pool, tickLower, tickUpper);
        }
    }

    function updateRange(address pool, int24 tickLower, int24 tickUpper) internal
    {
        Range storage range = _ranges[pool];
        require(pool == range.pool, 'pool does not match');
        range.pool = pool;
        range.tickLower = tickLower;
        range.tickUpper = tickUpper;
    }

    function checkRange(address pool) external override view returns (int24, int24)
    {
        Range memory range = _ranges[pool];
        require(pool == range.pool, 'pool does not match');
        return (range.tickLower, range.tickUpper);
    }

    function stakes(bytes32 incentiveId, uint256 tokenId)
        public
        view
        override
        returns (address stakeOwner, uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity)
    {
        Stake memory stake = _stakes[incentiveId][tokenId];
        stakeOwner = stake.owner;
        secondsPerLiquidityInsideInitialX128 = stake.secondsPerLiquidityInsideInitialX128;
        liquidity = stake.liquidity;
    }

    function deposits(uint256 tokenId)
        public
        view
        override
        returns (address recipient, uint256 numberOfStakes)
    {
        Deposit memory deposit = _deposits[tokenId];
        recipient = deposit.recipient;
        numberOfStakes = deposit.numberOfStakes;
    }

    function rewards(address rewardToken, address recipient)
        public
        view
        override
        returns (uint256 reward)
    {
        reward = _rewards[rewardToken][recipient];
    }

    function createIncentive(
        IncentiveKey memory key,
        uint256 reward,
        uint256 minPrice,
        uint256 maxPrice
    ) external override onlyGov
    {
        require(reward > 0, 'reward must be positive');
         require(
            block.timestamp <= key.startTime,
            'start time must be now or in the future'
        );
        require(
            key.startTime < key.endTime,
            'start time must be before end time'
        );

        bytes32 incentiveId = IncentiveId.compute(key);
        require(
            incentives[incentiveId].totalRewardUnclaimed == 0,
            'incentive already exists'
        );

        incentives[incentiveId] = Incentive({
            totalRewardUnclaimed: reward,
            totalSecondsClaimedX128: 0,
            minPrice: minPrice,
            maxPrice: maxPrice
        });

        // Owner transfer token to this contract
        TransferHelper.safeTransferFrom(
            address(key.rewardToken),
            msg.sender,
            address(this),
            reward
        );

        emit IncentiveCreated(
            key.rewardToken,
            key.pool,
            key.startTime,
            key.endTime,
            reward
        );
    }

    function cancelIncentive(IncentiveKey memory key, address recipient)
        external
        override
        onlyGov
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        Incentive memory incentive = incentives[incentiveId];
        uint256 rewardUnclaimed = incentive.totalRewardUnclaimed;
        require(rewardUnclaimed > 0, 'no refund available');
        require(
            block.timestamp > key.endTime,
            'cannot cancel incentive before end time'
        );

        // if any unclaimed rewards remain, and we're past the claim deadline, issue a refund
        incentives[incentiveId].totalRewardUnclaimed = 0;
        TransferHelper.safeTransfer(
            address(key.rewardToken),
            recipient,
            rewardUnclaimed
        );
        emit IncentiveCanceled(incentiveId, rewardUnclaimed);
    }

    /// @inheritdoc IERC721Receiver
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        require(
            msg.sender == address(nonfungiblePositionManager),
            'not a univ3 nft'
        );

        Deposit memory deposit = _deposits[tokenId];
        if (deposit.recipient == address(0)) {
            _deposits[tokenId] = Deposit({recipient: from, numberOfStakes: 0});
        } else {
            _deposits[tokenId].numberOfStakes = _deposits[tokenId].numberOfStakes.add(1);
        }

        emit TokenReceived(tokenId, from);
        if (data.length > 0) {
            IncentiveKey memory key = abi.decode(data, (IncentiveKey));
            _stakeToken(key, tokenId, from);
        }
        return this.onERC721Received.selector;
    }

    function depositToken(IncentiveKey memory key, uint256 tokenId)
        external
        override
        isAuthorizedForToken(tokenId)
    {
        nonfungiblePositionManager.safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            abi.encode(key)
        );
    }

    function _stakeToken(IncentiveKey memory key, uint256 tokenId, address from) internal {
        bytes32 incentiveId = IncentiveId.compute(key);
        Incentive memory incentive = incentives[incentiveId];

        require(block.timestamp >= key.startTime, 'incentive not started');
        require(block.timestamp <= key.endTime, 'incentive has ended');
        require(incentive.totalRewardUnclaimed > 0, 'non-existent incentive');

        (
            IUniswapV3Pool pool,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity
        ) = NFTPositionInfo.getPositionInfo(
                factory,
                nonfungiblePositionManager,
                tokenId
            );
        require(pool == key.pool, 'token pool is not incentive pool');
        require(liquidity > 0, 'can not stake token with 0 liquidity');

        _deposits[tokenId].numberOfStakes = _deposits[tokenId].numberOfStakes.add(1);
        (, uint160 secondsPerLiquidityInsideX128, ) =
            pool.snapshotCumulativesInside(tickLower, tickUpper);

        _stakes[incentiveId][tokenId] = Stake({
                secondsPerLiquidityInsideInitialX128: secondsPerLiquidityInsideX128,
                liquidity: liquidity,
                owner: from
            });

        emit TokenStaked(incentiveId, tokenId, liquidity);
    }

    function _updateReward(
        bytes32 incentiveId,
        uint256 tokenId,
        address rewardToken,
        address poolToken,
        uint256 reward,
        uint160 secondsInsideX128,
        int24 tickLower
    ) internal
    {
        (
            address stakeOwner,
            ,
        ) = stakes(incentiveId, tokenId);
        Range storage range = _ranges[poolToken];
        require(range.pool != address(0), 'pool address does not exist');
        if (range.tickLower < tickLower) {
            return;
        }

        incentives[incentiveId].totalSecondsClaimedX128 = uint160(
                SafeMath.add(incentives[incentiveId].totalSecondsClaimedX128,
                             secondsInsideX128));
        incentives[incentiveId].totalRewardUnclaimed = incentives[incentiveId].totalRewardUnclaimed.sub(reward);
        _rewards[rewardToken][stakeOwner] = _rewards[rewardToken][stakeOwner].add(reward);
    }

    function updateReward(IncentiveKey memory key, uint256 tokenId)
        public
        nonReentrant
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        Incentive memory incentive = incentives[incentiveId];

        (
            ,
            uint160 secondsPerLiquidityInsideInitialX128,
            uint128 liquidity
        ) = stakes(incentiveId, tokenId);

        if (incentive.totalRewardUnclaimed > 0) {
            (, , , , , int24 tickLower, int24 tickUpper, , , , , ) =
                nonfungiblePositionManager.positions(tokenId);

            (, uint160 secondsPerLiquidityInsideX128, ) =
                key.pool.snapshotCumulativesInside(tickLower, tickUpper);
            (uint256 reward, uint160 secondsInsideX128) =
                RewardCalculator.computeRewardAmount(
                    incentive.totalRewardUnclaimed,
                    incentive.totalSecondsClaimedX128,
                    key.startTime,
                    key.endTime,
                    liquidity,
                    secondsPerLiquidityInsideInitialX128,
                    secondsPerLiquidityInsideX128
                );
            _updateReward(
                incentiveId,
                tokenId,
                address(key.rewardToken),
                address(key.pool),
                reward,
                secondsInsideX128,
                tickLower
            );
        }
    }

    function unstakeToken(IncentiveKey memory key, uint256 tokenId)
        external
        override
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        (
            address stakeOwner,
            ,
            uint128 liquidity
        ) = stakes(incentiveId, tokenId);

        require(_deposits[tokenId].recipient == msg.sender, 'only owner can unstake token');
        require(stakeOwner == msg.sender, 'only owner can unstake token');
        require(liquidity > 0, 'stake does not exist');

        updateReward(key, tokenId);
        _deposits[tokenId].numberOfStakes = _deposits[tokenId].numberOfStakes.sub(1);
        _stakes[incentiveId][tokenId].secondsPerLiquidityInsideInitialX128 = 0;
        _stakes[incentiveId][tokenId].liquidity = 0;

        emit TokenUnstaked(incentiveId, tokenId);
    }

    function withdrawToken(IncentiveKey memory key, uint256 tokenId, address to)
        external
        override
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        address stakeOwner = _stakes[incentiveId][tokenId].owner;
        require(_deposits[tokenId].recipient == msg.sender, 'only owner can withdraw token');
        require(_deposits[tokenId].numberOfStakes == 0, 'nonzero number of stakes');
        require(stakeOwner == msg.sender, 'only owner can withdraw token');

        delete _deposits[tokenId];
        delete _stakes[incentiveId][tokenId];
        nonfungiblePositionManager.safeTransferFrom(address(this), to, tokenId);

        emit TokenWithdraw(incentiveId, tokenId, to);
    }

    function getRewardAmount(IncentiveKey memory key, uint256 tokenId)
        external
        override
        view
        returns (uint256 reward, uint160 secondsInsideX128)
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        (
            ,
            uint160 secondsPerLiquidityInsideInitialX128,
            uint128 liquidity
        ) = stakes(incentiveId, tokenId);

        Incentive memory incentive = incentives[incentiveId];

        if (incentive.totalRewardUnclaimed > 0) {
            (, , , , , int24 tickLower, int24 tickUpper, , , , , ) =
                nonfungiblePositionManager.positions(tokenId);

            (, uint160 secondsPerLiquidityInsideX128, ) =
                key.pool.snapshotCumulativesInside(tickLower, tickUpper);

            (reward, secondsInsideX128) =
                RewardCalculator.computeRewardAmount(
                    incentive.totalRewardUnclaimed,
                    incentive.totalSecondsClaimedX128,
                    key.startTime,
                    key.endTime,
                    liquidity,
                    secondsPerLiquidityInsideInitialX128,
                    secondsPerLiquidityInsideX128
                );

            Range memory range = _ranges[address(key.pool)];
            require(range.pool != address(0), 'pool address does not exist');
            if (range.tickLower < tickLower) {
                reward = 0;
            }
        }
    }

    function claimReward(address rewardToken, address recipient)
        external
        override
        nonReentrant
    {
        uint256 reward = _rewards[rewardToken][msg.sender];
        require(reward > 0, 'non reward can be claim');
        _rewards[rewardToken][msg.sender] = 0;
        TransferHelper.safeTransfer(rewardToken, recipient, reward);

        emit RewardClaimed(rewardToken, recipient, reward);
    }
}
