import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers, constants } from 'ethers'

import { Box, Button, Icon, Input, NumberInput, NumberInputField, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, parseUnits, concat, defaultAbiCoder, hexlify, formatUnits, parseEther, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
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

export default function RemoveLiquidity(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [amount, setAmount] = useState<number>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const {dashboardDataSet, parentSetters} = props
  const [maxSlippage,] = useState<number>(maxSlippagePercent)
  const [liquidityReceived, setLiquidityReceived] = useState<BigNumber>(BigNumber.from(0))

  const userInverseTokenAllowance = BigNumber.from("userLpTokenAllowance" in dashboardDataSet ? dashboardDataSet.userLpTokenAllowance : '0');
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const userBalance = BigNumber.from("userEthBalance" in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'); 
  const userIbcBalance = bignumber("userLpTokenBalance" in dashboardDataSet ? dashboardDataSet.userLpTokenBalance : '0'); 
  const lpTokenSupply = BigNumber.from("lpTokenSupply" in dashboardDataSet ? dashboardDataSet.lpTokenSupply : '0'); 
  const forceUpdate = dashboardDataSet.forceUpdate;

  const currentTokenPrice = BigNumber.from("currentTokenPrice" in bondingCurveParams ? bondingCurveParams.currentTokenPrice : '0'); 
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
      let txDetails;

      if (userInverseTokenAllowance.gt(0)){

        if (!amount){
          return
        }

        const functionDescriptorBytes = arrayify(solidityKeccak256(
          [
            "string"
          ]
          ,
          [
            "removeLiquidity(address,uint256,uint256)" // put function signature here w/ types + no spaces, ex: createPair(address,address)
          ]
        )).slice(0,4)

        const maxPriceLimit = BigNumber.from(bignumber(currentTokenPrice.toString()).multipliedBy(1+maxSlippage/100).toFixed(0))
          
        const payloadBytes = arrayify(abiCoder.encode(
          [
            "address",
            "uint256",
            "uint256"
          ], // array of types; make sure to represent complex types as tuples 
          [
            wallet.accounts[0].address,
            parseUnits(amount.toString(), inverseTokenDecimals.toNumber()),
            maxPriceLimit
          ] // arg values
        ))
  
        txDetails = {
          to: ibcContractAddress,
          data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
        }
  
      } else {
        const functionDescriptorBytes = arrayify(solidityKeccak256(
          [
            "string"
          ]
          ,
          [
            "approve(address,uint256)" // put function signature here w/ types + no spaces, ex: createPair(address,address)
          ]
        )).slice(0,4)
  
        const payloadBytes = arrayify(abiCoder.encode(
          [
            "address",
            "uint",
          ], // array of types; make sure to represent complex types as tuples 
          [
            ibcContractAddress,
            constants.MaxUint256
          ] // arg values; note https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder--methods
        ))

        txDetails = {
          to: ibcContractAddress,
          data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
        }
      }

      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      console.log(result)

    } catch (error) {
        console.log(error)
    }

    setIsProcessing(false)
    forceUpdate()
  }, [amount, wallet, provider, ibcContractAddress, maxSlippage, liquidityReceived, userInverseTokenAllowance]);

  const handleAmountChange = (val: any) => {
    const parsedAmount = val;
    setAmount(parsedAmount)

    if (isNaN(val) || val.trim() === ''){
      return
    }

    const decimaledParsedAmount = parseUnits(val=== '' ? '0' : val, inverseTokenDecimals.toNumber())

    const price = formatUnits(bondingCurveParams.inverseTokenSupply, bondingCurveParams.inverseTokenDecimals)
    const price_supply_product = bignumber(bondingCurveParams.currentTokenPrice).multipliedBy(price)

    const liquidityRetrieved = bignumber(decimaledParsedAmount.mul(BigNumber.from(bondingCurveParams.reserveAmount).sub(price_supply_product.toFixed(0))).toString()).dividedBy(bignumber(lpTokenSupply.toString())).toFixed(0)

    setLiquidityReceived(BigNumber.from(liquidityRetrieved))

    parentSetters?.setNewLpIssuance(lpTokenSupply.sub(decimaledParsedAmount).toString())
    parentSetters?.setNewReserve(BigNumber.from(bondingCurveParams.reserveAmount).sub(BigNumber.from(liquidityRetrieved)).toString())
  }

  return (
    <>
      <Stack>
        <Text align="left" fontSize='sm'>YOU PAY</Text>

        <Stack direction="row" justifyContent={'space-between'}>
        <NumberInput
            value={amount}
            onChange={valueString => handleAmountChange(valueString)}
          >
            <NumberInputField
              minWidth="auto"
              border="none"
              fontSize='4xl'
              placeholder={`0`}
            />
          </NumberInput>
          <Text align="right" fontSize='4xl'>LP</Text>
        </Stack>
        <Stack direction="row" justify="right" fontSize='sm'>
          <Text align="right">{`Balance: ${userIbcBalance.dividedBy(Math.pow(10, inverseTokenDecimals.toNumber())).toFixed(2)}`}</Text>
          <Box color={colors.TEAL} onClick={() => handleAmountChange(userIbcBalance.dividedBy(Math.pow(10, inverseTokenDecimals.toNumber())).toString())}>MAX</Box>
        </Stack>

        <Icon as={CgArrowDownR} fontSize='3xl' alignSelf={'center'} m='5'/>

        <Text align="left" fontSize='sm'>YOU RECEIVE</Text>

        <Stack direction="row" justifyContent={'space-between'} fontSize='4xl'>
          <Text>{ Number(formatEther(liquidityReceived).toString()).toFixed(2) }</Text>
          <Text align="right">{reserveAssetSymbol}</Text>
        </Stack>
        <Text align="right" fontSize='sm'>{`Balance: ${Number(formatEther(userBalance)).toFixed(1)}`}</Text>
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
          <Button onClick={sendTransaction}>
            {
              userInverseTokenAllowance.gt(0) ? "Remove Liquidity" : "Approve LP"
            }
          </Button>
      </Stack>
    </>
  )
}
