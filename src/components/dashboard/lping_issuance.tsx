import {  ethers } from 'ethers'
import { Box, Icon, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { BigNumber as bignumber } from 'bignumber.js'
import { HiOutlineArrowRight} from "react-icons/hi"
import { formatNumber } from '../../util/display_formatting'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

const issuanceDiffTolerance = 0.000001

export default function LpingIssuance(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  
  const lpTokenSupply = "lpTokenSupply" in dashboardDataSet ? BigNumber.from(dashboardDataSet.lpTokenSupply) : BigNumber.from('0')

  const lpTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const userLpTokenBalance = BigNumber.from("userLpTokenBalance" in dashboardDataSet ? dashboardDataSet.userLpTokenBalance : '0'); 
  const userCurrentLpShare = Number(ethers.utils.formatUnits(lpTokenSupply)) > 0 ? bignumber(userLpTokenBalance.toString()).dividedBy(bignumber(lpTokenSupply.toString())).multipliedBy(100) : 0;



  let newLpIssuance = parentInputDynamicData?.newLpIssuance ? BigNumber.from(parentInputDynamicData.newLpIssuance) : BigNumber.from('0')

  if (Math.abs(Number(ethers.utils.formatUnits(lpTokenSupply.sub(newLpIssuance), lpTokenDecimals))) < issuanceDiffTolerance){
    newLpIssuance = lpTokenSupply
  }

  const userNewLpShare = bignumber(userLpTokenBalance.add(newLpIssuance.sub(lpTokenSupply)).toString()).dividedBy(bignumber(newLpIssuance.toString())).multipliedBy(100)

  return (
    <>
      <Stack>
        <Text ml={7} mt={{base:4, xl:4, "2xl": 4, "3xl": 7}} align="left" fontSize='md'>LP TOKEN ISSUANCE</Text>
        <Stack direction="row" fontSize='2xl' fontWeight='700'>
          <Text ml={7} align="left">{`${formatNumber(ethers.utils.formatUnits(lpTokenSupply, lpTokenDecimals), "LP")}`}</Text>
          {
            newLpIssuance.gt(0) && !newLpIssuance.eq(lpTokenSupply) && 
            <>
              <Box ml='7' mr='7'>
                <Icon as={HiOutlineArrowRight} h='100%'/>
              </Box>
              <Text>{`${formatNumber(ethers.utils.formatUnits(newLpIssuance, lpTokenDecimals), "LP")}`}</Text>
            </>
          }
        </Stack>

        <Spacer />

        <Text ml={7} mt={{base:4, xl:4, "2xl": 4, "3xl": 7}} align="left" fontSize='md'>SHARE OF TOTAL LP</Text>
        <Stack direction="row" fontSize='2xl' fontWeight='700'>
          <Text ml={7} align="left">{`${userCurrentLpShare.toFixed(2)} %`}</Text>
          {
            userNewLpShare.isFinite() && !userNewLpShare.eq(userCurrentLpShare) &&
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
