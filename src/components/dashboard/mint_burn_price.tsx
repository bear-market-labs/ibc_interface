import { ethers } from 'ethers'
import { Box, Stack, Text, Icon, Divider, Center } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"
import { colors } from "../../config/style";
import AddIbc from './add_ibc';
import { blocksPerDay } from '../../config/constants';
import { formatNumber } from '../../util/display_formatting';

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
  const inverseTokenSupply = "inverseTokenSupply" in bondingCurveParams ? BigNumber.from(bondingCurveParams.inverseTokenSupply): BigNumber.from('0'); 


  const reserve24HReward = Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals)) > 0 ? Number(
    Number(ethers.utils.formatEther(stakingRewardEma.reserveAsset)) 
    * blocksPerDay 
    / Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals))
  ).toString()
  :
  '0'

  const ibc24HReward = Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals)) > 0 ? Number(
    Number(ethers.utils.formatEther(stakingRewardEma.ibcAsset)) 
    * blocksPerDay 
    / Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals))
  ).toString()
  :
  '0'

  return (
    <>
    <Stack direction="row" pr='7'>
      <Stack w='50%'>
        <Text ml={7} mt={7} align="left" fontSize='md'>MARKET PRICE</Text>
        <Stack direction='row' fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>
          <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatEther(currentTokenPrice), "ETH")}`}</Text>
          {
            newPrice.gt(0) && !newPrice.eq(currentTokenPrice) && 
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${formatNumber(ethers.utils.formatEther(newPrice), "ETH")}`}</Text>
            </>
          }
        </Stack>
      </Stack>
      <Stack w='50%' direction='row'>
        <Divider height='69px' mr='7' mt='7' orientation='vertical' colorScheme={'gray'} />
        <Stack align={'right'}>
          <Text mt={7} align="left" fontSize='md'>APPROX. STAKED REWARDS</Text>
          <Stack direction='row'>
            {
              <>

                <Text fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>{`${formatNumber(reserve24HReward, "ETH")} + ${formatNumber(ibc24HReward, "IBC")}`}</Text>
                </>
            }
          </Stack>
        </Stack>
      </Stack>
      </Stack>
    </>
  )
}
