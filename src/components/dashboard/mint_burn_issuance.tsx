import {  ethers } from 'ethers'
import { Box, Icon, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

const diffTolerance = 0.000001

export default function MintBurnIssuance(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const virtualReserveAmount = Object.keys(bondingCurveParams).length > 0 ? BigNumber.from(bondingCurveParams?.virtualReserveAmount) : BigNumber.from('0');
  const virtualInverseTokenAmount = Object.keys(bondingCurveParams).length > 0 ? BigNumber.from(bondingCurveParams?.virtualInverseTokenAmount) : BigNumber.from('0');

  const reserveAmount = BigNumber.from("reserveAmount" in bondingCurveParams ? bondingCurveParams.reserveAmount : '0').sub(virtualReserveAmount); 
  const inverseTokenSupply = BigNumber.from("inverseTokenSupply" in bondingCurveParams ? bondingCurveParams.inverseTokenSupply : '0').sub(virtualInverseTokenAmount); 
  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 


  let newIbcIssuance = BigNumber.from(parentInputDynamicData?.newIbcIssuance ? parentInputDynamicData.newIbcIssuance : '0').sub(virtualInverseTokenAmount)
  let newReserve = BigNumber.from(parentInputDynamicData?.newReserve ? parentInputDynamicData.newReserve : '0').sub(virtualReserveAmount)

  if (Math.abs(Number(ethers.utils.formatUnits(inverseTokenSupply.sub(newIbcIssuance), inverseTokenDecimals))) < diffTolerance){
    newIbcIssuance = inverseTokenSupply
  }

  if (Math.abs(Number(ethers.utils.formatEther(reserveAmount.sub(newReserve)))) < diffTolerance){
    newReserve = reserveAmount
  }


  return (
    <>
      <Stack>
        <Text ml={7} mt={7} align="left">ISSUANCE</Text>
        <Stack direction="row">
          <Text ml={7} align="left">{`${Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals)).toFixed(3)} IBC`}</Text>
          {
            newIbcIssuance.gt(0) && !newIbcIssuance.eq(inverseTokenSupply) &&
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${Number(ethers.utils.formatUnits(newIbcIssuance, inverseTokenDecimals)).toFixed(3)} IBC`}</Text>
            </>
          }
        </Stack>

        <Spacer />

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
