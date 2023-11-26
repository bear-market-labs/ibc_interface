import { ethers } from 'ethers'

export const lpTokenDecimals = 18
export const defaultDecimals = 18
export const maxSlippagePercent = 1
export const maxReserveChangePercent = 1
export const explorerUrl = "https://etherscan.io/tx/"
export const curveUtilization = 0.5
export const providerPollingIntervalMilliSeconds = 30000
export const bigOne = ethers.utils.parseUnits('1', defaultDecimals)


export const actionTypes = [
  "buyTokens",
  "sellTokens",
  "addLiquidity",
  "removeLiquidity",
]

export const commandTypes = {
  "buyTokens": 0,
  "sellTokens": 1,
  "addLiquidity": 2,
  "removeLiquidity": 3,
  "claimRewards": 4,
  "stake": 5,
  "unstake": 6,
}

export const ibcImageUrl = 'http://placekitten.com/200/300'
export const blocksPerDay = 7200
export const secondsPerDay = 86400

// arg for the multicall contract to continue if one of the calldata executions/queries results in error
export const multicallContinueOnErrorFlag = true