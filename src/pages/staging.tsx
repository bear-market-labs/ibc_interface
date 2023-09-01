import { Code, Grid, Link, Text, VStack } from "@chakra-ui/react";
import { ColorModeSwitcher } from "../ColorModeSwitcher";
import ConnectWallet from "../components/ConnectWallet";
import CreatePool from "../components/staging/create_pool";
import WrapEth from "../components/staging/wrap_eth";

export function StagingPage(){

  return (
    <Grid minH="100vh" p={3}>
    <ColorModeSwitcher justifySelf="flex-end" />
    <VStack spacing={8}>
      <Text>Staging page</Text>
      <WrapEth />
      <CreatePool />
      <ConnectWallet />
    </VStack>
  </Grid>
  )
}
