import { Code, Divider, Grid, GridItem, Link, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, RadioGroup, Spacer, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useDisclosure, useRadioGroup, VStack } from "@chakra-ui/react";
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

export function Dashboard(){
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
    }
  ]

  const [selectedNavItem, setSelectedNavItem] = useState<string>(navOptions[0].value);
  const [headerTitle, setHeaderTitle] = useState<string>(navOptions[0].displayText.toUpperCase());
  const [{ wallet, connecting }] = useConnectWallet()
  const [userEthBalance, setUserEthBalance] = useState<string>('0')
  const [ethersProvider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)

  const [dashboardDataSet, setDashboardDataSet] = useState<any>({})
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [newPrice, setNewPrice] = useState<any>()
  const [newIbcIssuance, setNewIbcIssuance] = useState<any>()
  const [newReserve, setNewReserve] = useState<any>()
  const [newLpIssuance, setNewLpIssuance] = useState<any>()

  const [updated, updateState] = React.useState<any>();
  const forceUpdate = React.useCallback(() => updateState({}), []);

  useEffect(() => {

    const fetchWalletInfo = async() => {
      if (wallet?.provider) {
        const provider = new ethers.providers.Web3Provider(wallet.provider, 'any')
        setProvider(provider)
        const abiCoder = ethers.utils.defaultAbiCoder
        
        //  user balance info
        const ethBalance = await provider.getBalance(wallet.accounts[0].address)

        setUserEthBalance(ethBalance === undefined ? '0' : ethers.utils.formatEther(ethBalance.toString()))

        // ibc contract state
        const bondingCurveParamsQuery = composeQuery(ibcContractAddress, "getCurveParameters", [], [])
        const bondingCurveParamsBytes = await provider.call(bondingCurveParamsQuery)
        const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,int256,uint256)"], bondingCurveParamsBytes)

        const inverseTokenAddressQuery = composeQuery(ibcContractAddress, "getInverseTokenAddress", [], [])
        const inverseTokenAddressBytes = await provider.call(inverseTokenAddressQuery)
        const inverseTokenAddress = abiCoder.decode(["address"], inverseTokenAddressBytes)[0]

        const feeQuery = composeQuery(ibcContractAddress, "getFeeConfig", [], [])
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
        const userClaimableLpRewardsQuery = composeQuery(ibcContractAddress, "getReward", ["address", "uint8"], [wallet.accounts[0].address, 0])
        const userClaimableLpRewardsBytes = await provider.call(userClaimableLpRewardsQuery)
        const userClaimableLpRewards = abiCoder.decode(["uint256"], userClaimableLpRewardsBytes)[0]

        const userClaimableStakingRewardsQuery = composeQuery(ibcContractAddress, "getReward", ["address", "uint8"], [wallet.accounts[0].address, 0])
        const userClaimableStakingRewardsBytes = await provider.call(userClaimableStakingRewardsQuery)
        const userClaimableStakingRewards = abiCoder.decode(["uint256"], userClaimableStakingRewardsBytes)[0]

        // fetch staking balance
        const userStakingBalanceQuery = composeQuery(ibcContractAddress, "getStakingBalance", ["address"], [wallet.accounts[0].address])
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
            k: bondingCurveParams[0][3].toString(),
            m: bondingCurveParams[0][4].toString()
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
        })
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

  const handleRadioChange = async (val: any) => {
        
    if (val === "claim" || val === "stake"){
      onOpen()
    }

    setSelectedNavItem(val)
  };

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'vaults',
    onChange: (val) => handleRadioChange(val),
    
  })
  const group = getRootProps()


  return (
    <Grid
        templateAreas={`
        "sidenav vertline1 header header header"
        "sidenav vertline1 horizline horizline horizline"
        "sidenav vertline1 main vertline2 sideinput"`}
            gridTemplateRows={'100px 1px 1fr'}
            gridTemplateColumns={'200px 1px 2fr 1px 1fr'}
            gap='0'
    >
      <GridItem area={'sidenav'}>
        <Stack spacing={10}>
          <Stack spacing={0}>
            <Text ml={3} align={"left"}>INVERSE</Text>
            <Text ml={3} align={"left"}>BONDING</Text>
            <Text ml={3} align={"left"}>CURVE</Text>
          </Stack>

          <Stack {...group} spacing={3}>
            {navOptions.map((item) => {
              const radio = getRadioProps({ value: item.value })
              return(
                <RadioCard key={item.value} {...radio}>
                  <Text align="left">{item.displayText}</Text>
                </RadioCard>
              )
            })}
          </Stack>


          <Modal
              isOpen={isOpen}
              onClose={onClose}
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
        <Stack ml={7} mt={3} spacing={0}>
          <Stack direction="row">
            <Text fontSize={'l'}>{headerTitle}</Text>
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

                <Text ml={7} mt={25} mb={25}>Awesome chart component</Text>

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
                <Text ml={7} mt={7} align="left">RESERVE</Text>
              </>
          }


          {/*

          chart component

          */}
          <Spacer/>
          {/*

          Calculation output text based on sideinput

          */}
        </Stack>

      </GridItem>
      <GridItem area={'sideinput'}>
          <Stack>
            {
              headerTitle === "MINT / BURN" &&
              (
                <>
                  <Tabs>
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
                            setNewLpIssuance: setNewIbcIssuance,
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
                              setNewLpIssuance: setNewIbcIssuance,
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
                  <Tabs>
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
                            setNewLpIssuance: setNewIbcIssuance,
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
                              setNewLpIssuance: setNewIbcIssuance,
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
