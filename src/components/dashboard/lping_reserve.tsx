import {  ethers } from 'ethers'
import { Box, Center, Divider, Icon, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"
import { blocksPerDay } from '../../config/constants'
import { formatNumber } from '../../util/display_formatting'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function LpingReserve(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};

  const reserveAmount = "reserveAmount" in bondingCurveParams ? BigNumber.from(bondingCurveParams.reserveAmount) : BigNumber.from('0'); 
  const newReserve = parentInputDynamicData?.newReserve ? BigNumber.from(parentInputDynamicData.newReserve) : BigNumber.from('0'); 
  const lpRewardEma = "lpRewardEma" in dashboardDataSet ? dashboardDataSet.lpRewardEma : {
    reserveAsset: 0,
    ibcAsset: 0
  }; 

  const lpTokenSupply = "lpTokenSupply" in dashboardDataSet ? BigNumber.from(dashboardDataSet.lpTokenSupply) : BigNumber.from('0')
  const lpTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 


  const reserve24HReward = Number(ethers.utils.formatUnits(lpTokenSupply, lpTokenDecimals)) > 0 ? Number(
    Number(ethers.utils.formatEther(lpRewardEma.reserveAsset)) 
    * blocksPerDay 
    / Number(ethers.utils.formatUnits(lpTokenSupply, lpTokenDecimals))
  ).toFixed(3)
  :
  '0.000'

  const ibc24HReward = Number(ethers.utils.formatUnits(lpTokenSupply, lpTokenDecimals)) > 0 ? Number(
    Number(ethers.utils.formatEther(lpRewardEma.ibcAsset)) 
    * blocksPerDay 
    / Number(ethers.utils.formatUnits(lpTokenSupply, lpTokenDecimals))
  ).toFixed(3)
  :
  '0.000'

  return (
    <>
      <Stack direction="row" pr='7'>
        <Stack w='50%'>
          <Text ml={7} mt={7} align="left" fontSize='md'>RESERVE</Text>
          <Stack direction="row">
            <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatEther(reserveAmount), "ETH")}`}</Text>
            {
              newReserve.gt(0) && !newReserve.eq(reserveAmount) && 
              <>
                <Box ml='7' mr='7'>
                  <Icon as={HiOutlineArrowRight} h='100%'/>
                </Box>
                <Text>{`${formatNumber(ethers.utils.formatEther(newReserve), "ETH")}`}</Text>
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

                <Text>{`${formatNumber(reserve24HReward, "ETH")} + ${formatNumber(ibc24HReward, "IBC")}`}</Text>
                </>
              }
          </Stack>
        </Stack>
      </Stack>
    </>
  )
}
