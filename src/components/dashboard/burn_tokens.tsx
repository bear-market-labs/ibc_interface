import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers, constants } from 'ethers'
import { Box, Button, Icon, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, parseUnits, formatUnits, concat, defaultAbiCoder, hexlify, parseEther, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import { ibcSymbol, maxSlippagePercent, reserveAssetDecimals, reserveAssetSymbol } from '../../config/constants'
import { composeQuery } from '../../util/ethers_utils'
import { CgArrowDownR} from "react-icons/cg"

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'

type mintProps = {
  dashboardDataSet: any;
  parentSetters: any;
}

export default function BurnTokens(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [amount, setAmount] = useState<string>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const {dashboardDataSet, parentSetters} = props
  const [maxSlippage,] = useState<number>(maxSlippagePercent)
  const [liquidityReceived, setLiquidityReceived] = useState<BigNumber>(BigNumber.from(0))

  const inverseTokenAddress = "inverseTokenAddress" in dashboardDataSet ? dashboardDataSet.inverseTokenAddress : "";
  const userInverseTokenAllowance = BigNumber.from("userInverseTokenAllowance" in dashboardDataSet ? dashboardDataSet.userInverseTokenAllowance : '0');
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
            "sellTokens(address,uint256,uint256)" // put function signature here w/ types + no spaces, ex: createPair(address,address)
          ]
        )).slice(0,4)
  
        let decimaledAmount = parseUnits(amount.toString(), inverseTokenDecimals.toNumber())

        const minPriceLimit = 
          bignumber(liquidityReceived.toString()).multipliedBy((1 - maxSlippage / 100))
          .dividedBy(
            bignumber(
              decimaledAmount.toString()
            )
          ).toFixed(reserveAssetDecimals)
          
        const payloadBytes = arrayify(abiCoder.encode(
          [
            "address",
            "uint256",
            "uint256"
          ], // array of types; make sure to represent complex types as tuples 
          [
            wallet.accounts[0].address,
            decimaledAmount,
            parseEther(minPriceLimit)
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
          to: inverseTokenAddress,
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
  }, [amount, wallet, provider, ibcContractAddress, maxSlippage, liquidityReceived, userInverseTokenAllowance, inverseTokenAddress]);

  const handleAmountChange = (val: any) => {
    const parsedAmount = val;
    setAmount(parsedAmount)

    if (isNaN(val)){
      return
    }

    const decimaledParsedAmount = parseUnits(val=== '' ? '0' : val, inverseTokenDecimals.toNumber())

    const calcBurnAmount = async(decimaledParsedAmount: BigNumber, reserveAmount: BigNumber, inverseTokenSupply: BigNumber) => {
      if (wallet?.provider) {
        const provider = new ethers.providers.Web3Provider(wallet.provider, 'any')
        const abiCoder = ethers.utils.defaultAbiCoder

        // liquidity between start/end supply
        const liquidityQuery = composeQuery(ibcContractAddress, "getLiquidityFromSupply", ["uint256"], [inverseTokenSupply.sub(decimaledParsedAmount)])
        const liquidityBytes = await provider.call(liquidityQuery)
        const liquidityReceived = reserveAmount.sub(BigNumber.from(abiCoder.decode(["uint256"], liquidityBytes)[0].toString()))

        const newPriceQuery = composeQuery(ibcContractAddress, "getPrice", ["uint256"], [inverseTokenSupply.sub(decimaledParsedAmount)])
        const newPriceBytes = await provider.call(newPriceQuery)
        const newPrice = BigNumber.from(abiCoder.decode(["uint256"], newPriceBytes)[0].toString())

        // calculate resulting price
        //setResultPrice((decimaledParsedAmount.toString() / liquidityReceived.toString()).toString())
        const resultPriceInEth = bignumber(liquidityReceived.toString()).dividedBy(bignumber(decimaledParsedAmount.toString())).toFixed(inverseTokenDecimals.toNumber())
        const resultPriceInWei = parseEther(resultPriceInEth)
        setResultPrice(bignumber(resultPriceInWei.toString()))
        setLiquidityReceived(liquidityReceived)

        parentSetters?.setNewPrice(newPrice.toString())
        parentSetters?.setNewIbcIssuance(inverseTokenSupply.sub(decimaledParsedAmount).toString())
        parentSetters?.setNewReserve(abiCoder.decode(["uint256"], liquidityBytes)[0].toString())
      }
    }

    if ("reserveAmount" in bondingCurveParams && "inverseTokenSupply" in bondingCurveParams){
      calcBurnAmount(decimaledParsedAmount, BigNumber.from(bondingCurveParams.reserveAmount), BigNumber.from(bondingCurveParams.inverseTokenSupply))
      .then()
      .catch((err) => console.log(err))
    }

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
          <Text align="right" fontSize='4xl'>{ibcSymbol}</Text>
        </Stack>
        <Stack direction="row" justify="right" fontSize='sm'>
          <Text align="right">{`Balance: ${userIbcBalance.dividedBy(Math.pow(10, inverseTokenDecimals.toNumber())).toFixed(2)}`}</Text>
          <Box color={colors.TEAL} onClick={() => handleAmountChange(userIbcBalance.dividedBy(Math.pow(10, inverseTokenDecimals.toNumber())).toString())}>MAX</Box>
        </Stack>
        <Icon as={CgArrowDownR} fontSize='3xl' alignSelf={'center'} m='5'/>
        <Text align="left" fontSize='sm'>YOU RECEIVE</Text>
        <Stack direction="row" justifyContent={'space-between'} fontSize='4xl'>
          <Text>{ (Number(formatEther(liquidityReceived).toString()) * (1 - totalFeePercent)).toFixed(2) }</Text>
          <Text align="right">{reserveAssetSymbol}</Text>
        </Stack>
        <Text align="right" fontSize='sm'>{`Balance: ${Number(formatEther(userBalance)).toFixed(1)}`}</Text>
        <Spacer/>

        <Stack direction="row" fontSize='md' justifyContent={'space-between'} mt='12'>
          <Text align="left">Price Impact</Text>
          <Text align="right">
            {`${
                  currentTokenPrice.toString() === '0' || resultPrice.toString() === '0'? 0 :
                    resultPrice.minus(bignumber(currentTokenPrice.toString())).multipliedBy(100).dividedBy(bignumber(currentTokenPrice.toString())).toFixed(2)
              }%`
            }
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
              userInverseTokenAllowance.gt(0) ? "Burn" : "Approve IBC"
            }
          </Button>
      </Stack>
    </>
  )
}
