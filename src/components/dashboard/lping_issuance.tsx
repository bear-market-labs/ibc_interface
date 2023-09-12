import {  ethers } from 'ethers'
import { Box, Icon, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { BigNumber as bignumber } from 'bignumber.js'
import { HiOutlineArrowRight} from "react-icons/hi"

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

const issuanceDiffTolerance = 0.000001

export default function LpingIssuance(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const virtualLpAmount = BigNumber.from(bondingCurveParams?.virtualReserveAmount);

  const lpTokenSupply = BigNumber.from("lpTokenSupply" in dashboardDataSet ? dashboardDataSet.lpTokenSupply : '0').sub(virtualLpAmount); 
  const lpTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const userLpTokenBalance = BigNumber.from("userLpTokenBalance" in dashboardDataSet ? dashboardDataSet.userLpTokenBalance : '0'); 
  const userCurrentLpShare = bignumber(userLpTokenBalance.toString()).dividedBy(bignumber(lpTokenSupply.toString())).multipliedBy(100)



  let newLpIssuance = BigNumber.from(parentInputDynamicData?.newLpIssuance ? parentInputDynamicData.newLpIssuance : '0').sub(virtualLpAmount)

  if (Math.abs(Number(ethers.utils.formatUnits(lpTokenSupply.sub(newLpIssuance), lpTokenDecimals))) < issuanceDiffTolerance){
    newLpIssuance = lpTokenSupply
  }

  const userNewLpShare = bignumber(userLpTokenBalance.add(newLpIssuance.sub(lpTokenSupply)).toString()).dividedBy(bignumber(newLpIssuance.toString())).multipliedBy(100)

  return (
    <>
      <Stack>
        <Text ml={7} mt={7} align="left">LP TOKEN ISSUANCE</Text>
        <Stack direction="row">
          <Text ml={7} align="left">{`${Number(ethers.utils.formatUnits(lpTokenSupply, lpTokenDecimals)).toFixed(3)} LP`}</Text>
          {
            newLpIssuance.gt(0) && !newLpIssuance.eq(lpTokenSupply) && 
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${Number(ethers.utils.formatUnits(newLpIssuance, lpTokenDecimals)).toFixed(3)} LP`}</Text>
            </>
          }
        </Stack>

        <Spacer />

        <Text ml={7} mt={7} align="left">SHARE OF TOTAL LP</Text>
        <Stack direction="row">
          <Text ml={7} align="left">{`${userCurrentLpShare.toFixed(2)} %`}</Text>
          {
            userNewLpShare.gt(0) && !userNewLpShare.eq(userCurrentLpShare) &&
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${userNewLpShare.toFixed(2)} %`}</Text>
            </>
          }
        </Stack>
      </Stack>
    </>
  )
}
