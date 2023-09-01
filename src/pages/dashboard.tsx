import { Code, Divider, Grid, GridItem, Link, RadioGroup, Spacer, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useRadioGroup, VStack } from "@chakra-ui/react";
import { time } from "console";
import { useEffect, useState } from "react";
import { ColorModeSwitcher } from "../ColorModeSwitcher";
import ConnectWallet from "../components/ConnectWallet";
import MintTokens from "../components/dashboard/mint_tokens";
import { RadioCard } from "../components/radio_card";
import CreatePool from "../components/staging/create_pool";
import MaxTokenApprove from "../components/staging/max_token_approval";
import WrapEth from "../components/staging/wrap_eth";

export function Dashboard(){
  const navOptions = [
    {
      value: 'mintBurn',
      displayText: 'Mint / Burn'
    },
    {
      value: 'lp',
      displayText: 'Add / Remove Liquidity'
    },
    {
      value: 'claim',
      displayText: 'Claim'
    }
  ]

  const [selectedNavItem, setSelectedNavItem] = useState<string>(navOptions[0].value);
  const [headerTitle, setHeaderTitle] = useState<string>(navOptions[0].displayText.toUpperCase());


  // data to fetch 
  // contract's current params
  // contract's current reserves
  // contract's current supply

  // data to fetch if wallet connected
  // user's token balance
  // user's eth balance
  // user's lp balance
  // user's claimable fees 

  // data to generate
  // curve graph plot points

  // reactive hooks
  // left nav option selected
  useEffect(() => {
    if (selectedNavItem === "claim"){
      return
    }

    const headerTitle = navOptions.find(x => x.value === selectedNavItem)?.displayText
    if (!headerTitle){
      return
    }
    setHeaderTitle(headerTitle.toUpperCase())
  }, [selectedNavItem, navOptions])

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'vaults',
    onChange: (val) => setSelectedNavItem(val),
  })
  const group = getRootProps()

  return (
    <Grid
        templateAreas={`
        "sidenav vertline1 header header header"
        "sidenav vertline1 horizline horizline horizline"
        "sidenav vertline1 main vertline2 sideinput"`}
            gridTemplateRows={'70px 1px 1fr'}
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
        <Stack direction="row">
          <Text>{headerTitle}</Text>
          <Spacer/>
          <ConnectWallet />
        </Stack>
      </GridItem>
      <GridItem area={'main'}>
        <Stack>
          <Text>main</Text>
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
                          userBalance={3}
                          currentTokenSupply={1}
                          bondingCurveGenesisPrice={1}
                          bondingCurveGenesisSupply={1}
                          bondingCurveReserve={2}
                          userIbcBalance={1}
                        />
                      </TabPanel>
                      <TabPanel>
                        <MintTokens
                          userBalance={3}
                          currentTokenSupply={1}
                          bondingCurveGenesisPrice={1}
                          bondingCurveGenesisSupply={1}
                          bondingCurveReserve={1}
                          userIbcBalance={1}
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
