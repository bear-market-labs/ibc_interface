import {  ethers } from 'ethers'
import { Box, Center, Divider, Icon, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"
import { blocksPerDay } from '../../config/constants'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function LpingReserve(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const virtualReserveAmount = Object.keys(bondingCurveParams).length > 0 ? BigNumber.from(bondingCurveParams?.virtualReserveAmount) : BigNumber.from('0');

  const reserveAmount = "reserveAmount" in bondingCurveParams ? BigNumber.from(bondingCurveParams.reserveAmount).sub(virtualReserveAmount) : BigNumber.from('0'); 
  const newReserve = parentInputDynamicData?.newReserve ? BigNumber.from(parentInputDynamicData.newReserve).sub(virtualReserveAmount) : BigNumber.from('0'); 
  const lpRewardEma = "lpRewardEma" in dashboardDataSet ? dashboardDataSet.lpRewardEma : {
    reserveAsset: 0,
    ibcAsset: 0
  }; 

  const virtualLpAmount = Object.keys(bondingCurveParams).length > 0 ? BigNumber.from(bondingCurveParams?.virtualReserveAmount) : BigNumber.from('0');
  const lpTokenSupply = "lpTokenSupply" in dashboardDataSet ? BigNumber.from(dashboardDataSet.lpTokenSupply).sub(virtualLpAmount) : BigNumber.from('0')
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
      <Stack direction="row">
        <Stack>
          <Text ml={7} mt={7} align="left">RESERVE</Text>
          <Stack direction="row">
            <Text ml={7} align="left">{`${Number(ethers.utils.formatEther(reserveAmount)).toFixed(3)} ETH`}</Text>
            {
              newReserve.gt(0) && !newReserve.eq(reserveAmount) && 
              <>
                <Box ml='7' mr='7'>
                  <Icon as={HiOutlineArrowRight} h='100%'/>
                </Box>
                <Text>{`${Number(ethers.utils.formatEther(newReserve)).toFixed(3)} ETH`}</Text>
              </>
            }
          </Stack>
        </Stack>
        <Center mt={7} ml={346} height='69px'>
          <Divider orientation='vertical' colorScheme={'gray'} />
        </Center>
        <Stack ml={50} align={'right'}>
          <Text  mt={7} align="left">APPROX LP REWARDS</Text>
            {
              <>

                <Text>{`${reserve24HReward} ETH + ${ibc24HReward} IBC`}</Text>
                </>
            }
        </Stack>
      </Stack>
    </>
  )
}
