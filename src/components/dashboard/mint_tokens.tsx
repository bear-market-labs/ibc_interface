import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers } from 'ethers'
import { Box, Button, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, formatUnits, concat, parseUnits, defaultAbiCoder, hexlify, parseEther, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import { ibcSymbol, maxSlippagePercent, reserveAssetDecimals, reserveAssetSymbol } from '../../config/constants'
import { composeQuery } from '../../util/ethers_utils'

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'

type mintProps = {
  dashboardDataSet: any;
}

export default function MintTokens(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [amount, setAmount] = useState<Number>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const {dashboardDataSet} = props
  const [maxSlippage,] = useState<number>(maxSlippagePercent)
  const [mintAmount, setMintAmount] = useState<BigNumber>(BigNumber.from(0))

  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const inverseTokenDecimals = BigNumber.from("inverseTokenDecimals" in dashboardDataSet ? dashboardDataSet.inverseTokenDecimals : '0'); 
  const userBalance = BigNumber.from("userEthBalance" in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'); 
  const userIbcBalance = bignumber("userIbcTokenBalance" in dashboardDataSet ? dashboardDataSet.userIbcTokenBalance : '0'); 
  const totalFeePercent = "fees" in dashboardDataSet ? Object.keys(dashboardDataSet.fees).reduce( (x, y) => Number(formatUnits(dashboardDataSet.fees[y], inverseTokenDecimals)) + x, 0): 0;
  const forceUpdate = dashboardDataSet.forceUpdate;

  const currentTokenPrice = BigNumber.from("currentTokenPrice" in bondingCurveParams ? bondingCurveParams.currentTokenPrice : '0'); 
  const [resultPrice, setResultPrice] = useState<bignumber>(bignumber(currentTokenPrice.toString()))
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

    if (!wallet || !provider || !amount){
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
          "buyTokens(address,uint256)" // put function signature here w/ types + no spaces, ex: createPair(address,address)
        ]
      )).slice(0,4)

      const maxPriceLimit = 
        bignumber(
          Number(amount.toString()) * (1 + maxSlippage / 100)
        )
        .dividedBy(
          bignumber(
            formatUnits(mintAmount, inverseTokenDecimals).toString()
          )
        ).toFixed(reserveAssetDecimals)
        
      const payloadBytes = arrayify(abiCoder.encode(
        [
          "address",
          "uint256"
        ], // array of types; make sure to represent complex types as tuples 
        [
          wallet.accounts[0].address,
          parseEther(maxPriceLimit)
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
    setIsProcessing(false)
    forceUpdate()
  }, [amount, wallet, provider, ibcContractAddress, maxSlippage, mintAmount]);

  const handleAmountChange = (val: any) => {
    const parsedAmount = val === '' ? 0 : Number(val);
    setAmount(parsedAmount)

    const decimaledParsedAmount = parseEther(val=== '' ? '0' : val)

    const calcMintAmount = async(decimaledParsedAmount: BigNumber, reserveAmount: BigNumber, inverseTokenSupply: BigNumber) => {
      if (wallet?.provider) {
        const provider = new ethers.providers.Web3Provider(wallet.provider, 'any')
        const abiCoder = ethers.utils.defaultAbiCoder

        // calculate supply with new liquidity added in

        const supplyQuery = composeQuery(ibcContractAddress, "getSupplyFromLiquidity", ["uint256"], [reserveAmount.add(decimaledParsedAmount)])
        const supplyBytes = await provider.call(supplyQuery)
        const newSupply = BigNumber.from(abiCoder.decode(["uint256"], supplyBytes)[0].toString())

        const mintAmount = newSupply.sub(inverseTokenSupply)

        // calculate resulting price
        //setResultPrice((decimaledParsedAmount.toString() / mintAmount.toString()).toString())
        const resultPriceInEth = bignumber(decimaledParsedAmount.toString()).dividedBy(bignumber(mintAmount.toString())).toFixed(reserveAssetDecimals)
        const resultPriceInWei = parseEther(resultPriceInEth)
        setResultPrice(bignumber(resultPriceInWei.toString()))
        setMintAmount(mintAmount)
      }
    }

    /*
    setMintAmount(              
      amountToMint2(
        decimaledParsedAmount,
        BigNumber.from(bondingCurveParams.m),
        BigNumber.from(bondingCurveParams.k), 
        BigNumber.from(bondingCurveParams.inverseTokenSupply), 
      )
    )

    setResultPrice(price2(BigNumber.from(bondingCurveParams.m), BigNumber.from(bondingCurveParams.k), BigNumber.from(bondingCurveParams.inverseTokenSupply).add(decimaledParsedAmount)))
    */

    if ("reserveAmount" in bondingCurveParams && "inverseTokenSupply" in bondingCurveParams){
      calcMintAmount(decimaledParsedAmount, BigNumber.from(bondingCurveParams.reserveAmount), BigNumber.from(bondingCurveParams.inverseTokenSupply))
      .then()
      .catch((err) => console.log(err))
    }

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
            onChange={e => handleAmountChange(e.target.value)}
            width="auto"
            border="none"
          />
          <Text align="right">{reserveAssetSymbol}</Text>
        </Stack>
        <Stack direction="row" align="right">
          <Text align="right">{`Balance: ${Number(formatEther(userBalance)).toFixed(1)}`}</Text>
          <Box color={colors.TEAL} onClick={() => handleAmountChange(formatEther(userBalance).toString())}>MAX</Box>
        </Stack>

        <Text align="left">YOU RECEIVE</Text>
        <Stack direction="row">
          <Text>{ (Number(formatUnits(mintAmount, inverseTokenDecimals)) * (1-totalFeePercent)).toFixed(2) }</Text>
          <Text align="right">{ibcSymbol}</Text>
        </Stack>
        <Text align="right">{`Balance: ${userIbcBalance.dividedBy(Math.pow(10, inverseTokenDecimals.toNumber())).toFixed(2)}`}</Text>
        <Spacer/>

        <Stack direction="row">
          <Text align="left">Price Impact</Text>
          <Text align="right">
            {`${
                  currentTokenPrice.toString() === '0' || resultPrice.toString() === '0'? 0 :
                    resultPrice.minus(bignumber(currentTokenPrice.toString())).multipliedBy(100).dividedBy(bignumber(currentTokenPrice.toString())).toFixed(2)
              }%`
            }
          </Text> 
        </Stack>
        <Stack direction="row">
          <Text align="left">Max Slippage</Text>
          <Text align="right">{`${maxSlippage}%`}</Text> 
        </Stack>
        {
          isProcessing &&
          <DefaultSpinner />
        }
        <Button onClick={sendTransaction}>MINT</Button>
      </Stack>
    </>
  )
}