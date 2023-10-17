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

export const format = (val: any) => val + `%`
export const parse = (val: any) => val.replace(/^\%/, '')

export const ibcImageUrl = 'http://placekitten.com/200/300'
export const blocksPerDay = 7200

// arg for the multicall contract to continue if one of the calldata executions/queries results in error
export const multicallContinueOnErrorFlag = true