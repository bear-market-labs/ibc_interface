import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers } from 'ethers'
import type {
    TokenSymbol
  } from '@web3-onboard/common'
import { Box, Button, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, Interface, parseEther, solidityKeccak256 } from 'ethers/lib/utils'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import { ibcSymbol, maxSlippagePercent, reserveAssetSymbol } from '../../config/constants'
import { areaUnderBondingCurve, amountToMint, price } from '../../util/bonding_curve'

type mintProps = {
  userBalance: any;
  currentTokenSupply: any;
  bondingCurveGenesisPrice: any;
  bondingCurveGenesisSupply: any;
  bondingCurveReserve: any;
  userIbcBalance: any;
}

export default function MintTokens(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [amount, setAmount] = useState<Number>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const {userBalance, currentTokenSupply, bondingCurveGenesisPrice, bondingCurveGenesisSupply, bondingCurveReserve, userIbcBalance} = props
  const [maxSlippage,] = useState<number>(maxSlippagePercent)
  const [mintAmount, setMintAmount] = useState<number>(0)
  const [resultPrice, setResultPrice] = useState<number>(price(currentTokenSupply, bondingCurveGenesisPrice, bondingCurveReserve, bondingCurveGenesisSupply))

  const currentTokenPrice = price(currentTokenSupply, bondingCurveGenesisPrice, bondingCurveReserve, bondingCurveGenesisSupply);

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
          "buyTokens(address,uint256)" // put function signature here w/ types + no spaces, ex: createPair(address,address)
        ]
      )).slice(0,4)

      const payloadBytes = arrayify(abiCoder.encode(
        [
          "address",
          "uint256"
        ], // array of types; make sure to represent complex types as tuples 
        [
          wallet.accounts[0].address,
          parseEther((
            Number(amount) * Number(1 + maxSlippage / 100) 
            / 
            Number(mintAmount)
            ).toString())
        ] // arg values
      ))


      const txDetails = {
        to: ibcContractAddress,
        data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
        value: parseEther(amount.toString())
      }

      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      console.log(result)

    } catch (error) {
        console.log(error)
    }
  }, [amount, wallet, provider, ibcContractAddress, maxSlippage, mintAmount]);

  const handleAmountChange = (e: any) => {
    const parsedAmount = e.target.value === '' ? 0 : Number(e.target.value);
    setAmount(parsedAmount)
    setMintAmount(              
      amountToMint(
        parsedAmount, 
        bondingCurveGenesisPrice, 
        currentTokenSupply, 
        bondingCurveGenesisSupply, 
        bondingCurveReserve
      )
    )
    setResultPrice(price(currentTokenSupply + parsedAmount, bondingCurveGenesisPrice, bondingCurveReserve, bondingCurveGenesisSupply))
  }

  return (
    <>
      <Stack>
        <Text align="left">YOU PAY</Text>

        <Stack direction="row">
          <Input
            name="amount"
            type="text"
            value={amount?.toString()}
            placeholder={`0`}
            onChange={e => handleAmountChange(e)}
            width="auto"
            border="none"
          />
          <Text align="right">{reserveAssetSymbol}</Text>
        </Stack>
        <Stack direction="row" align="right">
          <Text align="right">{`Balance: ${userBalance.toFixed(1)}`}</Text>
          <Box color={colors.TEAL} onClick={() => setAmount(userBalance)}>MAX</Box>
        </Stack>

        <Text align="left">YOU RECEIVE</Text>
        <Stack direction="row">
          <Text>{ mintAmount.toFixed(2) }</Text>
          <Text align="right">{ibcSymbol}</Text>
        </Stack>
        <Text align="right">{`Balance: ${userIbcBalance}`}</Text>
        <Spacer/>

        <Stack direction="row">
          <Text align="left">Price Impact</Text>
          <Text align="right">
            {`${
                  (
                    (resultPrice - currentTokenPrice) * 100
                    /
                    currentTokenPrice
                  ).toFixed(2)
              }%`
            }
          </Text> 
        </Stack>
        <Stack direction="row">
          <Text align="left">Max Slippage</Text>
          <Text align="right">{`${maxSlippage}%`}</Text> 
        </Stack>
        <Button onClick={sendTransaction}>MINT</Button>
      </Stack>
    </>
  )
}
