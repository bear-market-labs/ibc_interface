import {  ethers } from 'ethers'
import { Box, Icon, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"
import { formatNumber } from '../../util/display_formatting'
import { defaultDecimals } from '../../config/constants'
import { font_sizes } from '../../config/style'
import { formatUnitsBnJs } from '../../util/ethers_utils'

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
  const inverseTokenDecimals = BigNumber.from("inverseTokenDecimals" in dashboardDataSet ? dashboardDataSet.inverseTokenDecimals : '0'); 

  let newIbcIssuance = parentInputDynamicData?.newIbcIssuance ? parentInputDynamicData.newIbcIssuance: BigNumber.from('0')
  let newReserve = parentInputDynamicData?.newReserve ? BigNumber.from(parentInputDynamicData.newReserve) : BigNumber.from('0')

  if ( // math.abs not allowed for bigints
    (
      newIbcIssuance.gt(inverseTokenSupply)
      && 
      newIbcIssuance.sub(inverseTokenSupply) < BigNumber.from(Number(diffTolerance * 10**inverseTokenDecimals.toNumber()).toFixed(0)) 
    )
    ||
    (
      inverseTokenSupply.gt(newIbcIssuance)
      &&
      inverseTokenSupply.sub(newIbcIssuance) < BigNumber.from(Number(diffTolerance * 10**inverseTokenDecimals.toNumber()).toFixed(0)) 
    )
  ){
    newIbcIssuance = inverseTokenSupply
  }

  // div and mod
  const newIbcIssuanceSaneFormat = formatUnitsBnJs(newIbcIssuance, inverseTokenDecimals.toNumber())

  if (Math.abs(Number(ethers.utils.formatUnits(reserveAmount.sub(newReserve), defaultDecimals))) < diffTolerance){
    newReserve = reserveAmount
  }


  return (
    <>
      <Stack>
        <Text ml={7} mt={{base:4, xl:4, "2xl": 4, "3xl": 7}} align="left" fontSize='md'>ISSUANCE</Text>
        <Stack direction="row" fontSize={font_sizes.MAIN_VALUES} fontWeight='700'>
          <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals), dashboardDataSet.reserveTokenSymbol, true, true)}`}</Text>
          {
            newIbcIssuance.gt(0) && !newIbcIssuance.eq(inverseTokenSupply) &&
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${formatNumber(newIbcIssuanceSaneFormat, dashboardDataSet.reserveTokenSymbol, true, true)}`}</Text>
            </>
          }
        </Stack>

        <Spacer />

        <Text ml={7} mt={{base:4, xl:4, "2xl": 4, "3xl": 7}} align="left" fontSize='md'>RESERVE</Text>
        <Stack direction="row" fontSize={font_sizes.MAIN_VALUES} fontWeight='700'>
          <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatUnits(reserveAmount, defaultDecimals), dashboardDataSet.reserveTokenSymbol)}`}</Text>
          {
            newReserve.gt(0) && !newReserve.eq(reserveAmount) &&
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${formatNumber(ethers.utils.formatUnits(newReserve, defaultDecimals), dashboardDataSet.reserveTokenSymbol)}`}</Text>
            </>
          }
        </Stack>
      </Stack>
    </>
  )
}
