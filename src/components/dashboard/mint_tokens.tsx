import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers } from 'ethers'
import { Box, Button, Input, Icon, Stack, Text, NumberInput, NumberInputField } from '@chakra-ui/react'
import { arrayify, formatUnits, concat, parseUnits, defaultAbiCoder, hexlify, parseEther, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import { explorerUrl, ibcSymbol, maxSlippagePercent, maxReserveChangePercent, reserveAssetDecimals, reserveAssetSymbol } from '../../config/constants'
import { composeQuery } from '../../util/ethers_utils'
import { CgArrowDownR} from "react-icons/cg"

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { Toast } from '../toast'
import { Link } from "@chakra-ui/react"
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'

type mintProps = {
  dashboardDataSet: any;
  parentSetters: any;
}

export default function MintTokens(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [amount, setAmount] = useState<number>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
  const {dashboardDataSet, parentSetters} = props
  const [maxSlippage,] = useState<number>(maxSlippagePercent)
  const [maxReserve,] = useState<number>(maxReserveChangePercent)
  const [mintAmount, setMintAmount] = useState<BigNumber>(BigNumber.from(0))

  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const inverseTokenDecimals = BigNumber.from("inverseTokenDecimals" in dashboardDataSet ? dashboardDataSet.inverseTokenDecimals : '0'); 
  const userBalance = BigNumber.from("userEthBalance" in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'); 
  const userIbcBalance = bignumber("userIbcTokenBalance" in dashboardDataSet ? dashboardDataSet.userIbcTokenBalance : '0'); 
  const totalFeePercent = "fees" in dashboardDataSet ? Object.keys(dashboardDataSet.fees).reduce( (x, y) => Number(formatUnits(dashboardDataSet.fees[y]["buyTokens"], inverseTokenDecimals)) + x, 0): 0;
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

       
      const receivedAmount =  Number(formatUnits(mintAmount, inverseTokenDecimals)) * (1-totalFeePercent);

      const maxPriceLimit = 
        bignumber(
          Number(amount.toString()) * (1 + maxSlippage / 100)
        )
        .dividedBy(
          bignumber(
            receivedAmount
          )
        ).toFixed(reserveAssetDecimals)

      const maxReserveLimit = bondingCurveParams.reserveAmount.mul(1 + maxReserve / 100)

        
      const payloadBytes = arrayify(abiCoder.encode(
        [
          "address",
          "uint256",
          "uint256",
        ], // array of types; make sure to represent complex types as tuples 
        [
          wallet.accounts[0].address,
          parseEther(maxPriceLimit),
          maxReserveLimit,
        ] // arg values
      ))

      const txDetails = {
        to: ibcContractAddress,
        data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
        value: parseEther(amount.toString())
      }

      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      let description = "Error details"

      if (result.status === 1){
        // extract TokenBought event, and display details
        let tokenBoughtDetails;
        result.logs.find(x => {
          try{
            tokenBoughtDetails = abiCoder.decode(["uint256", "uint256"], x.data)
            return true
          }catch(err){
            return false
          }
        })

        if (tokenBoughtDetails){
          description = `Received ${Number(formatUnits(tokenBoughtDetails[1], inverseTokenDecimals)).toFixed(4)} IBC for ${Number(formatEther(tokenBoughtDetails[0])).toFixed(4)} ETH`
        }
      } 

      const url = explorerUrl + result.transactionHash

      Toast({
        id: result.transactionHash,
        title: result.status === 1 ? "Transaction confirmed" : "Transaction failed",
        description: (<div><Link href={url} isExternal>{description +" " + result.transactionHash.slice(0, 5) + "..." + result.transactionHash.slice(-5)}<BiLinkExternal></BiLinkExternal></Link></div>),
        status: result.status === 1 ? "success" : "error",
        duration: 5000,
        isClosable: true
      })

      console.log(result)

    } catch (error:any) {
        console.log(error)

        Toast({
          id: "",
          title: "Transaction failed",
          description: error_message(error),
          status: "error",
          duration: null,
          isClosable: true
        })
    }
    setIsProcessing(false)
    forceUpdate()
  }, [amount, wallet, provider, ibcContractAddress, maxSlippage, mintAmount, inverseTokenDecimals, totalFeePercent, maxReserve, bondingCurveParams]);

  const handleAmountChange = (val: any) => {
    const parsedAmount = val;
    setAmount(parsedAmount)

    if (isNaN(val) || val.trim() === ''){
      return
    }

    const decimaledParsedAmount = parseEther(val=== '' ? '0' : val)

    const calcMintAmount = async(decimaledParsedAmount: BigNumber, reserveAmount: BigNumber, inverseTokenSupply: BigNumber, utilization: BigNumber) => {
      if (wallet?.provider) {
        const provider = new ethers.providers.Web3Provider(wallet.provider, 'any')
        const abiCoder = ethers.utils.defaultAbiCoder

        //directly calculate mintAmount with invariant and utilization

        // this should be a non-under/overflow number
        const reserveDelta = Number(formatEther(decimaledParsedAmount)) / Number(formatEther(reserveAmount))

        // keep calc in non-under/overflow numeric domains
        const logMintedTokensPlusSupply = Math.log(1 + reserveDelta) / Number(formatEther(utilization)) + Math.log(Number(formatUnits(inverseTokenSupply, inverseTokenDecimals)))

        const mintAmount = parseUnits(Math.exp(logMintedTokensPlusSupply).toFixed(inverseTokenDecimals.toNumber()), inverseTokenDecimals).sub(inverseTokenSupply)
        
        const newSupply = mintAmount.add(inverseTokenSupply)

        const newPriceQuery = composeQuery(ibcContractAddress, "priceOf", ["uint256"], [newSupply])
        const newPriceBytes = await provider.call(newPriceQuery)
        const newPrice = BigNumber.from(abiCoder.decode(["uint256"], newPriceBytes)[0].toString())

        // this is the minter's price, not the resulting bonding curve price!!!
        const resultPriceInEth = bignumber(decimaledParsedAmount.toString()).dividedBy(bignumber(mintAmount.toString())).toFixed(reserveAssetDecimals)
        const resultPriceInWei = parseEther(resultPriceInEth)
        setResultPrice(bignumber(resultPriceInWei.toString()))
        setMintAmount(mintAmount)


        parentSetters?.setNewPrice(newPrice.toString())
        parentSetters?.setNewIbcIssuance(newSupply.toString())
        parentSetters?.setNewReserve(reserveAmount.add(decimaledParsedAmount).toString())
        
      }
    }

    if ("reserveAmount" in bondingCurveParams && "inverseTokenSupply" in bondingCurveParams && "utilization" in bondingCurveParams){
      calcMintAmount(decimaledParsedAmount, BigNumber.from(bondingCurveParams.reserveAmount), BigNumber.from(bondingCurveParams.inverseTokenSupply), BigNumber.from(bondingCurveParams.utilization))
      .then()
      .catch((err) => console.log(err))
    }

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
          <Text align="right" fontSize='4xl'>{reserveAssetSymbol}</Text>
        </Stack>

        <Stack direction="row" justify="right" fontSize='sm'>
          <Text align="right">{`Balance: ${Number(formatEther(userBalance)).toFixed(1)}`}</Text>
          <Box as='button' color={colors.TEAL} onClick={() => handleAmountChange(formatEther(userBalance).toString())}>MAX</Box>
        </Stack>

        <Icon as={CgArrowDownR} fontSize='3xl' alignSelf={'center'} m='5'/>
        
        <Text align="left" fontSize='sm'>YOU RECEIVE</Text>
        <Stack direction="row" justifyContent={'space-between'} fontSize='4xl'>
          <Text>{ (Number(formatUnits(mintAmount, inverseTokenDecimals)) * (1-totalFeePercent)).toFixed(2) }</Text>
          <Text align="right">{ibcSymbol}</Text>
        </Stack>
        <Text align="right" fontSize='sm'>{`Balance: ${userIbcBalance.dividedBy(Math.pow(10, inverseTokenDecimals.toNumber())).toFixed(2)}`}</Text>

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
        <Stack direction="row" fontSize='md' justifyContent={'space-between'}>
          <Text align="left">Max Slippage</Text>
          <Text align="right">{`${maxSlippage}%`}</Text> 
        </Stack>
        <Stack direction="row" fontSize='md' justifyContent={'space-between'} mb='7'>
          <Text align="left">Max Reserve Divergence</Text> 
          <Text align="right">{`${maxReserve}%`}</Text> 
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
