import { Code, Grid, GridItem, Link, Spacer, Stack, Tab, Text, VStack } from "@chakra-ui/react";
import { ColorModeSwitcher } from "../ColorModeSwitcher";
import ConnectWallet from "../components/ConnectWallet";
import CreatePool from "../components/staging/create_pool";
import MaxTokenApprove from "../components/staging/max_token_approval";
import WrapEth from "../components/staging/wrap_eth";

export function Dashboard(){


  return (
    <Grid
        templateAreas={`
        "sidenav header header"
        "sidenav main sideinput"`}
            gridTemplateColumns={'150px 2fr 1fr'}
            gridTemplateRows={'50px 1fr'}
            gap='6'
    >
      <GridItem area={'sidenav'}>
        <Stack>
          <Text>Inverse Bonding Curve</Text>
          {/*radio group
            mint/burn
            lp
            claim
          */}
        </Stack>
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
          {/*

          chart component

          */}
          {/*

          Calculation output text based on sideinput

          */}
        </Stack>

      </GridItem>
      <GridItem area={'sideinput'}>
          <Stack>
            {/*

              Tabbed component

              Mint/Burn

              or 

              Provide / Withdraw

            */}
          </Stack>
      </GridItem>

    </Grid>

  )
}
