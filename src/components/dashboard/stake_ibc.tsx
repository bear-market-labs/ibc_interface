import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers, constants } from 'ethers'
import { Box, Button, Input, Link, NumberInput, NumberInputField, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, formatUnits, parseEther, parseUnits, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { DefaultSpinner } from '../spinner'
import { explorerUrl } from '../../config/constants'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'

type mintProps = {
  dashboardDataSet: any;
}

export default function StakeIbc(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcContract)
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

        const functionDescriptorBytes = arrayify(solidityKeccak256(
          [
            "string"
          ]
          ,
          [
            "stake(uint256)" // put function signature here w/ types + no spaces, ex: createPair(address,address)
          ]
        )).slice(0,4)
          
        const payloadBytes = arrayify(abiCoder.encode(
          [
            "uint256",
          ], // array of types; make sure to represent complex types as tuples 
          [
            parseUnits(amount.toString(), inverseTokenDecimals)
          ] // arg values
        ))
  
        txDetails = {
          to: ibcContractAddress,
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
            ibcContractAddress,
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

    } catch (error) {
        console.log(error)
        Toast({
          id: "",
          title: "Transaction failed",
          description: JSON.stringify(error),
          status: "error",
          duration: null,
          isClosable: true
        })
    }
    setIsProcessing(false)
    forceUpdate()
  }, [wallet, provider, ibcContractAddress, amount, inverseTokenDecimals, userInverseTokenAllowance, inverseTokenAddress]);

  return (
    <>
      <Stack>
        <Text align="left">YOU STAKE</Text>
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
            />
          </NumberInput>
          <Text align="right">IBC</Text>
        </Stack>
        <Text align="right" fontSize={'xs'}>
          {`Balance: ${Number(formatUnits(userIbcTokenBalance, inverseTokenDecimals)).toFixed(2)}`}
        </Text>
        {
          isProcessing &&
          <DefaultSpinner />
        }
        <Button mt='7' alignSelf={'center'} w='100%' onClick={sendTransaction}>
        {
              userInverseTokenAllowance.gt(0) ? "Stake" : "Approve IBC"
        }
        </Button>
      </Stack>
    </>
  )
}
