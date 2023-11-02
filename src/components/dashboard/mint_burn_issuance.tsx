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
  const inverseTokenDecimals = BigNumber.from("inverseTokenDecimals" in dashboardDataSet ? dashboardDataSet.inverseTokenDecimals : '0'); 
  const reserveTokenDecimals = BigNumber.from("reserveTokenDecimals" in dashboardDataSet ? dashboardDataSet.reserveTokenDecimals : '0'); 

  let newIbcIssuance = parentInputDynamicData?.newIbcIssuance ? parentInputDynamicData.newIbcIssuance: BigInt(0)
  let newReserve = parentInputDynamicData?.newReserve ? BigNumber.from(parentInputDynamicData.newReserve) : BigNumber.from('0')

  if ( // math.abs not allowed for bigints
    (
      newIbcIssuance > BigInt(inverseTokenSupply.toString()) 
      && 
      newIbcIssuance - BigInt(inverseTokenSupply.toString()) < diffTolerance * 10**inverseTokenDecimals.toNumber() 
    )
    ||
    (
      BigInt(inverseTokenSupply.toString()) > newIbcIssuance
      &&
      BigInt(inverseTokenSupply.toString()) - newIbcIssuance < diffTolerance * 10**inverseTokenDecimals.toNumber()
    )
  ){
    newIbcIssuance = BigInt(inverseTokenSupply.toString())
  }
  const newIbcIssuanceSaneFormat = newIbcIssuance / BigInt(10**inverseTokenDecimals.toNumber())

  if (Math.abs(Number(ethers.utils.formatUnits(reserveAmount.sub(newReserve), reserveTokenDecimals))) < diffTolerance){
    newReserve = reserveAmount
  }


  return (
    <>
      <Stack>
        <Text ml={7} mt={{base:4, xl:4, "2xl": 4, "3xl": 7}} align="left" fontSize='md'>ISSUANCE</Text>
        <Stack direction="row" fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>
          <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals), dashboardDataSet.reserveTokenSymbol, true, true)}`}</Text>
          {
            newIbcIssuance > BigInt(0) && newIbcIssuance !== BigInt(inverseTokenSupply.toString()) &&
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${formatNumber(newIbcIssuanceSaneFormat.toString(), dashboardDataSet.inverseTokenSymbol)}`}</Text>
            </>
          }
        </Stack>

        <Spacer />

        <Text ml={7} mt={{base:4, xl:4, "2xl": 4, "3xl": 7}} align="left" fontSize='md'>RESERVE</Text>
        <Stack direction="row" fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>
          <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatUnits(reserveAmount, reserveTokenDecimals), dashboardDataSet.reserveTokenSymbol)}`}</Text>
          {
            newReserve.gt(0) && !newReserve.eq(reserveAmount) &&
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${formatNumber(ethers.utils.formatUnits(newReserve, reserveTokenDecimals), dashboardDataSet.reserveTokenSymbol)}`}</Text>
            </>
          }
        </Stack>
      </Stack>
    </>
  )
}
