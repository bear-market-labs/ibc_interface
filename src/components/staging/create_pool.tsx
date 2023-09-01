import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers } from 'ethers'
import type {
    TokenSymbol
  } from '@web3-onboard/common'
import { Button, Input, Stack } from '@chakra-ui/react'
import { AbiCoder, arrayify, concat, defaultAbiCoder, Interface, keccak256, solidityKeccak256, solidityPack } from 'ethers/lib/utils'
import { contracts } from '../../config/contracts'

interface Account {
    address: string,
    balance: Record<TokenSymbol, string> | null,
    ens: {name: string|undefined, avatar: string|undefined}
}

export default function CreatePool() {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [account, setAccount] = useState<Account | null>(null)
  const [tokenAddress, setTokenAddress] = useState('')
  const [uniswapV2FactoryAddress, ] = useState(contracts.tenderly.uniswapV2Factory)
  const [wethAddress, ] = useState(contracts.tenderly.wethAddress)

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

    if (!wallet || !provider){
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

      const iface = new Interface(["function createPair(address tokenA,address tokenB)"])

      const functionDescriptorBytes = arrayify(solidityKeccak256(
        [
          "string"
        ]
        ,
        [
          "createPair(address,address)"
        ]
      )).slice(0,4)

      const payloadBytes = arrayify(abiCoder.encode(
        [
          "address",
          "address",
        ],
        [
          tokenAddress,
          wethAddress
        ]
      ))


      const txDetails = {
        to: uniswapV2FactoryAddress,
        data: concat([functionDescriptorBytes, payloadBytes])
      }

      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      console.log(result)

    } catch (error) {
        console.log(error)
    }
  }, [tokenAddress, wallet, provider, uniswapV2FactoryAddress, wethAddress]);

  return (
    <>
      <Stack direction="row">
        <Input
          name="tokenAddress"
          type="text"
          value={tokenAddress}
          onChange={e => setTokenAddress(e.target.value)}
          width="auto"
        />
        <Button onClick={sendTransaction}>Create xxx-WETH pool</Button>
      </Stack>
    </>
  )
}
