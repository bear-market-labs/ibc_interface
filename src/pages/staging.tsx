import { Grid, Text, VStack } from "@chakra-ui/react";
import { ColorModeSwitcher } from "../ColorModeSwitcher";
import ConnectWallet from "../components/ConnectWallet";
import ClaimProtocolFee from "../components/staging/claim_protocol_fee";
import CreatePool from "../components/staging/create_pool";
import MaxTokenApprove from "../components/staging/max_token_approval";
import WrapEth from "../components/staging/wrap_eth";

export function StagingPage(){

  return (
    <Grid minH="100vh" p={3}>
    <ColorModeSwitcher justifySelf="flex-end" />
    <VStack spacing={8}>
      <Text>Staging page</Text>
      <WrapEth />
      <MaxTokenApprove />
      <CreatePool />
      <ClaimProtocolFee />
      <ConnectWallet />
    </VStack>
  </Grid>
  )
}
