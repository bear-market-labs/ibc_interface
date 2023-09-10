import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers } from 'ethers'
import { Button, Input, Stack } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, Interface, parseEther, solidityKeccak256 } from 'ethers/lib/utils'
import { contracts } from '../../config/contracts'

export default function ClaimProtocolFee() {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)

  const sendTransaction = useCallback(async () => {

    if (!wallet){
      return
    }

    if (wallet?.provider) {
      setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
      // if using ethers v6 this is:
      // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    }

    try {
    
      const signer = provider?.getUncheckedSigner()
      const abiCoder = defaultAbiCoder

      const functionDescriptorBytes = arrayify(solidityKeccak256(
        [
          "string"
        ]
        ,
        [
          "claimProtocolReward()" // put function signature here w/ types + no spaces, ex: createPair(address,address)
        ]
      )).slice(0,4)

      const payloadBytes = arrayify(abiCoder.encode(
        [
        ], // array of types; make sure to represent complex types as tuples 
        [
        ] // arg values
      ))


      const txDetails = {
        to: ibcContractAddress,
        data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
      }

      const tx = await signer?.sendTransaction(txDetails)
      const result = await tx?.wait();

      console.log(result)

    } catch (error) {
        console.log(error)
    }
  }, [wallet, provider, ibcContractAddress]);

  return (
    <>
      <Stack direction="row">
        <Button onClick={sendTransaction}>Claim protocol fee</Button>
      </Stack>
    </>
  )
}
