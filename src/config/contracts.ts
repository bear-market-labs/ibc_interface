import { ethers } from 'ethers'

export const contracts = {
  tenderly:{
    uniswapV2Factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    wethAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    //ibcContract: "0x26291175Fa0Ea3C8583fEdEB56805eA68289b105",
    //ibcContract: "0xde79380fbd39e08150adaa5c6c9de3146f53029e",
    //ibcContract: "0x37D31345F164Ab170B19bc35225Abc98Ce30b46A",
    ibcContract: "0x88d1af96098a928ee278f162c1a84f339652f95b",
  }
}

export const ibcEvents = [
  ethers.utils.id("TokenBought(address,address,uint256,uint256)"),
  //ethers.utils.id("TokenSold(address,address,uint256,uint256)"),
  //ethers.utils.id("LiquidityAdded(address,address,uint256,uint256,int256,uin256)"),
  //ethers.utils.id("LiquidityRemoved(address,address,uint256,uint256,int256,uint256)"),
  //ethers.utils.id("RewardClaimed(address,address,int8,uint256)"),
]