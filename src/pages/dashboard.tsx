import { Divider, Grid, GridItem, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Show, Spacer, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useDisclosure, useRadioGroup, Box } from "@chakra-ui/react";
import { useConnectWallet } from "@web3-onboard/react";
import React, { useEffect, useState } from "react";
import ConnectWallet from "../components/ConnectWallet";
import MintTokens from "../components/dashboard/mint_tokens";
import { RadioCard } from "../components/radio_card";
import { ethers } from 'ethers'
import { contracts } from "../config/contracts";
import { composeMulticallQuery, composeQuery, getFunctionDescriptorBytes } from "../util/ethers_utils";
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
import BondingCurveChart, { IChartParam } from "../components/bondingCurveChart/bonding_curve_chart";
import Logo from "../components/logo";
import * as _ from "lodash";
import MobileDisplay from '../components/dashboard/mobile_display'
import { actionTypes } from "../config/constants";
import ExternalLinks from '../components/dashboard/external_links'
import HowItWorks from "../components/dashboard/how_it_works";
import UsefulLinks from '../components/dashboard/useful_links'

type dashboardProps = {
  mostRecentIbcBlock: any;
  nonWalletProvider: any;
}

export function Dashboard( props: dashboardProps ){
  const {mostRecentIbcBlock, nonWalletProvider} = props

  const navOptions = [
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
  }    
  ]

  const [selectedNavItem, setSelectedNavItem] = useState<string>(navOptions[0].value);
  const [headerTitle, setHeaderTitle] = useState<string>(navOptions[0].displayText.toUpperCase());
  const [{ wallet,  }] = useConnectWallet()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)

  const [dashboardDataSet, setDashboardDataSet] = useState<any>({})
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [newPrice, setNewPrice] = useState<any>()
  const [newIbcIssuance, setNewIbcIssuance] = useState<any>()
  const [newReserve, setNewReserve] = useState<any>()
  const [newLpIssuance, setNewLpIssuance] = useState<any>()

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
  

  useEffect(() => {
    const fetchIbcMetrics = async() => {
      const abiCoder = ethers.utils.defaultAbiCoder

      let multicallQueries = [
        composeMulticallQuery(ibcContractAddress, "curveParameters", [], []),
        composeMulticallQuery(ibcContractAddress, "totalSupply", [], []),
        composeMulticallQuery(ibcContractAddress, "decimals", [], []),
        composeMulticallQuery(ibcContractAddress, "inverseTokenAddress", [], []),
        composeMulticallQuery(ibcContractAddress, "blockRewardEMA", ["uint8"], [1]),
        composeMulticallQuery(ibcContractAddress, "blockRewardEMA", ["uint8"], [0]),
      ]

      let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
      let multicallBytes = await nonWalletProvider.call(multicallQuery)
      let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

      // fetch/set main panel metrics data
      const bondingCurveParamsBytes = multicallResults[0][0] ? multicallResults[0][1] : [[0,0,0,0,0,0,0]]
      const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,uint256,uint256,int256,uint256)"], bondingCurveParamsBytes)

      const lpTokenSupplyBytes = multicallResults[1][0] ? multicallResults[1][1] : [0]
      const lpTokenSupply = abiCoder.decode(["uint"], lpTokenSupplyBytes)[0]

      const lpTokenDecimalsBytes = multicallResults[2][0] ? multicallResults[2][1] : [0]
      const lpTokenDecimals = abiCoder.decode(["uint"], lpTokenDecimalsBytes)[0]

      const inverseTokenAddressBytes = multicallResults[3][0] ? multicallResults[3][1] : [""]
      const inverseTokenAddress = abiCoder.decode(["address"], inverseTokenAddressBytes)[0]

      const stakingRewardEmaBytes = multicallResults[4][0] ? multicallResults[4][1] : [0,0]
      const stakingRewardEma = abiCoder.decode(["uint256", "uint256"], stakingRewardEmaBytes)

      const lpRewardEmaBytes = multicallResults[5][0] ? multicallResults[5][1] : [0,0]
      const lpRewardEma = abiCoder.decode(["uint256", "uint256"], lpRewardEmaBytes)

      multicallQueries = [
        composeMulticallQuery(inverseTokenAddress, "decimals", [], []),
        composeMulticallQuery(inverseTokenAddress,  "balanceOf", ["address"], [ibcContractAddress])
      ]

      multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
      multicallBytes = await nonWalletProvider.call(multicallQuery)
      multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

      const inverseTokenDecimalsBytes = multicallResults[0][0] ? multicallResults[0][1] : [0]
      const inverseTokenDecimals = abiCoder.decode(["uint"], inverseTokenDecimalsBytes)[0]

      const contractInverseTokenBalanceBytes = multicallResults[1][0] ? multicallResults[1][1] : [0]
      const contractInverseTokenBalance = abiCoder.decode(["uint"], contractInverseTokenBalanceBytes)[0]

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
        inverseTokenSupply: bondingCurveParams[0][1].toString(),
        virtualReserveAmount: bondingCurveParams[0][2].toString(),
        virtualInverseTokenAmount: bondingCurveParams[0][3].toString(),
        currentTokenPrice: bondingCurveParams[0][4].toString(),
        invariant: bondingCurveParams[0][5].toString(),
        utilization: bondingCurveParams[0][6].toString()
      };

      dashboardDataSet.lpTokenDecimals = lpTokenDecimals.toString();
      dashboardDataSet.lpTokenSupply = (lpTokenSupply.add(bondingCurveParams[0][2])).toString();
      dashboardDataSet.inverseTokenDecimals = inverseTokenDecimals.toString();
      dashboardDataSet.inverseTokenAddress = inverseTokenAddress.toString();
      dashboardDataSet.contractInverseTokenBalance = contractInverseTokenBalance.toString()

      // compute old k/m params from utilization and invariant
      let k = 1 - Number(ethers.utils.formatUnits(bondingCurveParams[0][6], 18))
      if (k < 0){
        k = 0
      }
      const m = Number(ethers.utils.formatEther(bondingCurveParams[0][4])) 
      * 
      Math.pow(
        Number(ethers.utils.formatUnits(bondingCurveParams[0][1], lpTokenDecimals.toString())),
        k
      )

      chartParam.curveParameter.parameterK = k;
      chartParam.curveParameter.parameterM = m;
      chartParam.currentSupply = Number(bondingCurveParams[0][1].toString())/1e18;

      setNewPrice(dashboardDataSet.bondingCurveParams.currentPrice)
      setNewReserve(dashboardDataSet.bondingCurveParams.reserveAmount)
    }

    fetchIbcMetrics().then(() =>{}).catch((err) => {console.log(err)})

  }, [mostRecentIbcBlock, nonWalletProvider])

  useEffect(() => {

    const fetchWalletInfo = async() => {
      if (wallet?.provider) {
        const provider = new ethers.providers.Web3Provider(wallet.provider, 'any')
        const abiCoder = ethers.utils.defaultAbiCoder

        let multicallQueries = [
          composeMulticallQuery(ibcContractAddress, "curveParameters", [], []),
          composeMulticallQuery(ibcContractAddress, "inverseTokenAddress", [], []),
          composeMulticallQuery(ibcContractAddress, "feeConfig", [], []),
          composeMulticallQuery(ibcContractAddress, "decimals", [], []),
          composeMulticallQuery(ibcContractAddress, "totalSupply", [], []),
          composeMulticallQuery(ibcContractAddress, "balanceOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(ibcContractAddress, "allowance", ["address", "address"], [wallet.accounts[0].address, ibcContractAddress]),
          composeMulticallQuery(ibcContractAddress, "rewardOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(ibcContractAddress, "stakingBalanceOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(ibcContractAddress, "blockRewardEMA", ["uint8"], [1]),
          composeMulticallQuery(ibcContractAddress, "blockRewardEMA", ["uint8"], [0])
        ]
  
        let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])

        const queryResults = await Promise.all([
          provider.getBalance(wallet.accounts[0].address),
          provider.call(multicallQuery),
        ]);

        const ethBalance = queryResults[0];
        // ibc contract state
        
        let multicallBytes = queryResults[1]
        let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

        const bondingCurveParamsBytes = multicallResults[0][0] ? multicallResults[0][1] : [[0,0,0,0,0,0,0]]
        const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,uint256,uint256,int256,uint256)"], bondingCurveParamsBytes)

        
        const inverseTokenAddressBytes = multicallResults[1][0] ? multicallResults[1][1] : ['']
        const inverseTokenAddress = abiCoder.decode(["address"], inverseTokenAddressBytes)[0]

        const feeBytes = multicallResults[2][0] ? multicallResults[2][1] : [Array(actionTypes.length), Array(actionTypes.length), Array(actionTypes.length)]
        const fees = abiCoder.decode([`uint256[${actionTypes.length}]`, `uint256[${actionTypes.length}]`, `uint256[${actionTypes.length}]`], feeBytes)

        // lp token info
        
        const lpTokenDecimalsBytes = multicallResults[3][0] ? multicallResults[3][1] : [0]
        const lpTokenDecimals = abiCoder.decode(["uint"], lpTokenDecimalsBytes)[0]

        
        const lpTokenSupplyBytes = multicallResults[4][0] ? multicallResults[4][1] : [0]
        const lpTokenSupply = abiCoder.decode(["uint"], lpTokenSupplyBytes)[0]

        
        const userLpTokenBalanceBytes = multicallResults[5][0] ? multicallResults[5][1] : [0]
        const userLpTokenBalance = abiCoder.decode(["uint"], userLpTokenBalanceBytes)[0]

        // lp approval state
        
        const userLpTokenAllowanceBytes = multicallResults[6][0] ? multicallResults[6][1] : [0]
        const userLpTokenAllowance = abiCoder.decode(["uint"], userLpTokenAllowanceBytes)[0]

        // fetch rewards data
        
        const userClaimableRewardsBytes = multicallResults[7][0] ? multicallResults[7][1] : [0,0,0,0]
        const userClaimableRewards = abiCoder.decode(["uint256", "uint256", "uint256", "uint256"], userClaimableRewardsBytes)

        const stakingRewardEmaBytes = multicallResults[9][0] ? multicallResults[9][1] : [0,0]
        const stakingRewardEma = abiCoder.decode(["uint256", "uint256"], stakingRewardEmaBytes)
  
        const lpRewardEmaBytes = multicallResults[10][0] ? multicallResults[10][1] : [0,0]
        const lpRewardEma = abiCoder.decode(["uint256", "uint256"], lpRewardEmaBytes)
  
        // fetch staking balance
        
        const userStakingBalanceBytes = multicallResults[8][0] ? multicallResults[8][1] : [0]
        const userStakingBalance = abiCoder.decode(["uint256"], userStakingBalanceBytes)[0]

        multicallQueries = [
          composeMulticallQuery(inverseTokenAddress, "decimals", [], []),
          composeMulticallQuery(inverseTokenAddress, "balanceOf", ["address"], [wallet.accounts[0].address]),
          composeMulticallQuery(inverseTokenAddress, "allowance", ["address", "address"], [wallet.accounts[0].address, ibcContractAddress]),
          composeMulticallQuery(inverseTokenAddress, "symbol", [], []),
          composeMulticallQuery(inverseTokenAddress,  "balanceOf", ["address"], [ibcContractAddress]),
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

        setDashboardDataSet({
          userEthBalance: ethBalance.toString(),
          userIbcTokenBalance: userInverseTokenBalance.toString(),
          inverseTokenDecimals: inverseTokenDecimals.toString(),
          inverseTokenAddress: inverseTokenAddress.toString(),
          inverseTokenSymbol: inverseTokenSymbol,
          bondingCurveParams: {
            reserveAmount: bondingCurveParams[0][0].toString(),
            inverseTokenSupply: bondingCurveParams[0][1].toString(),
            virtualReserveAmount: bondingCurveParams[0][2].toString(),
            virtualInverseTokenAmount: bondingCurveParams[0][3].toString(),
            currentTokenPrice: bondingCurveParams[0][4].toString(),
            invariant: bondingCurveParams[0][5].toString(),
            utilization: bondingCurveParams[0][6].toString()
          },
          userInverseTokenAllowance: userInverseTokenAllowance.toString(),
          lpTokenDecimals: lpTokenDecimals.toString(),
          userLpTokenBalance: userLpTokenBalance.toString(),
          userLpTokenAllowance: userLpTokenAllowance.toString(),
          lpTokenSupply: (lpTokenSupply.add(bondingCurveParams[0][2])).toString(),
          userClaimableLpRewards: userClaimableRewards[0].toString(),
          userClaimableStakingRewards: userClaimableRewards[1].toString(),
          userClaimableLpReserveRewards: userClaimableRewards[2].toString(),
          userClaimableStakingReserveRewards: userClaimableRewards[3].toString(),
          forceUpdate: forceUpdate,
          userStakingBalance: userStakingBalance.toString(),
          fees:{
            lpFee: fees[0].reduce( (acc: any, x:any, i:any) => {
              acc[actionTypes[i]] = x.toString();
              return acc;
            }, {}),
            stakingFee: fees[1].reduce( (acc: any, x:any, i:any) => {
              acc[actionTypes[i]] = x.toString();
              return acc;
            }, {}),
            protocolFee: fees[2].reduce( (acc: any, x:any, i:any) => {
              acc[actionTypes[i]] = x.toString();
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
          contractInverseTokenBalance
        });

        console.log(chartParam);
      }
    }

    fetchWalletInfo()
      .then()
      .catch((err) => console.log("error", err))
  }, [wallet, ibcContractAddress, forceUpdate, updated])

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
    console.log("update chart parameter")
    console.log(newIbcIssuance);
    console.log(newReserve);

    if (selectedNavItem === "mintBurn" ){
      updateChartParam.targetLiquidityChange = null;
      if(newIbcIssuance){
        updateChartParam.targetSupplyChange = (newIbcIssuance - dashboardDataSet.bondingCurveParams.inverseTokenSupply)/dashboardDataSet.bondingCurveParams.inverseTokenSupply;
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

  const handleModalClose = async() => {
    const preModalSelectedNavItem = navOptions.find(x => x.displayText.toUpperCase() === headerTitle.toUpperCase())?.value
    setSelectedNavItem(preModalSelectedNavItem ? preModalSelectedNavItem : navOptions[0].value)

    onClose()
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
                  return(
                    <RadioCard key={item.value} {...radio}>
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
                      <ModalHeader pl='10' pt='7'>
                        <Stack>
                          <Text>{navOptions.find(x => x.value === selectedNavItem)?.displayText.toUpperCase()}</Text>
                          <Text fontSize={'xs'}>{navOptions.find(x => x.value === selectedNavItem)?.description}</Text>
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
                            <Tabs>
                              <TabList mr='-7%' ml='-7%' pl='7%'>
                                <Tab>Stake</Tab>
                                <Tab>Unstake</Tab>
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
            <Divider orientation={'horizontal'} colorScheme={'gray'}/>
          </GridItem>

          <GridItem area={'vertline1'} >
            <Divider orientation={'vertical'} colorScheme={'gray'}/>
          </GridItem>

          <GridItem area={'vertline2'} >
            <Divider orientation={'vertical'} colorScheme={'gray'}/>
          </GridItem>

          <GridItem area={'header'}>
            <Stack ml={7} direction="row" justifyContent={'space-between'}>
              <Stack direction="column" mt='70px'>
                <Text fontSize='xl' textAlign={'left'}>{headerTitle}</Text>            
                <Text fontSize={'xs'}>{navOptions.find(x => x.displayText.toUpperCase() === headerTitle)?.description}</Text>
              </Stack>
              <Stack justifyContent={'center'} mr='7'>
                <ConnectWallet />
              </Stack>
            </Stack>
          </GridItem>

          <GridItem area={'main'} pb='40px'>
            <Stack>
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

                    <Box width="100%" height="400px" padding="10px 20px">
                      <BondingCurveChart  chartParam={chartParam}></BondingCurveChart>
                    </Box>

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

                    <Box width="100%" height="400px" padding="10px 20px">
                      <BondingCurveChart  chartParam={chartParam}></BondingCurveChart>
                    </Box>

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
            </Stack>
          </GridItem>

          <GridItem area={'sideinput'} mt='-42px'>
              <Stack>
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
                      <Tabs onChange={handleNavInputSwitch} pl='5' pr='5'>
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
                  <UsefulLinks/>
                }

                <Spacer/>
              </Stack>
          </GridItem>
        </Grid>
      </Show> 
    </>
  )
}
