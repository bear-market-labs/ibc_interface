import { Divider, Grid, GridItem, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Show, Spacer, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useDisclosure, useRadioGroup, Box } from "@chakra-ui/react";
import { useConnectWallet } from "@web3-onboard/react";
import React, { useEffect, useState } from "react";
import ConnectWallet from "../components/ConnectWallet";
import MintTokens from "../components/dashboard/mint_tokens";
import { RadioCard } from "../components/radio_card";
import { ethers } from 'ethers'
import { contracts } from "../config/contracts";
import { composeMulticallQuery, composeQuery } from "../util/ethers_utils";
import BurnTokens from "../components/dashboard/burn_tokens";
import AddLiquidity from "../components/dashboard/add_liquidity";
import RemoveLiquidity from "../components/dashboard/remove_liquidity";
import { colors } from "../config/style";
import ClaimLpRewards from "../components/dashboard/claim_lp_rewards";
import StakeIbc from "../components/dashboard/stake_ibc";
import UnstakeIbc from "../components/dashboard/unstake_ibc";
import MintBurnPrice from "../components/dashboard/mint_burn_price";
import MintBurnIssuance from "../components/dashboard/mint_burn_issuance";
import LpingReserve from "../components/dashboard/lping_reserve";
import LpingIssuance from "../components/dashboard/lping_issuance";
import BondingCurveChart from "../components/bondingCurveChart/bonding_curve_chart";
import Logo from "../components/logo";
import * as _ from "lodash";
import MobileDisplay from '../components/dashboard/mobile_display'
import { actionTypes, curveUtilization, defaultDecimals, lpTokenDecimals } from "../config/constants";
import ExternalLinks from '../components/dashboard/external_links'
import HowItWorks from "../components/dashboard/how_it_works";
import UsefulLinks from '../components/dashboard/useful_links'
import AddIbc from "../components/dashboard/add_ibc";
import { formatNumber } from "../util/display_formatting";
import TermsOfService from '../components/dashboard/terms_of_service'
import AssetList from "../components/dashboard/asset_list";
import AssetHolding from "../components/dashboard/asset_holding";
import LpPosition from "../components/dashboard/lp_position";
import CreateIBAsset from "../components/dashboard/create_ibasset";
import CreateIBAssetList from "../components/dashboard/create_ibasset_list";
import { useParams } from "react-router-dom";
import { curves } from "../config/curves";

type dashboardProps = {
  mostRecentIbcBlock: any;
  nonWalletProvider: any;
  setupEventListener: any;
  isExplorePage: boolean;
}

export function Dashboard( props: dashboardProps ){
  const {mostRecentIbcBlock, nonWalletProvider, setupEventListener, isExplorePage} = props
  const params = useParams();
  const reserveAssetParam = params.reserveAsset
  const reserveAsset = reserveAssetParam && ethers.utils.isAddress(reserveAssetParam) ? reserveAssetParam : contracts.tenderly.wethAddress

  let navOptions: any[]

  if (isExplorePage){
    navOptions = [
      {
        value: 'explore',
        displayText: 'Explore',
        description: 'Discover ibAssets and their stats'
      },   
      {
        value: 'createAsset',
        displayText: 'Create New ibASSET',
        description: 'Generate ibAssets for your reserve asset of choice'
      },
      {
        value:'how',
        displayText: 'How It Works',
        description: 'Learn the basics of inverse bonding curves'
      },
      {
        value:'terms',
        displayText: 'Terms of Service',
        description: 'Last Updated: October 10th, 2023'
      }
    ]
  } else {
    navOptions = [
      {
        value: 'mintBurn',
        displayText: 'Mint / Burn',
        description: 'Mint tokens with inversed market properties, the first of its kind'
      },
      {
        value: 'lp',
        displayText: 'Add / Remove Liquidity',
        description: 'Provide liquidity and earn trading fees'
      },
      {
        value: 'stake',
        displayText: 'Stake / Unstake',
        description: 'Earn trading fees by staking'
      },
      {
        value: 'claim',
        displayText: 'Claim',
        description: 'Claim trading fees'
      },
      {
        value:'how',
        displayText: 'How It Works',
        description: 'Learn the basics of inverse bonding curves'
      },
      {
        value:'terms',
        displayText: 'Terms of Service',
        description: 'Last Updated: October 10th, 2023'
      }
    ]  
  }


  const [selectedNavItem, setSelectedNavItem] = useState<string>(navOptions[0].value);
  const [headerTitle, setHeaderTitle] = useState<string>(navOptions[0].displayText.toUpperCase());
  const [{ wallet,  }] = useConnectWallet()
  const [ibcContractAddress, setIbcContractAddress] = useState<string>()
  const [ibcAdminAddress, ] = useState<string>(contracts.tenderly.ibcAdminContract)
  const [ibcRouterAddress, ] = useState<string>(contracts.tenderly.ibcRouterContract)

  const [dashboardDataSet, setDashboardDataSet] = useState<any>({})
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [newPrice, setNewPrice] = useState<any>()
  const [newIbcIssuance, setNewIbcIssuance] = useState<any>()
  const [newReserve, setNewReserve] = useState<any>()
  const [newLpIssuance, setNewLpIssuance] = useState<any>()
  const [reserveAssetAddress, setReserveAssetAddress] = useState<any>(contracts.tenderly.wethAddress)
  const [reserveListUpdateTimestamp, setReserveListUpdateTimestamp] = useState<number>(Date.now())

  const [updated, updateState] = React.useState<any>();

  const [chartParam, setChartParam] = React.useState<any>(
    {
      currentSupply: 1,
      curveParameter: {
        parameterK: 0.5,
        parameterM: 1
      },
      targetSupply: null,
      newCurveParam: null,
    }
  );
  const forceUpdate = React.useCallback(() => updateState({}), []);

  const getProvider = () => {
    return wallet?.provider? new ethers.providers.Web3Provider(wallet.provider, 'any'): nonWalletProvider;
  }


  useEffect(() => {
    const fetchFocusedAssetInfo = async() => {
      const abiCoder = ethers.utils.defaultAbiCoder
      const provider = getProvider();

      // check validity of curveAddress param from url router
      let multicallQueries = [
        composeMulticallQuery(contracts.tenderly.ibcFactoryContract, "getCurve", ["address"], [reserveAsset])
      ]

      let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
      let multicallBytes = await provider.call(multicallQuery)
      let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

      const curveAddressBytes = multicallResults[0][0] ? multicallResults[0][1] : [""]
      let curveAddress = abiCoder.decode(["address"], curveAddressBytes)[0]

      const validReserveAsset: boolean = curveAddress !== ""
      // if invalid reserve asset, assume eth is focused asset
      curveAddress = validReserveAsset ? curveAddress : curves.find(x => x.reserveSymbol === "ETH")?.curveAddress

      if (validReserveAsset){
        setReserveAssetAddress(reserveAsset)
        
        //fetch curve metadata
        multicallQueries = [
          composeMulticallQuery(curveAddress, "inverseTokenAddress", [], []),
          composeMulticallQuery(reserveAsset, "decimals", [], []),
          composeMulticallQuery(reserveAsset, "symbol", [], []),
        ]

        multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
        multicallBytes = await provider.call(multicallQuery)
        multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

        const inverseTokenAddressBytes = multicallResults[0][0] ? multicallResults[0][1] : [""]
        dashboardDataSet.inverseTokenAddress = abiCoder.decode(["address"], inverseTokenAddressBytes)[0]

        const reserveTokenDecimalsBytes = multicallResults[1][0] ? multicallResults[1][1] : [0]
        dashboardDataSet.reserveTokenDecimals = abiCoder.decode(["uint"], reserveTokenDecimalsBytes)[0]

        const reserveTokenSymbolBytes = multicallResults[2][0] ? multicallResults[2][1] : [""]
        dashboardDataSet.reserveTokenSymbol = abiCoder.decode(["string"], reserveTokenSymbolBytes)[0]
        dashboardDataSet.reserveTokenSymbol = dashboardDataSet.reserveTokenSymbol === "WETH" ? "ETH" : dashboardDataSet.reserveTokenSymbol

        multicallQueries = [
          composeMulticallQuery(dashboardDataSet.inverseTokenAddress, "decimals", [], []),
          composeMulticallQuery(dashboardDataSet.inverseTokenAddress, "symbol", [], [])
        ]

        multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
        multicallBytes = await provider.call(multicallQuery)
        multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

        const inverseTokenDecimalsBytes = multicallResults[0][0] ? multicallResults[0][1] : [0]
        dashboardDataSet.inverseTokenDecimals = abiCoder.decode(["uint"], inverseTokenDecimalsBytes)[0]

        const inverseTokenSymbolBytes = multicallResults[1][0] ? multicallResults[1][1] : [""]
        dashboardDataSet.inverseTokenSymbol = abiCoder.decode(["string"], inverseTokenSymbolBytes)[0]
      } else {
        // use hardcoded eth defaults
        dashboardDataSet.reserveTokenSymbol = curves[0].reserveSymbol
        dashboardDataSet.inverseTokenSymbol = curves[0].ibAsset
        dashboardDataSet.inverseTokenAddress = curves[0].ibAssetAddress

        //fetch curve metadata
        multicallQueries = [
          composeMulticallQuery(dashboardDataSet.inverseTokenAddress, "decimals", [], []),
          composeMulticallQuery(reserveAsset, "decimals", [], []),
        ]

        multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
        multicallBytes = await provider.call(multicallQuery)
        multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

        const inverseTokenDecimalsBytes = multicallResults[0][0] ? multicallResults[0][1] : [0]
        dashboardDataSet.inverseTokenDecimals = abiCoder.decode(["uint"], inverseTokenDecimalsBytes)[0]

        const reserveTokenDecimalsBytes = multicallResults[1][0] ? multicallResults[1][1] : [0]
        dashboardDataSet.reserveTokenDecimals = abiCoder.decode(["uint"], reserveTokenDecimalsBytes)[0]
      }

      // triggers another hook for additioanl data collection
      setIbcContractAddress(curveAddress)
      setupEventListener(curveAddress)
    }

    fetchFocusedAssetInfo().then(() =>{}).catch((err) => {console.log(err)})
 
  }, [])


  useEffect(() => {
    const fetchIbcMetrics = async() => {
      const abiCoder = ethers.utils.defaultAbiCoder
      const provider = getProvider();

      if (!ibcContractAddress){
        return;
      }

      // refresh
      let multicallQueries = [
        composeMulticallQuery(ibcContractAddress, "curveParameters", [], []),
        composeMulticallQuery(ibcContractAddress, "reserveTokenAddress", [], []),
        composeMulticallQuery(ibcContractAddress, "inverseTokenAddress", [], []),
        composeMulticallQuery(ibcContractAddress, "rewardEMAPerSecond", ["uint8"], [1]),
        composeMulticallQuery(ibcContractAddress, "rewardEMAPerSecond", ["uint8"], [0]),
        composeMulticallQuery(ibcContractAddress, "totalStaked", [], []),
      ]

      let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
      let multicallBytes = await provider.call(multicallQuery)
      let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

      // fetch/set main panel metrics data
      const bondingCurveParamsBytes = multicallResults[0][0] ? multicallResults[0][1] : [[0,0,0,0,0]]
      const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,uint256,uint256)"], bondingCurveParamsBytes)
      
      const stakingRewardEmaBytes = multicallResults[3][0] ? multicallResults[3][1] : [0,0]
      const stakingRewardEma = abiCoder.decode(["uint256", "uint256"], stakingRewardEmaBytes)

      const lpRewardEmaBytes = multicallResults[4][0] ? multicallResults[4][1] : [0,0]
      const lpRewardEma = abiCoder.decode(["uint256", "uint256"], lpRewardEmaBytes)

      const totalStakingBalanceBytes = multicallResults[5][0] ? multicallResults[5][1] : [0];
      const totalStakingBalance = abiCoder.decode(["uint"], totalStakingBalanceBytes)[0]

      dashboardDataSet.stakingRewardEma = {
        reserveAsset: stakingRewardEma[1].toString(),
        ibcAsset: stakingRewardEma[0].toString(),
      }

      dashboardDataSet.lpRewardEma = {
        reserveAsset: lpRewardEma[1].toString(),
        ibcAsset: lpRewardEma[0].toString(),
      }

      dashboardDataSet.bondingCurveParams = {
        reserveAmount: bondingCurveParams[0][0].toString(),
        inverseTokenSupply: bondingCurveParams[0][1].toString(), // this is supply + virtual credits via lp
        lpSupply: bondingCurveParams[0][2].toString(), // lp tokens no longer exist
        currentTokenPrice: bondingCurveParams[0][3].toString(),
        invariant: bondingCurveParams[0][4].toString(),
        utilization: ethers.utils.parseUnits(curveUtilization.toString(), 18).toString(),
      };

      dashboardDataSet.lpTokenDecimals = lpTokenDecimals.toString();
      dashboardDataSet.lpTokenSupply = dashboardDataSet.bondingCurveParams.lpSupply;
      dashboardDataSet.totalStakingBalance = totalStakingBalance;

      // compute old k/m params from utilization and invariant
      let k = 1 - curveUtilization
      if (k < 0){
        k = 0
      }
      const m = Number(ethers.utils.formatUnits(bondingCurveParams[0][3], dashboardDataSet.reserveTokenDecimals)) 
      * 
      Math.pow(
        Number(ethers.utils.formatUnits(bondingCurveParams[0][1], dashboardDataSet.inverseTokenDecimals)),
        k
      )

      chartParam.curveParameter.parameterK = k;
      chartParam.curveParameter.parameterM = m;
      chartParam.currentSupply = Number(bondingCurveParams[0][1].toString())/1e18;

      setNewPrice(dashboardDataSet.bondingCurveParams.currentPrice)
      setNewReserve(dashboardDataSet.bondingCurveParams.reserveAmount)
    }

    fetchIbcMetrics().then(() =>{}).catch((err) => {console.log(err)})

  }, [mostRecentIbcBlock, ibcContractAddress])

  useEffect(() => {

    const fetchWalletInfo = async() => {
      if (wallet?.provider && ibcContractAddress) {        
        const provider = new ethers.providers.Web3Provider(wallet.provider, 'any')
        const abiCoder = ethers.utils.defaultAbiCoder

        const feeQueries = actionTypes.map((_x, i, _array) => composeMulticallQuery(ibcAdminAddress, "feeConfig", ["uint8"], [i]))
        let multicallQueries = [
          composeMulticallQuery(ibcContractAddress, "curveParameters", [], []),
          composeMulticallQuery(ibcContractAddress, "inverseTokenAddress", [], []),
          composeMulticallQuery(ibcContractAddress, "liquidityPositionOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(ibcContractAddress, "rewardOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(ibcContractAddress, "stakingBalanceOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(ibcContractAddress, "rewardEMAPerSecond", ["uint8"], [1]),
          composeMulticallQuery(ibcContractAddress, "rewardEMAPerSecond", ["uint8"], [0]),
          composeMulticallQuery(ibcContractAddress, "totalStaked", [], []),
          composeMulticallQuery(ibcContractAddress, "reserveTokenAddress", [], []),
        ].concat(feeQueries)

        let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])

        const queryResults = await Promise.all([
          provider.getBalance(wallet.accounts[0].address),
          provider.call(multicallQuery),
        ]);

        const ethBalance = queryResults[0];
        // ibc contract state
        
        let multicallBytes = queryResults[1]
        let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

        const bondingCurveParamsBytes = multicallResults[0][0] ? multicallResults[0][1] : [[0,0,0,0,0]]
        const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,uint256,uint256)"], bondingCurveParamsBytes)

        
        const inverseTokenAddressBytes = multicallResults[1][0] ? multicallResults[1][1] : ['']
        const inverseTokenAddress = abiCoder.decode(["address"], inverseTokenAddressBytes)[0]

        // lp info
        
        const userLpPositionBytes = multicallResults[2][0] ? multicallResults[2][1] : [0,0]
        const userLpPosition = abiCoder.decode(["uint256", "uint256"], userLpPositionBytes)
        
        const userLpTokenBalance = userLpPosition[0]
        const userLpIbcCredit = userLpPosition[1]

        // fetch rewards data
        
        const userClaimableRewardsBytes = multicallResults[3][0] ? multicallResults[3][1] : [0,0,0,0]
        const userClaimableRewards = abiCoder.decode(["uint256", "uint256", "uint256", "uint256"], userClaimableRewardsBytes)

        const stakingRewardEmaBytes = multicallResults[5][0] ? multicallResults[5][1] : [0,0]
        const stakingRewardEma = abiCoder.decode(["uint256", "uint256"], stakingRewardEmaBytes)
  
        const lpRewardEmaBytes = multicallResults[6][0] ? multicallResults[6][1] : [0,0]
        const lpRewardEma = abiCoder.decode(["uint256", "uint256"], lpRewardEmaBytes)
  
        // fetch staking balance
        
        const userStakingBalanceBytes = multicallResults[4][0] ? multicallResults[4][1] : [0]
        const userStakingBalance = abiCoder.decode(["uint256"], userStakingBalanceBytes)[0]

        const totalStakingBalanceBytes = multicallResults[7][0] ? multicallResults[7][1] : [0];
        const totalStakingBalance = abiCoder.decode(["uint"], totalStakingBalanceBytes)[0]
        
        const reserveTokenAddressBytes = multicallResults[8][0] ? multicallResults[8][1] : [0];
        const reserveTokenAddress = abiCoder.decode(["address"], reserveTokenAddressBytes)[0]

        // fee info
        const fees = actionTypes.map((_x, i, _array) => abiCoder.decode(["uint256","uint256","uint256"], multicallResults[9+i][0] ? multicallResults[9+i][1] : [0, 0, 0]))

        multicallQueries = [
          composeMulticallQuery(inverseTokenAddress, "decimals", [], []),
          composeMulticallQuery(inverseTokenAddress, "balanceOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(inverseTokenAddress, "allowance", ["address", "address"], [wallet.accounts[0].address, ibcRouterAddress]),
          composeMulticallQuery(inverseTokenAddress, "symbol", [], []),
          composeMulticallQuery(inverseTokenAddress,  "balanceOf", ["address"], [ibcContractAddress]),
          composeMulticallQuery(reserveTokenAddress,  "balanceOf", ["address"], [ibcContractAddress]),
          composeMulticallQuery(reserveTokenAddress, "decimals", [], []),
          composeMulticallQuery(reserveTokenAddress, "symbol", [], []),
          composeMulticallQuery(reserveTokenAddress, "balanceOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(reserveTokenAddress, "allowance", ["address", "address"], [wallet.accounts[0].address, ibcRouterAddress]),
        ]
  
        multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
        const tokenQueryResults = await provider.call(multicallQuery);
        multicallResults = abiCoder.decode(["(bool,bytes)[]"], tokenQueryResults)[0]

        // ibc token info        
        const inverseTokenDecimalsBytes = multicallResults[0][1];
        const inverseTokenDecimals = abiCoder.decode(["uint"], inverseTokenDecimalsBytes)[0]

        
        const userInverseTokenBalanceBytes = multicallResults[1][1];
        const userInverseTokenBalance = abiCoder.decode(["uint"], userInverseTokenBalanceBytes)[0]

        // ibc approval state        
        const userInverseTokenAllowanceBytes = multicallResults[2][1];
        const userInverseTokenAllowance = abiCoder.decode(["uint"], userInverseTokenAllowanceBytes)[0]

        const inverseTokenSymbolBytes = multicallResults[3][1];
        const inverseTokenSymbol = abiCoder.decode(["string"], inverseTokenSymbolBytes)[0]

        const contractInverseTokenBalanceBytes = multicallResults[4][1];
        const contractInverseTokenBalance = abiCoder.decode(["uint"], contractInverseTokenBalanceBytes)[0]

        const contractReserveTokenBalanceBytes = multicallResults[5][1];
        const contractReserveTokenBalance = abiCoder.decode(["uint"], contractReserveTokenBalanceBytes)[0]

        const reserveTokenDecimalsBytes = multicallResults[6][1];
        const reserveTokenDecimals = abiCoder.decode(["uint"], reserveTokenDecimalsBytes)[0]

        const reserveTokenSymbolBytes = multicallResults[7][1];
        const reserveTokenSymbol = abiCoder.decode(["string"], reserveTokenSymbolBytes)[0]

        const userReserveTokenBalanceBytes = multicallResults[8][1];
        const userReserveTokenBalance = abiCoder.decode(["uint"], userReserveTokenBalanceBytes)[0]

        const userReserveTokenAllowanceBytes = multicallResults[9][1];
        const userReserveTokenAllowance = abiCoder.decode(["uint"], userReserveTokenAllowanceBytes)[0]

        // downstream calculation for lp removal, all in formatted (or sane) decimals
        const userLpRedeemableReserves = Number(ethers.utils.formatUnits(userLpTokenBalance, lpTokenDecimals)) * Number(ethers.utils.formatUnits(bondingCurveParams[0][0], defaultDecimals)) / Number(ethers.utils.formatUnits(bondingCurveParams[0][2], lpTokenDecimals))

        const userLpIbcDebit = Number(ethers.utils.formatUnits(userLpTokenBalance, lpTokenDecimals)) 
        * 
        Number(ethers.utils.formatUnits(bondingCurveParams[0][1], inverseTokenDecimals)) 
        / 
        Number(ethers.utils.formatUnits(bondingCurveParams[0][2], lpTokenDecimals))

        setDashboardDataSet({
          userEthBalance: ethBalance.toString(),
          userIbcTokenBalance: userInverseTokenBalance.toString(),
          inverseTokenDecimals: inverseTokenDecimals.toString(),
          inverseTokenAddress: inverseTokenAddress.toString(),
          inverseTokenSymbol: inverseTokenSymbol,
          bondingCurveParams: {
            reserveAmount: bondingCurveParams[0][0].toString(),
            inverseTokenSupply: bondingCurveParams[0][1].toString(), // this is supply + virtual credits via lp
            lpSupply: bondingCurveParams[0][2].toString(), // lp tokens no longer exist
            currentTokenPrice: bondingCurveParams[0][3].toString(),
            invariant: bondingCurveParams[0][4].toString(),
            utilization: ethers.utils.parseUnits(curveUtilization.toString(), 18).toString(),
          },
          userInverseTokenAllowance: userInverseTokenAllowance.toString(),
          lpTokenDecimals: lpTokenDecimals.toString(),
          userLpTokenBalance: userLpTokenBalance.toString(),
          userLpIbcCredit: userLpIbcCredit,
          lpTokenSupply:  bondingCurveParams[0][2].toString(),
          userClaimableLpRewards: userClaimableRewards[0].toString(),
          userClaimableStakingRewards: userClaimableRewards[1].toString(),
          userClaimableLpReserveRewards: userClaimableRewards[2].toString(),
          userClaimableStakingReserveRewards: userClaimableRewards[3].toString(),
          forceUpdate: forceUpdate,
          userStakingBalance: userStakingBalance.toString(),
          fees:{
            lpFee: fees.reduce((acc: any, _, i: any) => {
              acc[actionTypes[i]] = fees[i][0].toString();
              return acc;
            }, {}),
            stakingFee: fees.reduce((acc: any, _, i: any) => {
              acc[actionTypes[i]] = fees[i][1].toString();
              return acc;
            }, {}),
            protocolFee: fees.reduce((acc: any, _, i: any) => {
              acc[actionTypes[i]] = fees[i][2].toString();
              return acc;
            }, {}),
          },
          stakingRewardEma: {
            reserveAsset: stakingRewardEma[1].toString(),
            ibcAsset: stakingRewardEma[0].toString(),
          },
          lpRewardEma: {
            reserveAsset: lpRewardEma[1].toString(),
            ibcAsset: lpRewardEma[0].toString(),
          },
          contractInverseTokenBalance,
          userLpRedeemableReserves: userLpRedeemableReserves.toString(),
          userLpIbcDebit: userLpIbcDebit === 0 ? 
            ethers.BigNumber.from(0) 
            : 
            ethers.utils.parseUnits(userLpIbcDebit.toString(), inverseTokenDecimals).add(
              inverseTokenDecimals.gt(13) && Number(userLpIbcDebit.toString()) !== Number(ethers.utils.formatUnits(userLpIbcCredit, dashboardDataSet.inverseTokenDecimals)) ? 
              ethers.BigNumber.from(10).pow(inverseTokenDecimals.sub(13)) // for high decimals, js will lose precision, undercounting the true ibc debt. we will add some dust 
              : 
              ethers.BigNumber.from(0)
            ), 
          totalStakingBalance: totalStakingBalance,
          contractReserveTokenBalance: contractReserveTokenBalance,
          reserveTokenDecimals: reserveTokenDecimals,
          reserveTokenSymbol: reserveTokenSymbol === "WETH" ? "ETH" : reserveTokenSymbol,
          userReserveTokenBalance: userReserveTokenBalance,
          userReserveTokenAllowance: userReserveTokenAllowance,
          reserveTokenAddress: reserveTokenAddress,
          curveAddress: ibcContractAddress,
        });
      }
    }

    fetchWalletInfo()
      .then()
      .catch((err) => console.log("error", err))
  }, [wallet, ibcContractAddress, forceUpdate, updated, ibcAdminAddress, ibcRouterAddress])

  // data to generate
  // curve graph plot points

  // reactive hooks
  // left nav option selected
  useEffect(() => {
    if (selectedNavItem === "claim" || selectedNavItem === "stake"){
      return
    }

    const headerTitle = navOptions.find(x => x.value === selectedNavItem)?.displayText
    if (!headerTitle){
      return
    }
    setHeaderTitle(headerTitle.toUpperCase())
  }, [selectedNavItem, navOptions])

  useEffect(()=>{
    const updateChartParam = _.cloneDeep(chartParam);

    if (selectedNavItem === "mintBurn" ){
      updateChartParam.targetLiquidityChange = null;
      if(newIbcIssuance){
        updateChartParam.targetSupplyChange = (Number(newIbcIssuance) - dashboardDataSet.bondingCurveParams.inverseTokenSupply)/dashboardDataSet.bondingCurveParams.inverseTokenSupply;
      }else{
        updateChartParam.targetSupplyChange = null; 
      }
    }else if(selectedNavItem === "lp"){
      updateChartParam.targetSupplyChange = null; 
      if(newReserve){
        updateChartParam.targetLiquidityChange = (newReserve - dashboardDataSet.bondingCurveParams.reserveAmount)/dashboardDataSet.bondingCurveParams.reserveAmount;
      }else{
        updateChartParam.targetLiquidityChange = null;
      }
    }else{
      return;
    }
    
    setChartParam(updateChartParam);
  }, [dashboardDataSet, dashboardDataSet?.inverseTokenSupply, newIbcIssuance, newReserve, selectedNavItem])

  const handleRadioChange = async (val: any) => {
        
    if (val === "claim" || val === "stake"){
      onOpen()
    } else {
      handleNavInputSwitch()
    }

    setSelectedNavItem(val)
  };

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'vaults',
    onChange: (val) => handleRadioChange(val),
    value: selectedNavItem,
  })
  const group = getRootProps()

  const handleNavInputSwitch = async() => {
    setNewIbcIssuance(null)
    setNewLpIssuance(null)
    setNewPrice(null)
    setNewReserve(null)
  }

  const handleLiquidityNavInputSwitch = async(index:any) => {

    if (index === 1 && "lpTokenSupply" in dashboardDataSet && "userLpTokenBalance" in dashboardDataSet && "userLpRedeemableReserves" in dashboardDataSet){
      const newLpSupply = ethers.BigNumber.from(dashboardDataSet.lpTokenSupply).sub(dashboardDataSet.userLpTokenBalance)
      const newReserve = ethers.BigNumber.from(dashboardDataSet.bondingCurveParams.reserveAmount).sub(ethers.utils.parseUnits(dashboardDataSet.userLpRedeemableReserves, defaultDecimals))

      setNewLpIssuance(newLpSupply.toString())
      setNewReserve(newReserve.toString())
    }else {
      setNewLpIssuance(null)
      setNewReserve(null)
    }
    setNewIbcIssuance(null)
    setNewPrice(null)
  }

  const handleModalClose = async() => {
    const preModalSelectedNavItem = navOptions.find(x => x.displayText.toUpperCase() === headerTitle.toUpperCase())?.value
    setSelectedNavItem(preModalSelectedNavItem ? preModalSelectedNavItem : navOptions[0].value)

    onClose()
  }

  const refreshCurve = (timestamp: number) =>{
    setReserveListUpdateTimestamp(timestamp);
  }

  return (
    <>
      <MobileDisplay/>
      <Show above="sm">
        <Grid
          h='calc(100vh)'
          templateAreas={`
          "sidenav vertline1 header header header"
          "sidenav vertline1 horizline horizline horizline"
          "sidenav vertline1 main vertline2 sideinput"`}
              gridTemplateRows={'150px 1px 1fr'}
              gridTemplateColumns={'0.5fr 1px 2fr 1px 1fr'}
              gap='0'
        >
          <GridItem area={'sidenav'}>
            <Stack spacing={10} minHeight='100%'>
              <Stack spacing={0} flexGrow={0} flexShrink={0}>
                <Logo/>
              </Stack>

              <Stack {...group} spacing='5' mt='7' flexGrow={1}>
                {navOptions.map((item) => {
                  const radio = getRadioProps({ value: item.value })
                  if(item.value === 'terms') {
                    return (
                      <Box mt='auto'>
                        <RadioCard key={item.value} {...radio}>
                        <Text align="left" fontSize={'lg'}>{item.displayText}</Text>
                        </RadioCard>
                      </Box>
                    )
                  }
                  return(
                    <RadioCard key={item.value} {...radio} >
                      <Text align="left" fontSize={'lg'}>{item.displayText}</Text>
                    </RadioCard>
                  )
                })}
              </Stack>

              <ExternalLinks/>

              <Modal
                  isOpen={isOpen}
                  onClose={handleModalClose}
                  scrollBehavior='inside'
                  isCentered
                  size='sm'>
                  <ModalOverlay
                      backdropFilter='blur(20px)' />
                  <ModalContent
                      borderRadius='0'
                      backgroundColor={colors.ROYAL}
                      boxShadow='rgb(0 0 0 / 40%) 0px 0px 33px 8px'>
                      <ModalHeader pl='10' pt='7' borderBottom={selectedNavItem === "claim" ? `0.5px solid ${colors.GRAYED_OUT_GRAY}` : 'none'}>
                        <Stack>
                          <Text fontSize='2xl'>{navOptions.find(x => x.value === selectedNavItem)?.displayText.toUpperCase()}</Text>
                          <Text fontSize='sm'>{navOptions.find(x => x.value === selectedNavItem)?.description}</Text>
                        </Stack>
                      </ModalHeader>
                      <ModalCloseButton
                        color={colors.GRAYED_OUT_GRAY}
                        top='7'
                        right='7'
                        fontSize='l'/>
                      <ModalBody pb={6}>
                        {
                          selectedNavItem === "stake" &&
                          <>
                            <Stack>
                              <Text ml={4} mb='2'>{`TOTAL STAKED: ${'totalStakingBalance' in dashboardDataSet ? formatNumber(ethers.utils.formatUnits(dashboardDataSet.totalStakingBalance, dashboardDataSet.inverseTokenDecimals), dashboardDataSet.reserveTokenSymbol, true, true) : `0 ${dashboardDataSet.inverseTokenSymbol ? dashboardDataSet.inverseTokenSymbol : "ASSET"}`}`}</Text>
                              <Tabs>
                                <TabList mr='-7%' ml='-7%' pl='7%' borderBottom={`0.5px solid ${colors.GRAYED_OUT_GRAY}`}>
                                  <Tab marginBottom={"-1px"}>Stake</Tab>
                                  <Tab marginBottom={"-1px"}>Unstake</Tab>
                                </TabList>
                                <TabPanels pt='10'>
                                  <TabPanel>
                                    <StakeIbc dashboardDataSet={dashboardDataSet} />
                                  </TabPanel>
                                  <TabPanel>
                                    <UnstakeIbc dashboardDataSet={dashboardDataSet} />
                                  </TabPanel>
                                </TabPanels>
                              </Tabs>
                            </Stack>

                          </>
                        }
                        {
                          selectedNavItem === "claim" &&
                          <>
                            <ClaimLpRewards dashboardDataSet={dashboardDataSet} closeParentDialog={handleModalClose}/>
                          </>
                        }
                      </ModalBody>
                  </ModalContent>
              </Modal>
            </Stack>
          </GridItem>

          <GridItem area={'horizline'} >
            <Divider orientation={'horizontal'}/>
          </GridItem>

          <GridItem area={'vertline1'} >
            <Divider orientation={'vertical'}/>
          </GridItem>

          <GridItem area={'vertline2'} >
            <Divider orientation={'vertical'}/>
          </GridItem>

          <GridItem area={'header'} fontWeight='500'>
            <Stack ml={7} direction="row" justifyContent={'space-between'}>
              <Stack direction="column" mt='70px'>
                <Text fontSize='2xl' textAlign={'left'}>{headerTitle}</Text>            
                <Text fontSize={'sm'}>{navOptions.find(x => x.displayText.toUpperCase() === headerTitle)?.description}</Text>
              </Stack>
              <Stack justifyContent={'center'} mr='7'>
                <Stack direction="row" align='center' gap='5'>
                  {
                  headerTitle !== "EXPLORE" && headerTitle !== 'CREATE NEW IBASSET' &&
                  <>
                    <AddIbc 
                      tokenAddress={dashboardDataSet.inverseTokenAddress}
                      tokenDecimals={dashboardDataSet.inverseTokenDecimals}
                      tokenSymbol={dashboardDataSet.inverseTokenSymbol}
                    />
                  </>
                  }
                  <ConnectWallet />
                </Stack>
              </Stack>
            </Stack>
          </GridItem>


          <GridItem area={'main'} pb='40px' fontWeight='500'>
            <Stack>
              {
                  headerTitle === "EXPLORE" &&
                  <>
                    <AssetList
                      nonWalletProvider = {nonWalletProvider}
                      parentSetters={{
                      }}
                    />
                  
                  </>
              }

              {
                  headerTitle === 'CREATE NEW IBASSET' &&
                  <>
                    <CreateIBAssetList
                      nonWalletProvider = {nonWalletProvider}
                      parentSetters={{
                        setReserveAssetAddress: setReserveAssetAddress
                      }}
                      reserveListUpdateTimestamp={reserveListUpdateTimestamp}
                    />
                  
                  </>                
              }

              {
                  headerTitle === "MINT / BURN" &&
                  <>
                    <MintBurnPrice
                      dashboardDataSet={dashboardDataSet}
                      parentInputDynamicData={{
                        newPrice: newPrice,
                        newIbcIssuance: newIbcIssuance,
                        newLpIssuance: newLpIssuance,
                        newReserve: newReserve
                      }}
                    />
                    <Box w="100%" maxW="min(calc(200vh - 940px), calc(56vw))" h="calc(100vh - 470px)" maxH="calc(28vw)" padding="10px 20px">
                      <BondingCurveChart  chartParam={chartParam}></BondingCurveChart>
                    </Box>

                    <Divider orientation={'horizontal'}/>

                    <MintBurnIssuance
                      dashboardDataSet={dashboardDataSet}
                      parentInputDynamicData={{
                        newPrice: newPrice,
                        newIbcIssuance: newIbcIssuance,
                        newLpIssuance: newLpIssuance,
                        newReserve: newReserve
                      }}
                    />
                  </>
              }

              {
                  headerTitle === "ADD / REMOVE LIQUIDITY" &&
                  <>
                    <LpingReserve
                      dashboardDataSet={dashboardDataSet}
                      parentInputDynamicData={{
                        newPrice: newPrice,
                        newIbcIssuance: newIbcIssuance,
                        newLpIssuance: newLpIssuance,
                        newReserve: newReserve
                      }}
                    />

                    <Box w="100%" maxW="min(calc(200vh - 940px), calc(56vw))" h="calc(100vh - 470px)" maxH="calc(28vw)" padding="10px 20px">
                      <BondingCurveChart  chartParam={chartParam}></BondingCurveChart>
                    </Box>
                    <Divider orientation={'horizontal'}/>

                    <LpingIssuance
                      dashboardDataSet={dashboardDataSet}
                      parentInputDynamicData={{
                        newPrice: newPrice,
                        newIbcIssuance: newIbcIssuance,
                        newLpIssuance: newLpIssuance,
                        newReserve: newReserve
                      }}
                    />
                  </>
              }
              {
                headerTitle === 'HOW IT WORKS' &&
                <HowItWorks/>
              }
              {
                headerTitle === 'TERMS OF SERVICE' &&
                <TermsOfService />
              }
            </Stack>
          </GridItem>

          <GridItem area={'sideinput'} mt='-42px' fontWeight='500'>
              <Stack>
              {
                  headerTitle === "EXPLORE" &&
                  (
                    <>
                      <Tabs onChange={handleNavInputSwitch} >
                        <TabList borderBottom={'none'} pl='5' pr='5'>
                          <Tab>My Holdings</Tab>
                          <Tab>My LP Positions</Tab>
                        </TabList>

                        <TabPanels>
                          <TabPanel p='0'>
                            <AssetHolding parentSetters={{}}></AssetHolding>
                          </TabPanel>
                          <TabPanel p='0'>
                            <LpPosition parentSetters={{}}></LpPosition>
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </>
                  )
                } 
                {
                  headerTitle === 'CREATE NEW IBASSET' &&
                  (
                    <>
                      <Tabs onChange={handleNavInputSwitch} pl='5' pr='5'>
                        <TabList borderBottom={'none'}>
                          <Tab>Create</Tab>
                        </TabList>

                        <TabPanels pt='4'>
                          <TabPanel>
                            <CreateIBAsset parentSetters={{refreshCurve: refreshCurve}} reserveAddress={reserveAssetAddress}></CreateIBAsset>
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </>
                  )
                }               
                {
                  headerTitle === "MINT / BURN" &&
                  (
                    <>
                      <Tabs onChange={handleNavInputSwitch} pl='5' pr='5'>
                        <TabList borderBottom={'none'}>
                          <Tab>Mint</Tab>
                          <Tab>Burn</Tab>
                        </TabList>

                        <TabPanels pt='4'>
                          <TabPanel>
                            <MintTokens
                              dashboardDataSet={dashboardDataSet}
                              parentSetters={{
                                setNewIbcIssuance: setNewIbcIssuance,
                                setNewPrice: setNewPrice,
                                setNewLpIssuance: setNewLpIssuance,
                                setNewReserve: setNewReserve
                              }}
                            />
                          </TabPanel>
                          <TabPanel>
                            <BurnTokens
                                dashboardDataSet={dashboardDataSet}
                                parentSetters={{
                                  setNewIbcIssuance: setNewIbcIssuance,
                                  setNewPrice: setNewPrice,
                                  setNewLpIssuance: setNewLpIssuance,
                                  setNewReserve: setNewReserve
                                }}
                              />
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </>
                  )
                }

                {
                  headerTitle === "ADD / REMOVE LIQUIDITY" &&
                  (
                    <>
                      <Tabs onChange={handleLiquidityNavInputSwitch} pl='5' pr='5'>
                        <TabList borderBottom={'none'}>
                          <Tab>Add</Tab>
                          <Tab>Remove</Tab>
                        </TabList>

                        <TabPanels pt='4'>
                          <TabPanel>
                            <AddLiquidity
                              dashboardDataSet={dashboardDataSet}
                              parentSetters={{
                                setNewIbcIssuance: setNewIbcIssuance,
                                setNewPrice: setNewPrice,
                                setNewLpIssuance: setNewLpIssuance,
                                setNewReserve: setNewReserve
                              }}
                            />
                          </TabPanel>
                          <TabPanel>
                            <RemoveLiquidity
                                dashboardDataSet={dashboardDataSet}
                                parentSetters={{
                                  setNewIbcIssuance: setNewIbcIssuance,
                                  setNewPrice: setNewPrice,
                                  setNewLpIssuance: setNewLpIssuance,
                                  setNewReserve: setNewReserve
                                }}
                              />
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </>
                  )
                
                
                /*

                  Tabbed component

                  Mint/Burn

                  or 

                  Provide / Withdraw

                */}
                {
                  headerTitle === 'HOW IT WORKS' &&
                    <Tabs onChange={handleLiquidityNavInputSwitch} pl='5' pr='5'>
                      <TabList borderBottom={'none'}>
                          <Tab>Useful Links</Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel>
                          <UsefulLinks/>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                }
                <Spacer/>
              </Stack>
          </GridItem>
        </Grid>
      </Show> 
    </>
  )
}
