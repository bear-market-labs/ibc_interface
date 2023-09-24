export const reserveAssetSymbol = "ETH"
export const reserveAssetDecimals = 18
export const ibcSymbol = "IBC"
export const maxSlippagePercent = 1
export const maxReserveChangePercent = 1
export const explorerUrl = "https://etherscan.io/tx/"

export const actionTypes = [
  "buyTokens",
  "sellTokens",
  "addLiquidity",
  "removeLiquidity",
]

export const format = (val: any) => val + `%`
export const parse = (val: any) => val.replace(/^\%/, '')