import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers, constants } from 'ethers'
import { Box, Button, Input, Link, NumberInput, NumberInputField, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, formatUnits, parseEther, parseUnits, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { DefaultSpinner } from '../spinner'
import { commandTypes, explorerUrl } from '../../config/constants'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { colors } from '../../config/style'
import { isAbleToSendTransaction } from '../../config/validation'

type mintProps = {
  dashboardDataSet: any;
}

export default function StakeIbc(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcETHCurveContract)
  const [ibcRouterAddress, ] = useState<string>(contracts.tenderly.ibcRouterContract)
  const {dashboardDataSet} = props
  const [amount, setAmount] = useState<string>('')

  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const inverseTokenAddress = "inverseTokenAddress" in dashboardDataSet ? dashboardDataSet.inverseTokenAddress : "";
  const userIbcTokenBalance = BigNumber.from("userIbcTokenBalance" in dashboardDataSet ? dashboardDataSet.userIbcTokenBalance : '0'); 
  const forceUpdate = dashboardDataSet.forceUpdate;
  const userInverseTokenAllowance = BigNumber.from("userInverseTokenAllowance" in dashboardDataSet ? dashboardDataSet.userInverseTokenAllowance : '0');
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
      let description = "Error details"
      let txDetails;

      if (userInverseTokenAllowance.gt(0)){

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
            parseUnits(amount.toString(), inverseTokenDecimals)
          ] // arg values
        ))
  
        const payloadBytes = arrayify(
          abiCoder.encode(
            ['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
            [
              wallet.accounts[0].address,
              ibcContractAddress,
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

        description = `${amount} IBC staked`
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
            constants.MaxUint256
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
  }, [wallet, provider, ibcContractAddress, amount, inverseTokenDecimals, userInverseTokenAllowance, inverseTokenAddress, ibcRouterAddress]);

  return (
    <>
      <Stack>
        <Text align="left" fontSize='sm'>YOU STAKE</Text>
        <Stack direction="row">
          <NumberInput
            value={amount}
            onChange={valueString => setAmount(valueString)}
          >
            <NumberInputField
              minWidth="auto"
              border="none"
              fontSize='4xl'
              placeholder={`0`}
              height='auto'
              pl='0'
            />
          </NumberInput>
          <Text
            fontSize='4xl'
            align="right"
            >IBC</Text>
        </Stack>
        <Stack direction={`row`} justifyContent={`flex-end`} pb='5'>
          <Text fontSize={'xs'}>
            {`Balance: ${Number(formatUnits(userIbcTokenBalance, inverseTokenDecimals)).toFixed(2)}`}
          </Text>
          <Box as='button' fontSize={'xs'} color={colors.TEAL} onClick={() => setAmount(Number(formatUnits(userIbcTokenBalance, inverseTokenDecimals)).toString())}>MAX</Box>
        </Stack>
        {
          isProcessing &&
          <DefaultSpinner />
        }
        <Button 
          mt='10'
          alignSelf={'center'}
          w='100%'
          onClick={sendTransaction}
          isDisabled={!isAbleToSendTransaction(wallet, provider, amount) || isProcessing}>
        {
              userInverseTokenAllowance.gt(0) ? "Stake" : "Approve IBC"
        }
        </Button>
      </Stack>
    </>
  )
}
