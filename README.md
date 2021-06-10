# IAd3StakerManager ABI

## Structs

### IncentiveKey

```
struct IncentiveKey {
    IERC20 rewardToken;
    IUniswapV3Pool pool;
    uint256 startTime;
    uint256 endTime;
}
```

* rewardToken: AD3 address
* IUniswapV3Pool: AD3/USDC-0.3% address etc.
* startTime: Minting startTime
* endTime: Minting endTime

### Stake

```
struct Stake {
    uint160 secondsPerLiquidityInsideInitialX128;
    uint128 liquidity;
    address owner;
}
```

* secondsPerLiquidityInsideInitialX128: LP provider liquidity seconds
* liquidity: LP provider get liquidity number
* owner: LP owner


### Incentive

```
struct Incentive {
    uint256 totalRewardUnclaimed;
    uint256 totalSecondsClaimedX128;
    uint256 numberOfStakes;
    uint256 minPrice;
    uint256 maxPrice;
    IncentiveKey key;
}
```

* totalRewardUnclaimed: AD3 totalSupply for this pool
* totalSecondsClaimedX128: Total claimed seconds
* numberOfStakes: Number of stakers
* minPrice & maxPrice: Price range

## Interfaces

### createIncentive

```
function createIncentive(
    IncentiveKey memory key,
    uint256 reward,
    uint256 minPrice,
    uint256 maxPrice
) external returns (bytes32);
```

Only owner can create a incentive structure. And return bytes32 incentiveId as key.

### cancelIncentive

```
function cancelIncentive(bytes32 incentiveId, address recipient) external;
```

incentiveId: createIncentive return value
recipient: send rest of AD3 to this address

### stakeToken

```
function stakeToken(bytes32 incentiveId, uint256 tokenId) external;
```

User stake NFT LP to this function

incentiveID: createIncentive return value
tokenId: user NFT lp tokenId

### unstakeToken

```
function unstakeToken(bytes32 incentiveId, uint256 tokenId) external;
```

User unstake NFT LP to this function

incentiveID: createIncentive return value
tokenId: user NFT lp tokenId

### withdrawToken

```
function withdrawToken(bytes32 incentiveId, uint256 tokenId, address to) external;
```

User withdraw NFT LP to `to` address

incentiveID: createIncentive return value
tokenId: user NFT lp tokenId
to: address which transfer to

### claimReward

```
function claimReward(address rewardToken, address recipient) external;
```

claimReward to recipient address

rewardToken: AD3 token address
recipient: receive AD3 address
