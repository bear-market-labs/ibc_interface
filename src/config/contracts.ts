import { ethers } from 'ethers'

export const contracts = {
  default:{
    wethAddress: process.env.REACT_APP_WETH_TOKEN ?? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    multicallContract: process.env.REACT_APP_MULTICALL_CONTRACT ?? "0xcA11bde05977b3631167028862bE2a173976CA11",
    ibcAdminContract: process.env.REACT_APP_ADMIN_CONTRACT ?? "0xE42F7aeA4788CF7198149e8E5f2a557Af475C97d",
    ibcRouterContract: process.env.REACT_APP_ROUTER_CONTRACT ?? "0x24a60379c53D90c6E154D7f20EDD25EDbd542b57",
    ibcFactoryContract: process.env.REACT_APP_FACTORY_CONTRACT ?? "0x7957F57deafe60b2D0CCdEdBBED85da6f5374adB",
    ibcETHCurveContract: process.env.REACT_APP_ETH_CURVE ?? "0x5594B3D6EbeAbbc13aFC39f569961521e9425262",
  },
  mainnet:{
    wethAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    multicallContract: "0xcA11bde05977b3631167028862bE2a173976CA11",
    ibcAdminContract: "0xE42F7aeA4788CF7198149e8E5f2a557Af475C97d",
    ibcRouterContract: "0x24a60379c53D90c6E154D7f20EDD25EDbd542b57",
    ibcFactoryContract: "0x7957F57deafe60b2D0CCdEdBBED85da6f5374adB",
    ibcETHCurveContract: "0x5594B3D6EbeAbbc13aFC39f569961521e9425262",
  }
}