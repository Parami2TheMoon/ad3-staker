import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export const getMasterContract = (master) => {
  return master && master.contracts && master.contracts.master
}

export const getWethContract = (master) => {
  return master && master.contracts && master.contracts.weth
}

export const getAd3Contract = (master) => {
  return master && master.contracts && master.contracts.ad3
}

export const getUsdtContract = (master) => {
  return master && master.contracts && master.contracts.usdt
}
export const getUsdcContract = (master) => {
  return master && master.contracts && master.contracts.usdc
}

export const getMasterAddress = (master) => {
  return master && master.masterAddress
}

export const getAd3Address = (master) => {
  return master && master.ad3Address
}

export const getPairs = (master) => {
  return master && master.contracts && master.contracts.pools
}

export const approve = async (lpContract, masterContract, account) => {
  return lpContract.methods.setApprovalForAll(masterContract.options.address, true).send({ from: account })
}

export const getAllowance = async (lpContract, user, spender) => {
  try {
    const allowance = await lpContract.methods.isApprovedForAll(user, spender).call()

    return allowance
  } catch (e) {
    console.log(e)
    return false
  }
}

export const getAd3Supply = async (master) => {
  return new BigNumber(await master.contracts.ad3.methods.totalSupply().call())
}

export const deposit = async (masterContract, tokenId, account) => {
  return masterContract.methods.depositToken(tokenId).send({ from: account })
}

export const stake = async (masterContract, incentiveKey, tokenId, account) => {
  console.log('stake start')
  console.log(incentiveKey)
  console.log(tokenId)
  console.log('stake end')
  return masterContract.methods
    .depositToken(incentiveKey, tokenId)
    .send({ from: account })
    .on('transactionHash', (tx) => {
      return tx.transactionHash
    })
}

export const unstake = async (masterContract, incentiveKey, tokenId, account) => {
  // console.log(masterContract)
  // console.log(incentiveKey)
  // console.log(tokenId)
  // console.log(account)
  return masterContract.methods
    .unstakeToken(incentiveKey, tokenId, account)
    .send({ from: account })
    .on('transactionHash', (tx) => {
      return tx.transactionHash
    })
}

export const getStaked = async (masterContract, pid, account) => {
  try {
    const { amount } = await masterContract.methods.userInfo(pid, account).call()

    return new BigNumber(amount)
  } catch (e) {
    return new BigNumber(0)
  }
}

export const getAd3Price = async (master) => {
  const price = await master.contracts.ad3.methods.getPrice().call()

  return new BigNumber(price)
}

export const getTokenBalance = async (toKenContract, account) => {
  const balance = await toKenContract.methods.balanceOf(account).call()

  return new BigNumber(balance)
}

export const acceptGoverance = async (masterContract, account) => {
  await masterContract.methods.acceptGoverance().send({ from: account })
}

export const createIncentive = async (masterContract, incentiveKey, totalReward, minPrice, maxPrice, account) => {
  // console.log(masterContract)
  // console.log(incentiveKey)
  // console.log(totalReward)
  // console.log(minPrice)
  // console.log(maxPrice)
  return masterContract.methods
    .createIncentive(incentiveKey, totalReward, minPrice, maxPrice)
    .send({ from: account })
    .on('transactionHash', (tx) => {
      return tx.transactionHash
    })
}

export const cancelIncentive = async (masterContract, incentiveKey, account) => {
  return masterContract.methods
    .cancelIncentive(incentiveKey, account)
    .send({ from: account })
    .on('transactionHash', (tx) => {
      return tx.transactionHash
    })
}

export const approveAd3 = async (ad3Contract, spender, account) => {
  return ad3Contract.methods.approve(spender, ethers.constants.MaxUint256).send({ from: account })
}

export const claimReward = async (masterContract, incentiveKey, tokenId, account, amount) => {
  // console.log(masterContract)
  // console.log(incentiveKey)
  // console.log(tokenId)
  // console.log(account)
  // console.log(amount)
  return masterContract.methods.claimReward(incentiveKey, tokenId, account, amount).send({ from: account })
}

export const getAd3TotalSupply = async (ad3Contract) => {
  const amount = await ad3Contract.methods.totalSupply().call()

  return new BigNumber(amount)
}

export const getUserTokenIdCount = async (masterContract, account) => {
  const count = await masterContract.methods.getUserTokenIdCount(account).call()

  return count
}

export const getUserTokenIdByIndex = async (masterContract, account, index) => {
  const tokenId = await masterContract.methods.getTokenId(account, index).call()

  return tokenId
}

export const getTokenIdInfo = async (masterContract, tokenId) => {
  const token = await masterContract.methods.deposits(tokenId).call()

  return token
}

export const getRewardInfo = async (masterContract, incentiveKey, tokenId) => {
  console.log('masterContract', masterContract)
  console.log('incentiveKey', incentiveKey)
  console.log('tokenId', tokenId)
  const { reward } = await masterContract.methods.getAccruedRewardInfo(incentiveKey, tokenId).call()
  console.log('reward', reward)

  return new BigNumber(reward)
}

export const getIncentive = async (masterContract, incentiveId) => {
  const incentive = await masterContract.methods.incentives(incentiveId).call()

  return incentive
}

export const getDisplayBalance = (balance, decimals = 18) => {
  const displayBalance = balance.dividedBy(new BigNumber(10).pow(decimals))

  if (displayBalance.lt(1)) {
    return displayBalance.toPrecision(4)
  } else {
    return displayBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
}
