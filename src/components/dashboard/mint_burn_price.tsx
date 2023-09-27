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

  return (
    <>
    <Stack direction="row">
      <Stack>
        <Text ml={7} mt={7} align="left">MARKET PRICE</Text>
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
      <Center mt={7} ml={450} height='69px'>
        <Divider orientation='vertical' colorScheme={'gray'} />
      </Center>
      <Stack ml={50} align={'right'}>
        <Text  mt={7} align="left">APPROX STAKED REWARDS</Text>
        <Stack  direction='row'>
          {
            <>

              <Text>{`${Number(Number(ethers.utils.formatEther(stakingRewardEma.reserveAsset))* blocksPerDay).toFixed(3)} ETH + ${Number(Number(ethers.utils.formatUnits(stakingRewardEma.ibcAsset, inverseTokenDecimals))* blocksPerDay).toFixed(3)} IBC`}</Text>
              </>
          }
          <AddIbc 
            tokenAddress={inverseTokenAddress}
            tokenDecimals={inverseTokenDecimals}
            tokenSymbol={inverseTokenSymbol}
          >Add IBC</AddIbc>
        </Stack>
      </Stack>
      </Stack>
    </>
  )
}
