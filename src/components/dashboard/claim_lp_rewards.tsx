import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import {  ethers } from 'ethers'
import { Box, Button, Divider, Input, Link, Spacer, Stack, Text } from '@chakra-ui/react'
import { arrayify, concat, defaultAbiCoder, hexlify, formatUnits, parseEther, parseUnits, formatEther, solidityKeccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'


import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { commandTypes, explorerUrl } from '../../config/constants'
import { BiLinkExternal } from 'react-icons/bi'
import { Toast } from '../toast'
import { error_message } from '../../config/error'
import { isAbleToSendTransaction } from '../../config/validation'
import { formatNumber } from '../../util/display_formatting'


type mintProps = {
  dashboardDataSet: any;
  closeParentDialog: any;
}

export default function ClaimLpRewards(props: mintProps) {
  const [{ wallet, connecting }] = useConnectWallet()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>()
  const [ibcContractAddress, ] = useState<string>(contracts.tenderly.ibcETHCurveContract)
  const [ibcRouterAddress, ] = useState<string>(contracts.tenderly.ibcRouterContract)
  const {dashboardDataSet} = props
  let closeParentDialog = props.closeParentDialog;

  const userClaimableLpRewards = BigNumber.from("userClaimableLpRewards" in dashboardDataSet ? dashboardDataSet.userClaimableLpRewards : '0')
  const userClaimableLpReserveRewards = BigNumber.from("userClaimableLpReserveRewards" in dashboardDataSet ? dashboardDataSet.userClaimableLpReserveRewards : '0')
  const userClaimableStakingRewards = BigNumber.from("userClaimableStakingRewards" in dashboardDataSet ? dashboardDataSet.userClaimableStakingRewards : '0')
  const userClaimableStakingReserveRewards = BigNumber.from("userClaimableStakingReserveRewards" in dashboardDataSet ? dashboardDataSet.userClaimableStakingReserveRewards : '0')

  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0');
  const totalStakingBalance = 'totalStakingBalance' in dashboardDataSet ? dashboardDataSet.totalStakingBalance : '0'
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
          "address"
        ], // array of types; make sure to represent complex types as tuples 
        [
          wallet.accounts[0].address,
        ] // arg values
      ))

      const payloadBytes = arrayify(
				abiCoder.encode(
					['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
					[
						wallet.accounts[0].address,
            ibcContractAddress,
            true,
            commandTypes.claimRewards,
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

      let description = "Error details"

      if (result.status === 1){
        // extract RewardClaimed event, and display details
        let RewardClaimedDetails;
        result.logs.find(x => {
          try{
            RewardClaimedDetails = abiCoder.decode(["uint256", "uint256"], x.data)
            return true
          }catch(err){
            return false
          }
        })

        if (RewardClaimedDetails){
          description = `Received ${Number(formatUnits(RewardClaimedDetails[0], inverseTokenDecimals)).toFixed(4)} IBC and ${Number(formatEther(RewardClaimedDetails[1])).toFixed(4)} ETH`
          closeParentDialog();
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
  }, [wallet, provider, ibcContractAddress, ibcRouterAddress]);

  const IBC_rewards = formatNumber((Number(formatUnits(userClaimableLpRewards, inverseTokenDecimals)) + Number(formatUnits(userClaimableStakingRewards, inverseTokenDecimals))).toString(), "IBC", false)
  const ETH_rewards = formatNumber((Number(formatUnits(userClaimableLpReserveRewards, inverseTokenDecimals)) + Number(formatUnits(userClaimableStakingReserveRewards, inverseTokenDecimals))).toString(), "ETH", false)
  
  return (
    <>
      <Stack p='4' mt='50px' textAlign='left' fontWeight='500' >
        <Text fontSize='sm' mb='3'>YOU HAVE ACCRUED</Text>
          <Stack direction='row' justifyContent='space-between' fontSize='5xl' lineHeight={1}>
            <Text>{IBC_rewards}</Text>
            <Text>IBC</Text>
          </Stack>
          <Stack direction='row' justifyContent='space-between' fontSize='5xl' lineHeight={1}>
            <Text>{ETH_rewards}</Text>
            <Text>ETH</Text>
          </Stack>

        {
          isProcessing &&
          <DefaultSpinner />
        }
        <Button 
          mt='70px'
          alignSelf={'center'}
          w='100%'
          fontSize='lg'
          onClick={sendTransaction}
          isDisabled={!isAbleToSendTransaction(wallet, provider, Math.max(Number(IBC_rewards), Number(ETH_rewards))) || isProcessing}
          >
            CLAIM
          </Button>
      </Stack>
    </>
  )
}
