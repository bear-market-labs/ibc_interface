import * as React from "react"
import {
  ChakraProvider,
  Box,
  Text,
  Link,
  VStack,
  Code,
  Grid,
  theme,
  Button,
} from "@chakra-ui/react"
import { ColorModeSwitcher } from "./ColorModeSwitcher"
import { Logo } from "./Logo"

import { Web3OnboardProvider, init, useConnectWallet } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import { ethers } from 'ethers'
import ConnectWallet from "./components/ConnectWallet";

const injected = injectedModule();
const infuraKey = '525a0872832e464aa88f4e2c090942be'
const rpcUrl = `https://mainnet.infura.io/v3/${infuraKey}`
const apiKey = "24db31c6-b243-4c46-bf16-92e0a675234c"

init({
  // apiKey,
  wallets: [injected],
  chains: [
    {
      id: '0x1',
      token: 'ETH',
      label: 'Ethereum Mainnet',
      rpcUrl
    },
    {
      id: '0x2105',
      token: 'ETH',
      label: 'Base',
      rpcUrl: 'https://mainnet.base.org'
    }
  ]
})

export const App = () => {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()

  // create an ethers provider
  let ethersProvider

  if (wallet) {
    // if using ethers v6 this is:
    // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    ethersProvider = new ethers.providers.Web3Provider(wallet.provider, 'any')
  }
  return (
  <ChakraProvider theme={theme}>
    <Box textAlign="center" fontSize="xl">
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
    </Box>
  </ChakraProvider>
)}
