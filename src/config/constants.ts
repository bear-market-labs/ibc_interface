export const reserveAssetSymbol = "ETH"
export const reserveAssetDecimals = 18
export const lpTokenDecimals = 18
export const ibcSymbol = "IBC"
export const maxSlippagePercent = 1
export const maxReserveChangePercent = 1
export const explorerUrl = "https://etherscan.io/tx/"
export const curveUtilization = 0.5

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


export const format = (val: any) => val + `%`
export const parse = (val: any) => val.replace(/^\%/, '')
export function sanitizeNumberInput(input: any){
  const sanitizedValue = input
  .replace(/[-+e]/g, "")
  .replace(/(\.\d*)\./g, "$1");

  return sanitizedValue
}

export const ibcImageUrl = 'http://placekitten.com/200/300'
export const blocksPerDay = 7200

// arg for the multicall contract to continue if one of the calldata executions/queries results in error
export const multicallContinueOnErrorFlag = true