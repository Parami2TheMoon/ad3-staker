AD3StakeMangager: https://rinkeby.etherscan.io/address/0x676f430587be833DB073a3268154B59c7F7ba6fe#code
OldAD3StakeMangager: https://rinkeby.etherscan.io/address/0xbe754c2aeb20b35ea1705fe53dde9a2f4313cb3b#code
TransparentUpgradeProxy: https://rinkeby.etherscan.io/address/0x18cC8771066450751b8816CEdC10E1889cFcD9c0#code
ProxyAdmin: 
UniswapV3FactoryAddress: https://rinkeby.etherscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984#code
NonfungiblePositionManager: https://rinkeby.etherscan.io/address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88#code
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
    uint160 totalSecondsClaimedX128;
    int24 minTick;
    int24 maxTick;
}
```

* totalRewardUnclaimed: AD3 totalSupply for this pool
* totalSecondsClaimedX128: AD3 total seconds when user claimed
* minTick & maxTick: Price range to tick

## Interfaces

### createIncentive

```
function createIncentive(
    IncentiveKey memory key,
    uint256 reward,
    int24 minTick,
    int24 maxTick
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
function withdrawToken(uint256 tokenId, address to) external;
```

User withdraw NFT LP to `to` address

tokenId: user NFT lp tokenId
to: address which transfer to

### claimReward

```
function claimReward(address rewardToken, address recipient, uint256 amountRequested) external;
```

claimReward to recipient address

rewardToken: AD3 token address
recipient: receive AD3 address
amountRequested: cliam amount


### getAccruedRewardInfo

```
function getAccruedRewardInfo(IncentiveKey memory key, uint256 tokenId)
    external view returns (uint256, uint160, u160);
```

get reward information, if flag is True, get accrued reward, otherwise get reward since last claim.

key: IncentiveKey
tokenId: user tokenId

returns
uint256 reward: reward amount
uint160 seconds stakeing
uint160 seconds stakeing per liquidity


### getUserTokenCount

```
    function getUserTokenCount(address to) external view returns (uint256 index);
```

get user Token count


### getTokenId

```
function getTokenId(address to, uint256 index) external view returns (uint256 tokenId);
```

get user TokenId with index

### getTokenCount

```
    function getTokenCount() external view returns (uint256 index);
```

get TokenId count


### getTokenId

```
function getTokenId(uint256 index) external view returns (uint256 tokenId);
```

get tokenId with index


## APY calculate

1. getTokenCount
2. get all tokenId
3. getAccruedRewardInfo(key, tokenId) -> (reward, secondsInsideX128, secondsPerLiquidityInsideX128)
4. sum all rewards -> sumRewards
5. diffSumRewards = (afterSumRewards - beforeSumRewards), interval maybe 15min = 15 * 60 = 900seconds, or a day
4. APY = priceOfRewardToken * diffSumReward / interval * [ day ] * [ year ] / key.totalUnClaimRewards
