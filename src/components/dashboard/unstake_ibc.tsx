import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers } from 'ethers'
import { Box, Button, Link, NumberInput, NumberInputField, Stack, Text } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, formatUnits, parseUnits, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { DefaultSpinner } from '../spinner'
import { commandTypes, explorerUrl, sanitizeNumberInput } from '../../config/constants'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { colors } from '../../config/style'
import { isAbleToSendTransaction } from '../../config/validation'

type mintProps = {
  dashboardDataSet: any;
}

export default function UnstakeIbc(props: mintProps) {
  const [{ wallet,  }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [ibcRouterAddress, ] = useState<string>(contracts.default.ibcRouterContract)
  const {dashboardDataSet} = props
  const [amount, setAmount] = useState<string>()
  const [amountDisplay, setAmountDisplay] = useState<string>()

  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const userStakingBalance = BigNumber.from("userStakingBalance" in dashboardDataSet ? dashboardDataSet.userStakingBalance : '0'); 
  const forceUpdate = dashboardDataSet.forceUpdate;
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
          BigNumber.from(amount)
        ] // arg values
      ))

      const payloadBytes = arrayify(
        abiCoder.encode(
          ['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
          [
            wallet.accounts[0].address,
            dashboardDataSet.curveAddress,
            true,
            commandTypes.unstake,
            commandBytes,
          ] // arg values
        )
      )

      const txDetails = {
        to: ibcRouterAddress,
        data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
      }

      const tx = await signer.sendTransaction(txDetails)
      const result = await tx.wait();

      const url = explorerUrl + result.transactionHash
      const description = result.status === 1 ?
        `${amountDisplay} ${dashboardDataSet.inverseTokenSymbol} unstaked`
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
  }, [wallet, provider, dashboardDataSet, amount, ibcRouterAddress, amountDisplay, forceUpdate]);

  return (
      <Stack fontWeight='500'>
        <Text align="left" fontSize='sm'>YOU UNSTAKE</Text>
        <Stack direction="row">
          <NumberInput
              value={amountDisplay}
              onChange={valueString => {
                setAmountDisplay(sanitizeNumberInput(valueString))
                setAmount(parseUnits(Number(sanitizeNumberInput(valueString)).toFixed(inverseTokenDecimals.toNumber()), inverseTokenDecimals).toString())
              }}>
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
            align="right">{dashboardDataSet.inverseTokenSymbol}</Text>
        </Stack>
        <Stack direction={`row`} justifyContent={`flex-end`} pb='5' fontSize={'sm'}>
          <Text>
            {`Staked: ${Number(formatUnits(userStakingBalance, inverseTokenDecimals)).toFixed(2)}`}
          </Text>
          <Box as='button' color={colors.TEAL} onClick={() => {
            setAmountDisplay(Number(formatUnits(userStakingBalance, inverseTokenDecimals)).toString())
            setAmount(userStakingBalance.toString())
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
          isDisabled={!isAbleToSendTransaction(wallet, provider, amountDisplay) || isProcessing}
          >
            Unstake
          </Button>
      </Stack>
  )
}
