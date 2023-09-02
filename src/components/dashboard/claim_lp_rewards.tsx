import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers } from 'ethers'
import { Box, Button, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, formatUnits, parseEther, parseUnits, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'


import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'

type mintProps = {
  dashboardDataSet: any;
}

export default function ClaimLpRewards(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const {dashboardDataSet} = props

  const userClaimableLpRewards = BigNumber.from("userClaimableLpRewards" in dashboardDataSet ? dashboardDataSet.userClaimableLpRewards : '0')
  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const forceUpdate = dashboardDataSet.forceUpdate;
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // If the wallet has a provider than the wallet is connected
    if (wallet?.provider) {
      setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
      // if using ethers v6 this is:
      // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    }
  }, [wallet])

  const sendTransaction = useCallback(async () => {

    if (!wallet || !provider){
      return
    }

    if (wallet?.provider) {
      setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
      // if using ethers v6 this is:
      // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    }

    try {
      setIsProcessing(true)
      const signer = provider?.getUncheckedSigner()
      const abiCoder = defaultAbiCoder

      const functionDescriptorBytes = arrayify(solidityKeccak256(
        [
          "string"
        ]
        ,
        [
          "claimReward(address,uint8)" // put function signature here w/ types + no spaces, ex: createPair(address,address)
        ]
      )).slice(0,4)
        
      const payloadBytes = arrayify(abiCoder.encode(
        [
          "address",
          "uint8"
        ], // array of types; make sure to represent complex types as tuples 
        [
          wallet.accounts[0].address,
          0
        ] // arg values
      ))

      const txDetails = {
        to: ibcContractAddress,
        data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
      }

      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      console.log(result)

    } catch (error) {
        console.log(error)
    }
    setIsProcessing(true)
    forceUpdate()
  }, [wallet, provider, ibcContractAddress]);

  return (
    <>
      <Stack>
        <Text align="left">YOU HAVE ACCRUED</Text>
        <Text fontSize={'2xl'}>{`${Number(formatUnits(userClaimableLpRewards, inverseTokenDecimals)).toFixed(4)} IBC`}</Text>
        {
          isProcessing &&
          <DefaultSpinner />
        }
        <Button onClick={sendTransaction}>Claim</Button>
      </Stack>
    </>
  )
}
