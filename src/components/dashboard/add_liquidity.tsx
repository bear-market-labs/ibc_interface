import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers, BigNumber } from 'ethers'
import { Box, Button, Icon, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, parseEther, parseUnits, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import { ibcSymbol, maxSlippagePercent, reserveAssetDecimals, reserveAssetSymbol } from '../../config/constants'
import { CgArrowDownR} from "react-icons/cg"

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'

type mintProps = {
  dashboardDataSet: any;
  parentSetters: any;
}

export default function AddLiquidity(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [amount, setAmount] = useState<Number>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const {dashboardDataSet, parentSetters} = props
  const [maxSlippage,] = useState<number>(maxSlippagePercent)
  const [mintAmount, setMintAmount] = useState<BigNumber>(BigNumber.from(0))

  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const lpTokenSupply = BigNumber.from("lpTokenSupply" in dashboardDataSet ? dashboardDataSet.lpTokenSupply : '0'); 
  const userBalance = BigNumber.from("userEthBalance" in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'); 
  const userIbcBalance = bignumber("userLpTokenBalance" in dashboardDataSet ? dashboardDataSet.userLpTokenBalance : '0'); 
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
          "addLiquidity(address,uint256)" // put function signature here w/ types + no spaces, ex: createPair(address,address)
        ]
      )).slice(0,4)

      const minPriceLimit = BigNumber.from(bignumber(currentTokenPrice.toString()).multipliedBy(1-maxSlippage/100).toFixed(0))
        
      const payloadBytes = arrayify(abiCoder.encode(
        [
          "address",
          "uint256"
        ], // array of types; make sure to represent complex types as tuples 
        [
          wallet.accounts[0].address,
          minPriceLimit
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
    forceUpdate();
  }, [amount, wallet, provider, ibcContractAddress, maxSlippage, mintAmount, currentTokenPrice]);

  const handleAmountChange = (val: any) => {
    const parsedAmount = val === '' ? 0 : Number(val);
    setAmount(parsedAmount)

    const decimaledParsedAmount = parseEther(val=== '' ? '0' : val)

    const mintAmount = BigNumber.from(bignumber(lpTokenSupply.mul(decimaledParsedAmount).toString()).dividedBy(bignumber(bondingCurveParams.reserveAmount.toString())).toFixed(0))

    setMintAmount(mintAmount)

    parentSetters?.setNewLpIssuance(mintAmount.add(lpTokenSupply).toString())
    parentSetters?.setNewReserve(decimaledParsedAmount.add(bondingCurveParams.reserveAmount).toString())
  }

  return (
    <>
      <Stack>
        <Text align="left" fontSize='sm'>YOU PAY</Text>

        <Stack direction="row" justifyContent={'space-between'}>
          <Input
            name="amount"
            type="text"
            value={amount?.toString()}
            placeholder={`0`}
            onChange={e => handleAmountChange(e.target.value)}
            minWidth="auto"
            border="none"
            fontSize='4xl'
          />
          <Text align="right" fontSize='4xl'>{reserveAssetSymbol}</Text>
        </Stack>
        <Stack direction="row" justify="right" fontSize='sm'>
          <Text align="right">{`Balance: ${Number(formatEther(userBalance)).toFixed(1)}`}</Text>
          <Box color={colors.TEAL} onClick={() => handleAmountChange(formatEther(userBalance).toString())}>MAX</Box>
        </Stack>
        <Icon as={CgArrowDownR} fontSize='3xl' alignSelf={'center'} m='5'/>
        <Text align="left" fontSize='sm'>YOU RECEIVE</Text>
        <Stack direction="row" justifyContent={'space-between'} fontSize='4xl'>
          <Text>{ Number(bignumber(mintAmount.toString()).dividedBy(BigNumber.from(10).pow(inverseTokenDecimals).toString()).toString()).toFixed(2) }</Text>
          <Text align="right">LP</Text>
        </Stack>
        <Text align="right" fontSize='sm'>{`Balance: ${userIbcBalance.dividedBy(Math.pow(10, inverseTokenDecimals.toNumber())).toFixed(2)}`}</Text>
        <Spacer/>

        <Stack direction="row" fontSize='md' justifyContent={'space-between'} mt='12'>
          <Text align="left">Market price</Text>
          <Text align="right">
            {`${Number(formatEther(currentTokenPrice)).toFixed(3)} ETH`}
          </Text> 
        </Stack>
        <Stack direction="row" fontSize='md' justifyContent={'space-between'} mb='7'>
          <Text align="left">Max Slippage</Text>
          <Text align="right">{`${maxSlippage}%`}</Text> 
        </Stack>
        {
          isProcessing &&
          <DefaultSpinner />
        }
        <Button onClick={sendTransaction}>Add Liquidity</Button>
      </Stack>
    </>
  )
}
