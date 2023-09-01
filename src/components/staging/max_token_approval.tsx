import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  constants, ethers } from 'ethers'
import type {
    TokenSymbol
  } from '@web3-onboard/common'
import { Button, Input, Stack } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, Interface, parseEther, solidityKeccak256 } from 'ethers/lib/utils'
import { contracts } from '../../config/contracts'

interface Account {
    address: string,
    balance: Record<TokenSymbol, string> | null,
    ens: {name: string|undefined, avatar: string|undefined}
}

export default function MaxTokenApprove() {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [account, setAccount] = useState<Account | null>(null)
  const [tokenAddress, setTokenAddress] = useState<string>()
  const [guy, setGuy] = useState<string>()

  useEffect(() => {
    if (wallet?.provider) {
      const { name, avatar } = wallet?.accounts[0].ens ?? {}
      setAccount({
        address: wallet.accounts[0].address,
        balance: wallet.accounts[0].balance,
        ens: { name, avatar: avatar?.url }
      })
    }
  }, [wallet])

  useEffect(() => {
    // If the wallet has a provider than the wallet is connected
    if (wallet?.provider) {
      setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
      // if using ethers v6 this is:
      // ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
    }
  }, [wallet])

  const sendTransaction = useCallback(async () => {

    if (!wallet || !provider || !tokenAddress){
      return
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
          "approve(address,uint)" 
        ] // put function signature here w/ types + no spaces, ex: createPair(address,address)
      )).slice(0,4)

      const payloadBytes = arrayify(abiCoder.encode(
        [
          "address",
          "uint",
        ], // array of types; make sure to represent complex types as tuples 
        [
          guy,
          constants.MaxUint256
        ] // arg values; note https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder--methods
      ))


      const txDetails = {
        to: tokenAddress,
        data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
      }

      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      console.log(result)

    } catch (error) {
        console.log(error)
    }
  }, [tokenAddress, guy, wallet, provider]);

  return (
    <>
      <Stack direction="row">
        <Input
          name="tokenAddress"
          type="text"
          value={tokenAddress}
          placeholder={`erc20 token address`}
          onChange={e => setTokenAddress(e.target.value)}
          width="auto"
        />
        <Input
          name="guy"
          type="text"
          value={guy}
          placeholder={`address allowed to take max`}
          onChange={e => setGuy(e.target.value)}
          width="auto"
        />
        <Button onClick={sendTransaction}>Max approve</Button>
      </Stack>
    </>
  )
}
