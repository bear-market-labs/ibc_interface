import {
  ChakraProvider,
  Box,
} from "@chakra-ui/react"

import { init, useConnectWallet } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import { ethers } from 'ethers'
import { Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/dashboard";
import theme from "./theme";
import { contracts, } from "./config/contracts";
import { useState } from "react";
import { curves } from "./config/curves";
import { Analytics } from '@vercel/analytics/react';

const injected = injectedModule();
const rpcUrl = `https://eth.llamarpc.com`

let provider = new ethers.providers.JsonRpcProvider(rpcUrl);
provider.pollingInterval = 30000

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
  ],
  connect:{
    autoConnectLastWallet: true
  }
})

export const App = () => {
  const [mostRecentIbcBlock, setMostRecentIbcBlock ] = useState<any>()
  const handleLog = (log: any) => {
    // Process the log data here
    console.log('Received LOG:', log);
    setMostRecentIbcBlock(log.blockNumber)
  };

  const setupEventListener = (curveAddress: string) => {
    provider.removeAllListeners()
    const eventFilter = {
      address: curveAddress,
    }
    provider.on(eventFilter, handleLog)
  }

  setupEventListener(contracts.tenderly.ibcETHCurveContract)

  return (
  <ChakraProvider theme={theme}>
    <Box textAlign="center" fontSize="xl">
      <Routes>
        <Route path="/explore" element={<Dashboard mostRecentIbcBlock={mostRecentIbcBlock} nonWalletProvider={provider} setupEventListener={setupEventListener} key="1"/>} />
        <Route path="/terms" element={<Dashboard mostRecentIbcBlock={mostRecentIbcBlock} nonWalletProvider={provider} setupEventListener={setupEventListener} key="3"/>} />
        <Route path="/:reserveAsset?" element={<Dashboard mostRecentIbcBlock={mostRecentIbcBlock} nonWalletProvider={provider} setupEventListener={setupEventListener} key="2"/>} />
      </Routes>
    </Box>
    <Analytics />
  </ChakraProvider>
)}
