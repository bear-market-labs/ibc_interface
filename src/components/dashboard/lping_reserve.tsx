import {  ethers } from 'ethers'
import { Box, Icon, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function LpingReserve(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const virtualReserveAmount = BigNumber.from(bondingCurveParams?.virtualReserveAmount);

  const reserveAmount = BigNumber.from("reserveAmount" in bondingCurveParams ? bondingCurveParams.reserveAmount : '0').sub(virtualReserveAmount); 
  const newReserve = BigNumber.from(parentInputDynamicData?.newReserve ? parentInputDynamicData.newReserve : '0').sub(virtualReserveAmount); 

  return (
    <>
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
    </>
  )
}
