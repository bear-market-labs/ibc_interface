import { useCallback, useState } from 'react'
import { ethers } from 'ethers'
import { Box, Button, Link, NumberInput, NumberInputField, Stack, Text } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { DefaultSpinner } from '../spinner'
import { commandTypes, explorerUrl } from '../../config/constants'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { colors } from '../../config/style'
import { isAbleToSendTransaction } from '../../config/validation'
import { sanitizeNumberInput } from '../../util/display_formatting'
import { WalletState } from '@web3-onboard/core'
import { formatUnitsBnJs, parseUnitsBnJs } from '../../util/ethers_utils'

type mintProps = {
  dashboardDataSet: any;
  wallet: WalletState | null;
}

export default function StakeIbc(props: mintProps) {
  const [ibcRouterAddress, ] = useState<string>(contracts.default.ibcRouterContract)
  const {dashboardDataSet, wallet} = props
  const [amount, setAmount] = useState<string>()
  const [amountDisplay, setAmountDisplay] = useState<string>()

  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const inverseTokenAddress = "inverseTokenAddress" in dashboardDataSet ? dashboardDataSet.inverseTokenAddress : "";
  const userIbcTokenBalance = BigNumber.from("userIbcTokenBalance" in dashboardDataSet ? dashboardDataSet.userIbcTokenBalance : '0'); 
  const forceUpdate = dashboardDataSet.forceUpdate;
  const userInverseTokenAllowance = BigNumber.from("userInverseTokenAllowance" in dashboardDataSet ? dashboardDataSet.userInverseTokenAllowance : '0');
  const [isProcessing, setIsProcessing] = useState(false); 

  const sendTransaction = useCallback(async () => {

    if (!wallet || !amount){
      return
    }

    try {
      setIsProcessing(true)
			const provider = new ethers.providers.Web3Provider(wallet.provider, 'any') 
			const signer = provider.getUncheckedSigner()
      const abiCoder = defaultAbiCoder
      let description = "Error details"
      let txDetails;

      if (userInverseTokenAllowance.gte(BigNumber.from(amount ?? 0))){

        const functionDescriptorBytes = arrayify(
          solidityKeccak256(
            ['string'],
            [
              'execute(address,address,bool,uint8,bytes)', // put function signature here w/ types + no spaces, ex: createPair(address,address)
            ]
          )
        ).slice(0, 4)
          
        const commandBytes = arrayify(abiCoder.encode(
          [
            "address",
            "uint256",
          ], // array of types; make sure to represent complex types as tuples 
          [
            wallet.accounts[0].address, //ignored via router
            BigNumber.from(amount), 
          ] // arg values
        ))
  
        const payloadBytes = arrayify(
          abiCoder.encode(
            ['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
            [
              wallet.accounts[0].address,
              dashboardDataSet.curveAddress,
              true,
              commandTypes.stake,
              commandBytes,
            ] // arg values
          )
        )

        txDetails = {
          to: ibcRouterAddress,
          data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
        }

        description = `${amountDisplay} ${dashboardDataSet.inverseTokenSymbol} staked`
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
            ibcRouterAddress,
            BigNumber.from(amount)
          ] // arg values; note https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder--methods
        ))

        txDetails = {
          to: inverseTokenAddress,
          data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
        }
        description = "Allowance updated"
      }


      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      const url = explorerUrl + result.transactionHash
      description = result.status === 1 ?
        description
        :
        "Error details";

      Toast({
        id: result.transactionHash,
        title: result.status === 1 ? "Transaction confirmed" : "Transaction failed",
        description: (<div><Link href={url} isExternal>{description +" " + result.transactionHash.slice(0, 5) + "..." + result.transactionHash.slice(-5)}<BiLinkExternal></BiLinkExternal></Link></div>),
        status: result.status === 1 ? "success" : "error",
        duration: 5000,
        isClosable: true
      })
      console.log(result)

    } catch (error: any) {
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
  }, [wallet, dashboardDataSet, amount, userInverseTokenAllowance, inverseTokenAddress, ibcRouterAddress, amountDisplay, forceUpdate]);

  return (
      <Stack fontWeight='500'>
        <Text align="left" fontSize='sm'>YOU STAKE</Text>
        <Stack direction="row">
          <NumberInput
            value={amountDisplay}
            onChange={valueString => {
              setAmountDisplay(sanitizeNumberInput(valueString))
              setAmount(parseUnitsBnJs(Number(sanitizeNumberInput(valueString)).toFixed(inverseTokenDecimals.toNumber()), inverseTokenDecimals.toNumber()).toString())
            }
            }
          >
            <NumberInputField
              minWidth="auto"
              border="none"
              fontSize='5xl'
              placeholder={`0`}
              height='auto'
              pl='0'
            />
          </NumberInput>
          <Text
            fontSize='5xl'
            align="right"
            >{dashboardDataSet.inverseTokenSymbol}</Text>
        </Stack>
        <Stack direction={`row`} justifyContent={`flex-end`} pb='5' fontSize={'sm'}>
          <Text>
            {`Balance: ${Number(formatUnitsBnJs(userIbcTokenBalance, inverseTokenDecimals.toNumber())).toFixed(2)}`}
          </Text>
          <Box as='button' color={colors.TEAL} onClick={() => {
            setAmountDisplay(Number(formatUnitsBnJs(userIbcTokenBalance, inverseTokenDecimals.toNumber())).toString())
            setAmount(userIbcTokenBalance.toString())

          }}>MAX</Box>
        </Stack>
        {
          isProcessing &&
          <DefaultSpinner />
        }
        <Button 
          mt='10'
          alignSelf={'center'}
          w='100%'
          fontSize='lg'
          onClick={sendTransaction}
          isDisabled={!isAbleToSendTransaction(wallet, wallet?.provider, amountDisplay) || isProcessing}>
        {
              userInverseTokenAllowance.gte(BigNumber.from(amount?? 0)) ? "Stake" : "Approve " + dashboardDataSet.inverseTokenSymbol
        }
        </Button>
      </Stack>
  )
}
