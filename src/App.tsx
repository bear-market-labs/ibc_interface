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
import { Analytics } from '@vercel/analytics/react';
import { providerPollingIntervalMilliSeconds } from "./config/constants";

const injected = injectedModule();

const currentEnv = process.env.VERCEL_ENV ?? "local"
const rpcUrl = currentEnv  === "production" ?  process.env.PROD_RPC ?? process.env.REACT_APP_PROD_RPC : process.env.DEV_RPC ?? process.env.REACT_APP_DEV_RPC

let provider = new ethers.providers.JsonRpcProvider(rpcUrl);
provider.pollingInterval = currentEnv == "production" ? Number(process.env.PROD_PROVIDER_POLLING ?? providerPollingIntervalMilliSeconds) : Number(process.env.REACT_APP_PROVIDER_POLLING ?? providerPollingIntervalMilliSeconds)

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
    setMostRecentIbcBlock(log.blockNumber)
  };

  const setupEventListener = (curveAddress: string) => {
    provider.removeAllListeners()
    const eventFilter = {
      address: curveAddress,
    }
    provider.on(eventFilter, handleLog)
  }

  setupEventListener(contracts.default.ibcETHCurveContract)

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
