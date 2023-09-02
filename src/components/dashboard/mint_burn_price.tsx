import {  ethers } from 'ethers'
import { Box, Button, Input, Spacer, Stack, Text } from '@chakra-ui/react'
import { BigNumber } from 'ethers'

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function MintBurnPrice(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const currentTokenPrice = BigNumber.from("currentTokenPrice" in bondingCurveParams ? bondingCurveParams.currentTokenPrice : '0'); 
  const newPrice = BigNumber.from(parentInputDynamicData?.newPrice ? parentInputDynamicData.newPrice : '0')

  return (
    <>
      <Stack>
      <Text ml={7} mt={7} align="left">MARKET PRICE</Text>
      <Stack direction="row">
        <Text ml={7} align="left">{`${Number(ethers.utils.formatEther(currentTokenPrice)).toFixed(3)} ETH`}</Text>
        {
          newPrice.gt(0) &&
          <>
            <Text align="center">{`-->`}</Text>
            <Text align="right">{`${Number(ethers.utils.formatEther(newPrice)).toFixed(3)} ETH`}</Text>
          </>
        }
      </Stack>
      </Stack>
    </>
  )
}
