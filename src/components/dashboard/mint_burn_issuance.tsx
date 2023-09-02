import {  ethers } from 'ethers'
import { Box, Button, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function MintBurnIssuance(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const reserveAmount = BigNumber.from("reserveAmount" in bondingCurveParams ? bondingCurveParams.reserveAmount : '0'); 
  const inverseTokenSupply = BigNumber.from("inverseTokenSupply" in bondingCurveParams ? bondingCurveParams.inverseTokenSupply : '0'); 
  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 


  const newIbcIssuance = BigNumber.from(parentInputDynamicData?.newIbcIssuance ? parentInputDynamicData.newIbcIssuance : '0')
  const newReserve = BigNumber.from(parentInputDynamicData?.newReserve ? parentInputDynamicData.newReserve : '0')

  return (
    <>
      <Stack>
        <Text ml={7} mt={7} align="left">ISSUANCE</Text>
        <Stack direction="row">
          <Text ml={7} align="left">{`${Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals)).toFixed(3)} IBC`}</Text>
          {
            newIbcIssuance.gt(0) &&
            <>
              <Text align="center">{`-->`}</Text>
              <Text align="right">{`${Number(ethers.utils.formatUnits(newIbcIssuance, inverseTokenDecimals)).toFixed(3)} IBC`}</Text>
            </>
          }
        </Stack>

        <Spacer />

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
