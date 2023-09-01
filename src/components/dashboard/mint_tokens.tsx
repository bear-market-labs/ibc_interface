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

interface Account {
    address: string,
    balance: Record<TokenSymbol, string> | null,
    ens: {name: string|undefined, avatar: string|undefined}
}

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
  const [wethAddress, ] = useState<string>(contracts.tenderly.wethAddress)
  const {userBalance, currentTokenSupply, bondingCurveGenesisPrice, bondingCurveGenesisSupply, bondingCurveReserve, userIbcBalance} = props
  const [maxSlippage,] = useState<number>(maxSlippagePercent)

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
      <Stack>
        <Text align="left">YOU PAY</Text>

        <Stack direction="row">
          <Input
            name="amount"
            type="text"
            value={amount?.toString()}
            placeholder={`0`}
            onChange={e => setAmount(Number(e.target.value))}
            width="auto"
            border="none"
          />
          <Text align="right">{reserveAssetSymbol}</Text>
        </Stack>
        <Stack direction="row" align="right">
          <Text align="right">{`Balance: ${userBalance}`}</Text>
          <Box color={colors.TEAL} onClick={() => setAmount(userBalance)}>MAX</Box>
        </Stack>

        <Text align="left">YOU RECEIVE</Text>
        <Stack direction="row">
          <Text>
            {
              amountToMint(
                Number(amount), 
                bondingCurveGenesisPrice, 
                currentTokenSupply, 
                bondingCurveGenesisSupply, 
                bondingCurveReserve
              ).toFixed(2)
            }
          </Text>
          <Text align="right">{ibcSymbol}</Text>
        </Stack>
        <Text align="right">{`Balance: ${userIbcBalance}`}</Text>
        <Spacer/>

        <Stack direction="row">
          <Text align="left">Price Impact</Text>
          <Text align="right">
            {`${
                  ((
                    price(
                      amountToMint(
                        Number(amount), 
                        bondingCurveGenesisPrice, 
                        currentTokenSupply, 
                        bondingCurveGenesisSupply, 
                        bondingCurveReserve
                      )
                      + currentTokenSupply,
                      bondingCurveGenesisPrice,
                      bondingCurveReserve,
                      bondingCurveGenesisSupply
                    )

                    -
                    
                    price(
                      Number(currentTokenSupply),
                      bondingCurveGenesisPrice,
                      bondingCurveReserve,
                      bondingCurveGenesisSupply
                    )
                  )

                  *

                  100

                  /

                  price(
                    Number(currentTokenSupply),
                    bondingCurveGenesisPrice,
                    bondingCurveReserve,
                    bondingCurveGenesisSupply
                  )).toFixed(2)
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
