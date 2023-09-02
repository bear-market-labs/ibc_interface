import * as React from "react"
import {
  ChakraProvider,
  Box,
  Text,
  Link,
  VStack,
  Code,
  Grid,
  //theme,
  Button,
} from "@chakra-ui/react"
import { ColorModeSwitcher } from "./ColorModeSwitcher"
import { Logo } from "./Logo"

import { Web3OnboardProvider, init, useConnectWallet } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import { ethers } from 'ethers'
import ConnectWallet from "./components/ConnectWallet";
import { Route, Routes } from "react-router-dom";
import { CraPage } from "./pages/cra_ok";
import { StagingPage } from "./pages/staging";
import { Dashboard } from "./pages/dashboard";

const injected = injectedModule();
const rpcUrl = `https://rpc.tenderly.co/fork/cc2b5331-1bfa-4756-84ab-e2f2f63a91d5`

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
  <ChakraProvider >
    <Box textAlign="center" fontSize="xl">
      <Routes>
        <Route path="/" element={<CraPage />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/staging" element={<StagingPage/>}/>
      </Routes>
    </Box>
  </ChakraProvider>
)}
