import { Code, Divider, Grid, GridItem, Link, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, RadioGroup, Spacer, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useDisclosure, useRadioGroup, VStack, Box } from "@chakra-ui/react";
import { useConnectWallet } from "@web3-onboard/react";
import React, { useEffect, useState } from "react";
import ConnectWallet from "../components/ConnectWallet";
import MintTokens from "../components/dashboard/mint_tokens";
import { RadioCard } from "../components/radio_card";
import { ethers } from 'ethers'
import { contracts } from "../config/contracts";
import { composeQuery, getFunctionDescriptorBytes } from "../util/ethers_utils";
import BurnTokens from "../components/dashboard/burn_tokens";
import AddLiquidity from "../components/dashboard/add_liquidity";
import RemoveLiquidity from "../components/dashboard/remove_liquidity";
import { colors } from "../config/style";
import ClaimLpRewards from "../components/dashboard/claim_lp_rewards";
import ClaimStakingRewards from "../components/dashboard/claim_staking_rewards";
import StakeIbc from "../components/dashboard/stake_ibc";
import UnstakeIbc from "../components/dashboard/unstake_ibc";
import MintBurnPrice from "../components/dashboard/mint_burn_price";
import MintBurnIssuance from "../components/dashboard/mint_burn_issuance";
import LpingReserve from "../components/dashboard/lping_reserve";
import LpingIssuance from "../components/dashboard/lping_issuance";
import BondingCurveChart, { IChartParam } from "../components/bondingCurveChart/bonding_curve_chart";
import Logo from "../components/logo";
import * as _ from "lodash";

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
      description: 'Mint tokens with inversed market properties, first of its kind'
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
      value: 'docs',
      displayText: "Docs",
      description: "documentation"
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

      // fetch/set main panel metrics data
      const bondingCurveParamsQuery = composeQuery(ibcContractAddress, "curveParameters", [], [])
      const bondingCurveParamsBytes = await nonWalletProvider.call(bondingCurveParamsQuery)
      const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,int256,uint256)"], bondingCurveParamsBytes)

      const lpTokenSupplyQuery = composeQuery(ibcContractAddress, "totalSupply", [], [])
      const lpTokenSupplyBytes = await nonWalletProvider.call(lpTokenSupplyQuery)
      const lpTokenSupply = abiCoder.decode(["uint"], lpTokenSupplyBytes)[0]

      const lpTokenDecimalsQuery = composeQuery(ibcContractAddress, "decimals", [], [])
      const lpTokenDecimalsBytes = await nonWalletProvider.call(lpTokenDecimalsQuery)
      const lpTokenDecimals = abiCoder.decode(["uint"], lpTokenDecimalsBytes)[0]

      dashboardDataSet.bondingCurveParams = {
        reserveAmount: bondingCurveParams[0][0].toString(),
        inverseTokenSupply: bondingCurveParams[0][1].toString(),
        currentTokenPrice: bondingCurveParams[0][2].toString(),
        invariant: bondingCurveParams[0][3].toString(),
        utilization: bondingCurveParams[0][4].toString()
      };

      dashboardDataSet.lpTokenDecimals = lpTokenDecimals.toString();
      dashboardDataSet.lpTokenSupply = lpTokenSupply.toString();

      chartParam.curveParameter.parameterK = Number(bondingCurveParams[0][3].toString())/1e18;
      chartParam.curveParameter.parameterM = Number(bondingCurveParams[0][4].toString())/1e18;
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
        
        //  user balance info
        const ethBalance = await provider.getBalance(wallet.accounts[0].address)

        // ibc contract state
        const bondingCurveParamsQuery = composeQuery(ibcContractAddress, "curveParameters", [], [])
        const bondingCurveParamsBytes = await provider.call(bondingCurveParamsQuery)
        const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,int256,uint256)"], bondingCurveParamsBytes)

        const inverseTokenAddressQuery = composeQuery(ibcContractAddress, "inverseTokenAddress", [], [])
        const inverseTokenAddressBytes = await provider.call(inverseTokenAddressQuery)
        const inverseTokenAddress = abiCoder.decode(["address"], inverseTokenAddressBytes)[0]

        const feeQuery = composeQuery(ibcContractAddress, "feeConfig", [], [])
        const feeBytes = await provider.call(feeQuery)
        const fees = abiCoder.decode(["uint256", "uint256", "uint256"], feeBytes)

        // ibc token info
        const inverseTokenDecimalsQuery = composeQuery(inverseTokenAddress, "decimals", [], [])
        const inverseTokenDecimalsBytes = await provider.call(inverseTokenDecimalsQuery)
        const inverseTokenDecimals = abiCoder.decode(["uint"], inverseTokenDecimalsBytes)[0]

        const userInverseTokenBalanceQuery = composeQuery(inverseTokenAddress, "balanceOf", ["address"], [wallet.accounts[0].address])
        const userInverseTokenBalanceBytes = await provider.call(userInverseTokenBalanceQuery)
        const userInverseTokenBalance = abiCoder.decode(["uint"], userInverseTokenBalanceBytes)[0]

        // ibc approval state
        const userInverseTokenAllowanceQuery = composeQuery(inverseTokenAddress, "allowance", ["address", "address"], [wallet.accounts[0].address, ibcContractAddress])
        const userInverseTokenAllowanceBytes = await provider.call(userInverseTokenAllowanceQuery)
        const userInverseTokenAllowance = abiCoder.decode(["uint"], userInverseTokenAllowanceBytes)[0]

        // lp token info
        const lpTokenDecimalsQuery = composeQuery(ibcContractAddress, "decimals", [], [])
        const lpTokenDecimalsBytes = await provider.call(lpTokenDecimalsQuery)
        const lpTokenDecimals = abiCoder.decode(["uint"], lpTokenDecimalsBytes)[0]

        const lpTokenSupplyQuery = composeQuery(ibcContractAddress, "totalSupply", [], [])
        const lpTokenSupplyBytes = await provider.call(lpTokenSupplyQuery)
        const lpTokenSupply = abiCoder.decode(["uint"], lpTokenSupplyBytes)[0]

        const userLpTokenBalanceQuery = composeQuery(ibcContractAddress, "balanceOf", ["address"], [wallet.accounts[0].address])
        const userLpTokenBalanceBytes = await provider.call(userLpTokenBalanceQuery)
        const userLpTokenBalance = abiCoder.decode(["uint"], userLpTokenBalanceBytes)[0]

        // lp approval state
        const userLpTokenAllowanceQuery = composeQuery(ibcContractAddress, "allowance", ["address", "address"], [wallet.accounts[0].address, ibcContractAddress])
        const userLpTokenAllowanceBytes = await provider.call(userLpTokenAllowanceQuery)
        const userLpTokenAllowance = abiCoder.decode(["uint"], userLpTokenAllowanceBytes)[0]

        // fetch rewards data
        const userClaimableLpRewardsQuery = composeQuery(ibcContractAddress, "rewardOf", ["address", "uint8"], [wallet.accounts[0].address, 0])
        const userClaimableLpRewardsBytes = await provider.call(userClaimableLpRewardsQuery)
        const userClaimableLpRewards = abiCoder.decode(["uint256"], userClaimableLpRewardsBytes)[0]

        const userClaimableStakingRewardsQuery = composeQuery(ibcContractAddress, "rewardOf", ["address", "uint8"], [wallet.accounts[0].address, 1])
        const userClaimableStakingRewardsBytes = await provider.call(userClaimableStakingRewardsQuery)
        const userClaimableStakingRewards = abiCoder.decode(["uint256"], userClaimableStakingRewardsBytes)[0]

        // fetch staking balance
        const userStakingBalanceQuery = composeQuery(ibcContractAddress, "stakingBalanceOf", ["address"], [wallet.accounts[0].address])
        const userStakingBalanceBytes = await provider.call(userStakingBalanceQuery)
        const userStakingBalance = abiCoder.decode(["uint256"], userStakingBalanceBytes)[0]

        setDashboardDataSet({
          userEthBalance: ethBalance.toString(),
          userIbcTokenBalance: userInverseTokenBalance.toString(),
          inverseTokenDecimals: inverseTokenDecimals.toString(),
          inverseTokenAddress: inverseTokenAddress.toString(),
          bondingCurveParams: {
            reserveAmount: bondingCurveParams[0][0].toString(),
            inverseTokenSupply: bondingCurveParams[0][1].toString(),
            currentTokenPrice: bondingCurveParams[0][2].toString(),
            invariant: bondingCurveParams[0][3].toString(),
            utilization: bondingCurveParams[0][4].toString()
          },
          userInverseTokenAllowance: userInverseTokenAllowance.toString(),
          lpTokenDecimals: lpTokenDecimals.toString(),
          userLpTokenBalance: userLpTokenBalance.toString(),
          userLpTokenAllowance: userLpTokenAllowance.toString(),
          lpTokenSupply: lpTokenSupply.toString(),
          userClaimableStakingRewards: userClaimableStakingRewards.toString(),
          userClaimableLpRewards: userClaimableLpRewards.toString(),
          forceUpdate: forceUpdate,
          userStakingBalance: userStakingBalance.toString(),
          fees:{
            lpFee: fees[0].toString(),
            stakingFee: fees[1].toString(),
            protocolFee: fees[2].toString(),
          }
        });

        console.log('------->set dashboard infor');
        console.log(dashboardDataSet);

        chartParam.curveParameter.parameterK = Number(bondingCurveParams[0][3].toString())/1e18;
        chartParam.curveParameter.parameterM = Number(bondingCurveParams[0][4].toString())/1e18;
        chartParam.currentSupply = Number(bondingCurveParams[0][1].toString())/1e18;
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
    console.log(newIbcIssuance);
    console.log(dashboardDataSet);
    // if(dashboardDataSet?.bondingCurveParams && dashboardDataSet?.inverseTokenSupply){
    //   chartParam.curveParameter.parameterK = Number(dashboardDataSet.bondingCurveParams.k)/1e18;
    //   chartParam.curveParameter.parameterM = Number(dashboardDataSet.bondingCurveParams.m)/1e18;
    //   chartParam.currentSupply = Number(dashboardDataSet.inverseTokenSupply)/1e18;
    // }

    if (selectedNavItem === "mintBurn" ){
      updateChartParam.newCurveParam = null;
      if(newIbcIssuance){
        updateChartParam.targetSupply = Number(newIbcIssuance)/1e18;
      }else{
        updateChartParam.targetSupply = null; 
      }
    }else if(selectedNavItem === "lp"){
      updateChartParam.targetSupply = null; 
      if(newReserve){
        console.log(dashboardDataSet.bondingCurveParams);
        console.log(dashboardDataSet.bondingCurveParams.inverseTokenSupply);
        console.log(newReserve); 
        const price = Number(dashboardDataSet.bondingCurveParams.currentTokenPrice)/1e18;
        const supply = Number(dashboardDataSet.bondingCurveParams.inverseTokenSupply)/1e18;
        const reserve = Number(newReserve)/1e18;
        const k = 1 - price * supply / reserve;
        updateChartParam.newCurveParam = {
          parameterK: k,
          parameterM: price * (supply ** k)
        }
  
  
        // _parameterK = ONE_INT - int256((currentPrice.mulDown(currentIbcSupply)).divDown(currentBalance));
        // require(_parameterK < ONE_INT, ERR_PARAM_UPDATE_FAIL);
        // _parameterM = currentPrice.mulDown(currentIbcSupply.pow(_parameterK));
      }else{
        updateChartParam.newCurveParam = null;
      }
    }else{
      return;
    }




    
    console.log("-----------> new chart parameter");
    console.log(updateChartParam);
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
        <Stack spacing={10}>
          <Stack spacing={0}>
            <Logo/>
          </Stack>

          <Stack {...group} spacing='5' mt='7'>
            {navOptions.map((item) => {
              const radio = getRadioProps({ value: item.value })
              return(
                <RadioCard key={item.value} {...radio}>
                  <Text align="left" fontSize={'lg'}>{item.displayText}</Text>
                </RadioCard>
              )
            })}
          </Stack>


          <Modal
              isOpen={isOpen}
              onClose={handleModalClose}
              scrollBehavior='inside'
              isCentered
              size='sm'>
              <ModalOverlay
                  backdropFilter='blur(20px)' />
              <ModalContent
                  backgroundColor={colors.ROYAL}
                  boxShadow='rgb(0 0 0 / 40%) 0px 0px 33px 8px'>
                  <ModalHeader>
                    <Stack>
                      <Text>{navOptions.find(x => x.value === selectedNavItem)?.displayText.toUpperCase()}</Text>
                      <Text fontSize={'xs'}>{navOptions.find(x => x.value === selectedNavItem)?.description}</Text>
                    </Stack>
                  </ModalHeader>
                  <ModalCloseButton />
                  <ModalBody pb={6}>
                    {
                      selectedNavItem === "stake" &&
                      <>
                        <Tabs>
                          <TabList>
                            <Tab>Stake</Tab>
                            <Tab>Unstake</Tab>
                          </TabList>
                          <TabPanels>
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
                        <Tabs>
                          <TabList>
                            <Tab>LP</Tab>
                            <Tab>Staking</Tab>
                          </TabList>
                          <TabPanels>
                            <TabPanel>
                              <ClaimLpRewards dashboardDataSet={dashboardDataSet}/>
                            </TabPanel>
                            <TabPanel>
                              <ClaimStakingRewards dashboardDataSet={dashboardDataSet}/>
                            </TabPanel>
                          </TabPanels>
                        </Tabs>
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
        <Stack ml={7} spacing={0}>
          <Stack direction="row" mt='70px' mr='7'>
            <Text fontSize='xl'>{headerTitle}</Text>
            <Spacer/>
            <ConnectWallet />
          </Stack>
          <Stack direction="row">
            <Text fontSize={'xs'}>{navOptions.find(x => x.displayText.toUpperCase() === headerTitle)?.description}</Text>
          </Stack>
        </Stack>

      </GridItem>

      <GridItem area={'main'}>
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
        </Stack>

      </GridItem>
      <GridItem area={'sideinput'}>
          <Stack>
            {
              headerTitle === "MINT / BURN" &&
              (
                <>
                  <Tabs onChange={handleNavInputSwitch}>
                    <TabList>
                      <Tab>Mint</Tab>
                      <Tab>Burn</Tab>
                    </TabList>

                    <TabPanels>
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
                  <Tabs onChange={handleNavInputSwitch}>
                    <TabList>
                      <Tab>Add</Tab>
                      <Tab>Remove</Tab>
                    </TabList>

                    <TabPanels>
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

            <Spacer/>
          </Stack>
      </GridItem>

    </Grid>

  )
}
