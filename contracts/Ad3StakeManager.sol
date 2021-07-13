// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3MintCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";

import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

import "./interfaces/IAd3StakeManager.sol";
import "./libraries/NFTPositionInfo.sol";
import "./libraries/IncentiveId.sol";
import "./libraries/RewardMath.sol";

contract Ad3StakeManager is IAd3StakeManager, ReentrancyGuard {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    IUniswapV3Factory public immutable override factory;
    INonfungiblePositionManager
        public immutable
        override nonfungiblePositionManager;

    /// @dev deposits[tokenId] => Deposit
    mapping(uint256 => Deposit) public override deposits;

    /// @dev stakes[incentiveId][tokenId] => Stake
    mapping(bytes32 => mapping(uint256 => Stake)) private _stakes;

    /// @dev rewards[rewardToken][owner] => uint256
    mapping(address => mapping(address => uint256)) public override rewards;

    /// @dev bytes32 refers to the return value of IncentiveId.compute
    mapping(bytes32 => Incentive) public override incentives;

    mapping(address => EnumerableSet.UintSet) private _userTokenIds;
    EnumerableSet.UintSet private _tokenIds;

    address public gov;
    address public nextgov;

    modifier onlyGov {
        require(msg.sender == gov, "only gov");
        _;
    }

    modifier isAuthorizedForToken(uint256 tokenId) {
        require(
            msg.sender == nonfungiblePositionManager.ownerOf(tokenId),
            "not approved"
        );
        _;
    }

    constructor(
        address _gov,
        address _factory,
        address _nonfungiblePositionManager
    ) {
        gov = _gov;
        factory = IUniswapV3Factory(_factory);
        nonfungiblePositionManager = INonfungiblePositionManager(
            _nonfungiblePositionManager
        );
    }

    function setGoverance(address _gov) external onlyGov {
        nextgov = _gov;
    }

    function acceptGoverance() external {
        require(msg.sender == nextgov);
        gov = msg.sender;
        nextgov = address(0);
    }

    function updateRange(
        IncentiveKey memory key,
        int24 tickLower,
        int24 tickUpper
    ) external override onlyGov {
        Incentive storage incentive = incentives[IncentiveId.compute(key)];
        incentive.minTick = tickLower;
        incentive.maxTick = tickUpper;
    }

    function getUserTokenIdCount(address to)
        external
        view
        override
        returns (uint256)
    {
        return _userTokenIds[to].length();
    }

    function getTokenId(address to, uint256 index)
        external
        view
        override
        returns (uint256 tokenId)
    {
        require(
            index < _userTokenIds[to].length(),
            "overflow tokenId set length"
        );
        return _userTokenIds[to].at(index);
    }

    function getTokenIdCount() external view override returns (uint256 index) {
        return _tokenIds.length();
    }

    function getTokenId(uint256 index)
        external
        view
        override
        returns (uint256 tokenId)
    {
        require(index < _tokenIds.length(), "overflow tokenId set length");
        return _tokenIds.at(index);
    }

    function stakes(bytes32 incentiveId, uint256 tokenId)
        public
        view
        override
        returns (
            address owner,
            uint160 secondsPerLiquidityInsideInitialX128,
            uint128 liquidity
        )
    {
        Stake memory stake = _stakes[incentiveId][tokenId];
        owner = stake.owner;
        secondsPerLiquidityInsideInitialX128 = stake
        .secondsPerLiquidityInsideInitialX128;
        liquidity = stake.liquidity;
    }

    function createIncentive(
        IncentiveKey memory key,
        uint256 reward,
        int24 minTick,
        int24 maxTick
    ) external override onlyGov {
        require(reward > 0, "reward must be positive");
        require(
            block.timestamp <= key.startTime,
            "start time must be now or in the future"
        );
        require(
            key.startTime < key.endTime,
            "start time must be before end time"
        );

        bytes32 incentiveId = IncentiveId.compute(key);
        require(
            incentives[incentiveId].totalRewardUnclaimed == 0,
            "incentive already exists"
        );

        incentives[incentiveId] = Incentive({
            totalRewardUnclaimed: reward,
            totalSecondsClaimedX128: 0,
            numberOfStakes: 0,
            minTick: minTick,
            maxTick: maxTick
        });

        // Owner transfer token to this contract
        TransferHelper.safeTransferFrom(
            key.rewardToken,
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

    function cancelIncentive(IncentiveKey memory key, address refundee)
        external
        override
        onlyGov
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        Incentive memory incentive = incentives[incentiveId];
        uint256 rewardUnclaimed = incentive.totalRewardUnclaimed;
        require(rewardUnclaimed > 0, "no refund available");
        require(
            block.timestamp > key.endTime,
            "cannot cancel incentive before end time"
        );

        // if any unclaimed rewards remain, and we're past the claim deadline, issue a refund
        incentives[incentiveId].totalRewardUnclaimed = 0;
        TransferHelper.safeTransfer(key.rewardToken, refundee, rewardUnclaimed);
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
            "not a univ3 nft"
        );

        (
            ,
            ,
            ,
            ,
            ,
            int24 tickLower,
            int24 tickUpper,
            ,
            ,
            ,
            ,

        ) = nonfungiblePositionManager.positions(tokenId);
        deposits[tokenId] = Deposit({
            owner: from,
            numberOfStakes: 0,
            tickLower: tickLower,
            tickUpper: tickUpper
        });

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

    function _stakeToken(
        IncentiveKey memory key,
        uint256 tokenId,
        address from
    ) internal {
        require(block.timestamp >= key.startTime, "incentive not started");
        require(block.timestamp <= key.endTime, "incentive has ended");

        bytes32 incentiveId = IncentiveId.compute(key);
        Incentive storage incentive = incentives[incentiveId];
        Deposit storage deposit = deposits[tokenId];

        require(incentive.totalRewardUnclaimed > 0, "non-existent incentive");

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
        require(pool == key.pool, "token pool is not incentive pool");
        require(liquidity > 0, "can not stake token with 0 liquidity");

        deposit.numberOfStakes = uint96(
            SafeMath.add(deposit.numberOfStakes, 1)
        );
        incentive.numberOfStakes = uint96(
            SafeMath.add(incentive.numberOfStakes, 1)
        );

        (, uint160 secondsPerLiquidityInsideX128, ) = pool
        .snapshotCumulativesInside(tickLower, tickUpper);

        _stakes[incentiveId][tokenId] = Stake({
            secondsPerLiquidityInsideInitialX128: secondsPerLiquidityInsideX128,
            liquidity: liquidity,
            owner: from
        });
        _userTokenIds[from].add(tokenId);
        _tokenIds.add(tokenId);
        emit TokenStaked(incentiveId, tokenId, liquidity);
    }

    function unstakeToken(IncentiveKey memory key, uint256 tokenId)
        external
        override
        nonReentrant
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        (
            address owner,
            uint160 secondsPerLiquidityInsideInitialX128,
            uint128 liquidity
        ) = stakes(incentiveId, tokenId);

        Deposit storage deposit = deposits[tokenId];
        Incentive storage incentive = incentives[incentiveId];

        require(deposit.owner == msg.sender, "only owner can unstake token");
        require(owner == msg.sender, "only owner can unstake token");
        require(liquidity > 0, "stake does not exist");

        (, uint160 secondsPerLiquidityInsideX128, ) = key
        .pool
        .snapshotCumulativesInside(deposit.tickLower, deposit.tickUpper);
        (uint256 reward, uint160 secondsInsideX128) = RewardMath
        .computeRewardAmount(
            incentive.totalRewardUnclaimed,
            incentive.totalSecondsClaimedX128,
            key.startTime,
            key.endTime,
            liquidity,
            secondsPerLiquidityInsideInitialX128,
            secondsPerLiquidityInsideX128,
            block.timestamp
        );

        {
            deposits[tokenId].numberOfStakes = uint96(
                SafeMath.sub(deposits[tokenId].numberOfStakes, 1)
            );
            incentive.numberOfStakes = uint96(
                SafeMath.sub(incentive.numberOfStakes, 1)
            );
            incentive.totalSecondsClaimedX128 = uint160(
                SafeMath.add(
                    incentive.totalSecondsClaimedX128,
                    secondsInsideX128
                )
            );
            incentive.totalRewardUnclaimed = incentive.totalRewardUnclaimed.sub(
                reward
            );

            _stakes[incentiveId][tokenId]
            .secondsPerLiquidityInsideInitialX128 = 0;
            _stakes[incentiveId][tokenId].liquidity = 0;
            delete _stakes[incentiveId][tokenId];
            _userTokenIds[msg.sender].remove(tokenId);
            _tokenIds.remove(tokenId);

            reward = deposit.tickLower < incentive.minTick ? 0 : reward;
            rewards[key.rewardToken][owner] = rewards[key.rewardToken][owner]
            .add(reward);
        }

        emit TokenUnstaked(incentiveId, tokenId);
    }

    function withdrawToken(uint256 tokenId, address to) external override {
        require(
            deposits[tokenId].owner == msg.sender,
            "only owner can withdraw token"
        );
        require(
            deposits[tokenId].numberOfStakes == 0,
            "nonzero number of stakes"
        );

        delete deposits[tokenId];
        nonfungiblePositionManager.safeTransferFrom(address(this), to, tokenId);
        emit TokenWithdraw(tokenId, to);
    }

    function getRewardInfo(IncentiveKey memory key, uint256 tokenId)
        external
        view
        override
        returns (uint256 reward, uint160 secondsInsideX128)
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        (
            ,
            uint160 secondsPerLiquidityInsideInitialX128,
            uint128 liquidity
        ) = stakes(incentiveId, tokenId);

        Incentive memory incentive = incentives[incentiveId];
        Deposit memory deposit = deposits[tokenId];

        (, uint160 secondsPerLiquidityInsideX128, ) = key
        .pool
        .snapshotCumulativesInside(deposit.tickLower, deposit.tickUpper);

        (reward, secondsInsideX128) = RewardMath.computeRewardAmount(
            incentive.totalRewardUnclaimed,
            incentive.totalSecondsClaimedX128,
            key.startTime,
            key.endTime,
            liquidity,
            secondsPerLiquidityInsideInitialX128,
            secondsPerLiquidityInsideX128,
            block.timestamp
        );
        reward = deposit.tickLower < incentive.minTick ? 0 : reward;
    }

    function claimReward(
        address rewardToken,
        address to,
        uint256 amountRequested
    ) external override nonReentrant {
        uint256 totalReward = rewards[rewardToken][msg.sender];
        require(totalReward > 0, "non reward can be claim");
        require(amountRequested > 0 && amountRequested <= totalReward);

        rewards[rewardToken][msg.sender] = rewards[rewardToken][to].sub(
            amountRequested
        );
        TransferHelper.safeTransfer(rewardToken, to, amountRequested);
        emit RewardClaimed(to, amountRequested);
    }
}
