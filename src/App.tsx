import {
  ChakraProvider,
  Box,
} from "@chakra-ui/react"

import { init, useConnectWallet } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import { ethers } from 'ethers'
import { Route, Routes } from "react-router-dom";
import { StagingPage } from "./pages/staging";
import { Dashboard } from "./pages/dashboard";
import theme from "./theme";
import { contracts, } from "./config/contracts";
import { useState } from "react";

const injected = injectedModule();
const rpcUrl = `https://rpc.tenderly.co/fork/cc2b5331-1bfa-4756-84ab-e2f2f63a91d5`

let provider = new ethers.providers.JsonRpcProvider(rpcUrl);

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
  const [mostRecentIbcBlock, setMostRecentIbcBlock ] = useState<any>()

  provider.removeAllListeners()
  const handleLog = (log: any) => {
    // Process the log data here
    console.log('Received LOG:', log);
    setMostRecentIbcBlock(log.blockNumber)
  };
  
  const eventFilter = {
    address: contracts.tenderly.ibcETHCurveContract,
  };
  
  provider.on(eventFilter, handleLog);


  return (
  <ChakraProvider theme={theme}>
    <Box textAlign="center" fontSize="xl">
      <Routes>
        <Route path="/" element={<Dashboard mostRecentIbcBlock={mostRecentIbcBlock} nonWalletProvider={provider} />} />
        <Route path="/staging" element={<StagingPage/>}/>
      </Routes>
    </Box>
  </ChakraProvider>
)}
