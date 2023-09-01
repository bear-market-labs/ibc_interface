import { Code, Grid, Link, Text, VStack } from "@chakra-ui/react";
import { ColorModeSwitcher } from "../ColorModeSwitcher";
import ConnectWallet from "../components/ConnectWallet";
import { Logo } from "../Logo";

export function CraPage(){

  return (
    <Grid minH="100vh" p={3}>
    <ColorModeSwitcher justifySelf="flex-end" />
    <VStack spacing={8}>
      <Logo h="40vmin" pointerEvents="none" />
      <Text>
        Edit <Code fontSize="xl">src/App.tsx</Code> and save to reload.
      </Text>
      <Link
        color="teal.500"
        href="https://chakra-ui.com"
        fontSize="2xl"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn Chakra
      </Link>
      <ConnectWallet />
      {/* <Button disabled={connecting} onClick={() => (wallet ? disconnect(wallet) : connect())}>
    
      {connecting ? 'connecting' : wallet ? 'disconnect' : 'connect'}

      </Button> */}
    </VStack>
  </Grid>
  )
}
