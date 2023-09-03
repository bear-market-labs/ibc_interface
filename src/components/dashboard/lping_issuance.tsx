import {  ethers } from 'ethers'
import { Box, Button, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { BigNumber as bignumber } from 'bignumber.js'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function LpingIssuance(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  
  const lpTokenSupply = BigNumber.from("lpTokenSupply" in dashboardDataSet ? dashboardDataSet.lpTokenSupply : '0'); 
  const lpTokenDecimals = BigNumber.from("lpTokenDecimals" in dashboardDataSet ? dashboardDataSet.lpTokenDecimals : '0'); 
  const userLpTokenBalance = BigNumber.from("userLpTokenBalance" in dashboardDataSet ? dashboardDataSet.userLpTokenBalance : '0'); 
  const userCurrentLpShare = bignumber(userLpTokenBalance.toString()).dividedBy(bignumber(lpTokenSupply.toString())).multipliedBy(100)


  const newLpIssuance = BigNumber.from(parentInputDynamicData?.newLpIssuance ? parentInputDynamicData.newLpIssuance : '0')
  const userNewLpShare = bignumber(userLpTokenBalance.add(newLpIssuance.sub(lpTokenSupply)).toString()).dividedBy(bignumber(newLpIssuance.toString())).multipliedBy(100)

  return (
    <>
      <Stack>
        <Text ml={7} mt={7} align="left">LP TOKEN ISSUANCE</Text>
        <Stack direction="row">
          <Text ml={7} align="left">{`${Number(ethers.utils.formatUnits(lpTokenSupply, lpTokenDecimals)).toFixed(3)} IBC`}</Text>
          {
            newLpIssuance.gt(0) &&
            <>
              <Text align="center">{`-->`}</Text>
              <Text align="right">{`${Number(ethers.utils.formatUnits(newLpIssuance, lpTokenDecimals)).toFixed(3)} IBC`}</Text>
            </>
          }
        </Stack>

        <Spacer />

        <Text ml={7} mt={7} align="left">SHARE OF TOTAL LP</Text>
        <Stack direction="row">
          <Text ml={7} align="left">{`${userCurrentLpShare.toFixed(2)} %`}</Text>
          {
            userNewLpShare.gt(0) &&
            <>
              <Text align="center">{`-->`}</Text>
              <Text align="right">{`${userNewLpShare.toFixed(2)} %`}</Text>
            </>
          }
        </Stack>
      </Stack>
    </>
  )
}
