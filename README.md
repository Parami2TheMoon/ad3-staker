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
    uint256 minPrice;
    uint256 maxPrice;
}
```

* totalRewardUnclaimed: AD3 totalSupply for this pool
* totalSecondsClaimedX128: Total claimed seconds
* minPrice & maxPrice: Price range

## Interfaces

### createIncentive

```
function createIncentive(
    IncentiveKey memory key,
    uint256 reward,
    uint256 minPrice,
    uint256 maxPrice
) external;
```

Only owner can create a incentive structure.

### cancelIncentive

```
function cancelIncentive(IncentiveKey memory key, address recipient) external;
```

key: IncentiveKey which use to createIncentive
recipient: send rest of AD3 to this address

### depositToken

```
function depositToken(IncentiveKey memory key, uint256 tokenId) external;
```

Approved user deposit and stake NFT LP to this function

key: IncentiveKey which use to createIncentive
tokenId: user NFT lp tokenId

### unstakeToken

```
function unstakeToken(IncentiveKey memory key, uint256 tokenId) external;
```

User unstake NFT LP to this function

key: IncentiveKey which use to createIncentive
tokenId: user NFT lp tokenId

### withdrawToken

```
function withdrawToken(IncentiveKey memory key, uint256 tokenId, address to) external;
```

User withdraw NFT LP to `to` address

key: IncentiveKey which use to createIncentive
tokenId: user NFT lp tokenId
to: address which transfer to

### claimReward

```
function claimReward(address rewardToken, address recipient) external;
```

claimReward to recipient address

rewardToken: AD3 token address
recipient: receive AD3 address
