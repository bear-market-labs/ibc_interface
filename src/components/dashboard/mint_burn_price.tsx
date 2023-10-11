import { ethers } from 'ethers'
import { Box, Stack, Text, Icon, Divider, Center } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"
import { colors } from "../../config/style";
import AddIbc from './add_ibc';
import { blocksPerDay } from '../../config/constants';

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function MintBurnPrice(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const currentTokenPrice = BigNumber.from("currentTokenPrice" in bondingCurveParams ? bondingCurveParams.currentTokenPrice : '0'); 
  const newPrice = BigNumber.from(parentInputDynamicData?.newPrice ? parentInputDynamicData.newPrice : '0')
  const inverseTokenDecimals = "inverseTokenDecimals" in dashboardDataSet ? dashboardDataSet.inverseTokenDecimals : '0'; 
  const inverseTokenAddress = "inverseTokenAddress" in dashboardDataSet ? dashboardDataSet.inverseTokenAddress : ''; 
  const inverseTokenSymbol = "inverseTokenSymbol" in dashboardDataSet ? dashboardDataSet.inverseTokenSymbol : ''; 
  const stakingRewardEma = "stakingRewardEma" in dashboardDataSet ? dashboardDataSet.stakingRewardEma : {
    reserveAsset: 0,
    ibcAsset: 0
  }; 
  const virtualInverseTokenAmount = Object.keys(bondingCurveParams).length > 0 ? BigNumber.from(bondingCurveParams?.virtualInverseTokenAmount) : BigNumber.from('0');
  const inverseTokenSupply = "inverseTokenSupply" in bondingCurveParams ? BigNumber.from(bondingCurveParams.inverseTokenSupply).sub(virtualInverseTokenAmount) : BigNumber.from('0'); 


  const reserve24HReward = Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals)) > 0 ? Number(
    Number(ethers.utils.formatEther(stakingRewardEma.reserveAsset)) 
    * blocksPerDay 
    / Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals))
  ).toFixed(3)
  :
  '0.000'

  const ibc24HReward = Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals)) > 0 ? Number(
    Number(ethers.utils.formatEther(stakingRewardEma.ibcAsset)) 
    * blocksPerDay 
    / Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals))
  ).toFixed(3)
  :
  '0.000'

  return (
    <>
    <Stack direction="row">
      <Stack>
        <Text ml={7} mt={7} align="left" fontSize='md'>MARKET PRICE</Text>
        <Stack direction='row'>
          <Text ml={7} align="left">{`${Number(ethers.utils.formatEther(currentTokenPrice)).toFixed(3)} ETH`}</Text>
          {
            newPrice.gt(0) && !newPrice.eq(currentTokenPrice) && 
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${Number(ethers.utils.formatEther(newPrice)).toFixed(3)} ETH`}</Text>
            </>
          }
        </Stack>
      </Stack>
      <Center mt={7} ml={283} height='69px'>
        <Divider orientation='vertical' colorScheme={'gray'} />
      </Center>
      <Stack ml={50} align={'right'}>
        <Text mt={7} align="left" fontSize='md'>APPROX STAKED REWARDS</Text>
        <Stack  direction='row'>
          {
            <>

              <Text>{`${reserve24HReward} ETH + ${ibc24HReward} IBC`}</Text>
              </>
          }
          <AddIbc 
            tokenAddress={inverseTokenAddress}
            tokenDecimals={inverseTokenDecimals}
            tokenSymbol={inverseTokenSymbol}
          />
        </Stack>
      </Stack>
      </Stack>
    </>
  )
}
