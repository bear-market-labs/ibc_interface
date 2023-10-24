import {  ethers } from 'ethers'
import { Box, Icon, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"
import { formatNumber } from '../../util/display_formatting'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

const diffTolerance = 0.000001

export default function MintBurnIssuance(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const reserveAmount = "reserveAmount" in bondingCurveParams ? BigNumber.from(bondingCurveParams.reserveAmount) : BigNumber.from('0'); 
  const inverseTokenSupply = "inverseTokenSupply" in bondingCurveParams ? BigNumber.from(bondingCurveParams.inverseTokenSupply) : BigNumber.from('0'); 
  const inverseTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 


  let newIbcIssuance = parentInputDynamicData?.newIbcIssuance ? BigNumber.from(parentInputDynamicData.newIbcIssuance): BigNumber.from('0')
  let newReserve = parentInputDynamicData?.newReserve ? BigNumber.from(parentInputDynamicData.newReserve) : BigNumber.from('0')

  if (Math.abs(Number(ethers.utils.formatUnits(inverseTokenSupply.sub(newIbcIssuance), inverseTokenDecimals))) < diffTolerance){
    newIbcIssuance = inverseTokenSupply
  }

  if (Math.abs(Number(ethers.utils.formatEther(reserveAmount.sub(newReserve)))) < diffTolerance){
    newReserve = reserveAmount
  }


  return (
    <>
      <Stack>
        <Text ml={7} mt={{base:4, xl:4, "2xl": 4, "3xl": 7}} align="left" fontSize='md'>ISSUANCE</Text>
        <Stack direction="row" fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>
          <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals), "IBC")}`}</Text>
          {
            newIbcIssuance.gt(0) && !newIbcIssuance.eq(inverseTokenSupply) &&
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${formatNumber(ethers.utils.formatUnits(newIbcIssuance, inverseTokenDecimals), "IBC")}`}</Text>
            </>
          }
        </Stack>

        <Spacer />

        <Text ml={7} mt={{base:4, xl:4, "2xl": 4, "3xl": 7}} align="left" fontSize='md'>RESERVE</Text>
        <Stack direction="row" fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>
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
    </>
  )
}
