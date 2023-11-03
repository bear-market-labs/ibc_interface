import {  ethers } from 'ethers'
import { Box, Center, Divider, Icon, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"
import { secondsPerDay } from '../../config/constants'
import { formatNumber } from '../../util/display_formatting'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function LpingReserve(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};

  const reserveAmount = "reserveAmount" in bondingCurveParams ? BigNumber.from(bondingCurveParams.reserveAmount) : BigNumber.from('0'); 
  const newReserve = parentInputDynamicData?.newReserve ? parentInputDynamicData.newReserve : '0'; 
  const lpRewardEma = "lpRewardEma" in dashboardDataSet ? dashboardDataSet.lpRewardEma : {
    reserveAsset: 0,
    ibcAsset: 0
  }; 

  const lpTokenSupply = "lpTokenSupply" in dashboardDataSet ? BigNumber.from(dashboardDataSet.lpTokenSupply) : BigNumber.from('0')
  const inverseTokenDecimals = BigNumber.from("inverseTokenDecimals" in dashboardDataSet ? dashboardDataSet.inverseTokenDecimals : '0'); 
  const reserveTokenDecimals = "reserveTokenDecimals" in dashboardDataSet ? dashboardDataSet.reserveTokenDecimals : BigNumber.from('0'); 
  const inverseTokenSymbol = "inverseTokenSymbol" in dashboardDataSet ? dashboardDataSet.inverseTokenSymbol : 'ASSET'; 



  const reserve24HReward = Number(ethers.utils.formatUnits(lpTokenSupply, inverseTokenDecimals)) && lpRewardEma.reserveAsset > 0 ? Number(
    Number(ethers.utils.formatUnits(lpRewardEma.reserveAsset, reserveTokenDecimals)) 
    * secondsPerDay 
    / Number(ethers.utils.formatUnits(lpTokenSupply, inverseTokenDecimals))
  ).toFixed(3)
  :
  '0.000'

  const ibc24HReward = Number(ethers.utils.formatUnits(lpTokenSupply, inverseTokenDecimals)) > 0 && lpRewardEma.ibcAsset > 0 ? Number(
    Number(ethers.utils.formatUnits(lpRewardEma.ibcAsset, reserveTokenDecimals)) 
    * secondsPerDay 
    / Number(ethers.utils.formatUnits(lpTokenSupply, inverseTokenDecimals))
  ).toFixed(3)
  :
  '0.000'

  return (
    <>
      <Stack direction="row" pr='7'>
        <Stack w='50%'>
          <Text ml={7} mt={7} align="left" fontSize='md'>RESERVE</Text>
          <Stack direction="row" fontSize='2xl' fontWeight='700'>
            <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatUnits(reserveAmount, dashboardDataSet.reserveTokenDecimals), dashboardDataSet.reserveTokenSymbol)}`}</Text>
            {
              newReserve !== '0' && newReserve !== reserveAmount.toString() && 
              <>
                <Box ml='7' mr='7'>
                  <Icon as={HiOutlineArrowRight} h='100%'/>
                </Box>
                <Text>{`${formatNumber(Number(Number(newReserve) / reserveTokenDecimals.toNumber()).toString(), dashboardDataSet.reserveTokenSymbol)}`}</Text>
              </>
            }
          </Stack>
        </Stack>
        <Stack direction='row' w='50%'>
          <Divider height='69px' mr='7' mt='7' orientation='vertical' colorScheme={'gray'} />
          <Stack>
            <Text  mt={7} align="left" fontSize='md'>APPROX. LP REWARDS</Text>
              {
                <>

                <Text fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>{`${formatNumber(reserve24HReward, dashboardDataSet.reserveTokenSymbol)} + ${formatNumber(ibc24HReward, dashboardDataSet.reserveTokenSymbol, true, true)}`}</Text>
                </>
              }
          </Stack>
        </Stack>
      </Stack>
    </>
  )
}
