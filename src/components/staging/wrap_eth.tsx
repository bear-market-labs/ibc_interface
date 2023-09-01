import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers } from 'ethers'
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

export default function WrapEth() {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [account, setAccount] = useState<Account | null>(null)
  const [amount, setAmount] = useState<Number>()
  const [wethAddress, ] = useState<string>(contracts.tenderly.wethAddress)

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

    if (!wallet || !provider || !amount){
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
          "deposit()" // put function signature here w/ types + no spaces, ex: createPair(address,address)
        ]
      )).slice(0,4)

      const payloadBytes = arrayify(abiCoder.encode(
        [
        ], // array of types; make sure to represent complex types as tuples 
        [
        ] // arg values
      ))


      const txDetails = {
        to: wethAddress,
        data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
        value: parseEther(amount.toString())
      }

      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      console.log(result)

    } catch (error) {
        console.log(error)
    }
  }, [amount, wallet, provider, wethAddress]);

  return (
    <>
      <Stack direction="row">
        <Input
          name="amount"
          type="number"
          value={amount?.toString()}
          onChange={e => setAmount(Number(e.target.value))}
          width="auto"
        />
        <Button onClick={sendTransaction}>Wrap ETH</Button>
      </Stack>
    </>
  )
}
