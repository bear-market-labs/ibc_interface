import { Code, Divider, Grid, GridItem, Link, Spacer, Stack, Tab, Text, VStack } from "@chakra-ui/react";
import { ColorModeSwitcher } from "../ColorModeSwitcher";
import ConnectWallet from "../components/ConnectWallet";
import CreatePool from "../components/staging/create_pool";
import MaxTokenApprove from "../components/staging/max_token_approval";
import WrapEth from "../components/staging/wrap_eth";

export function Dashboard(){


  return (
    <Grid
        templateAreas={`
        "sidenav vertline1 header header header"
        "sidenav vertline1 horizline horizline horizline"
        "sidenav vertline1 main vertline2 sideinput"`}
            gridTemplateRows={'70px 1px 1fr'}
            gridTemplateColumns={'150px 1px 2fr 1px 1fr'}
            gap='0'
    >
      <GridItem area={'sidenav'}>
        <Stack spacing={0}>
          <Text ml={3} align={"left"}>INVERSE</Text>
          <Text ml={3} align={"left"}>BONDING</Text>
          <Text ml={3} align={"left"}>CURVE</Text>
          {/*radio group
            mint/burn
            lp
            claim
          */}
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
          {/*
            Mint / burn 

            or

            Add / remove liquidity

          */}
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
            <Text>input</Text>
            {/*

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
