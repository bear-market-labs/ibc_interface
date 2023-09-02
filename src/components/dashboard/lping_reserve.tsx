import {  ethers } from 'ethers'
import { Box, Button, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function LpingReserve(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const reserveAmount = BigNumber.from("reserveAmount" in bondingCurveParams ? bondingCurveParams.reserveAmount : '0'); 
  const newReserve = BigNumber.from(parentInputDynamicData?.newReserve ? parentInputDynamicData.newReserve : '0')

  return (
    <>
      <Stack>
      <Text ml={7} mt={7} align="left">RESERVE</Text>
      <Stack direction="row">
        <Text ml={7} align="left">{`${Number(ethers.utils.formatEther(reserveAmount)).toFixed(3)} ETH`}</Text>
        {
          newReserve.gt(0) &&
          <>
            <Text align="center">{`-->`}</Text>
            <Text align="right">{`${Number(ethers.utils.formatEther(newReserve)).toFixed(3)} ETH`}</Text>
          </>
        }
      </Stack>
      </Stack>
    </>
  )
}
