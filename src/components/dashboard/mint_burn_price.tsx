import { ethers } from 'ethers'
import { Box, Stack, Text, Icon, Divider, Center } from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { HiOutlineArrowRight} from "react-icons/hi"
import { colors } from "../../config/style";
import AddIbc from './add_ibc';
import { blocksPerDay, reserveAssetSymbol } from '../../config/constants';
import { formatNumber, formatPriceNumber } from '../../util/display_formatting';

type mintProps = {
  dashboardDataSet: any;
  parentInputDynamicData: any;
}

export default function MintBurnPrice(props: mintProps) {
  const {dashboardDataSet, parentInputDynamicData} = props
  const bondingCurveParams = "bondingCurveParams" in dashboardDataSet ? dashboardDataSet.bondingCurveParams : {};
  const currentTokenPrice = BigNumber.from("currentTokenPrice" in bondingCurveParams ? bondingCurveParams.currentTokenPrice : '0'); 
  const newPrice = BigNumber.from(parentInputDynamicData?.newPrice ? parentInputDynamicData.newPrice : '0')
  const inverseTokenDecimals = "inverseTokenDecimals" in dashboardDataSet ? dashboardDataSet.inverseTokenDecimals : '0'; 
  const reserveTokenDecimals = "reserveTokenDecimals" in dashboardDataSet ? dashboardDataSet.reserveTokenDecimals : BigNumber.from('0'); 
  const stakingRewardEma = "stakingRewardEma" in dashboardDataSet ? dashboardDataSet.stakingRewardEma : {
    reserveAsset: 0,
    ibcAsset: 0
  }; 
  const inverseTokenSupply = "inverseTokenSupply" in bondingCurveParams ? BigNumber.from(bondingCurveParams.inverseTokenSupply): BigNumber.from('0'); 


  const reserve24HReward = Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals)) > 0 ? Number(
    Number(ethers.utils.formatEther(stakingRewardEma.reserveAsset)) 
    * blocksPerDay 
    / Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals))
  ).toString()
  :
  '0'

  const ibc24HReward = Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals)) > 0 ? Number(
    Number(ethers.utils.formatEther(stakingRewardEma.ibcAsset)) 
    * blocksPerDay 
    / Number(ethers.utils.formatUnits(inverseTokenSupply, inverseTokenDecimals))
  ).toString()
  :
  '0'

  const formattedCurrentPrice = formatPriceNumber(currentTokenPrice, reserveTokenDecimals.toNumber(), reserveAssetSymbol)
  const needSymbolLine = Number(formattedCurrentPrice) > 1e-9 && Number(formattedCurrentPrice) < 0.001 

  const formattedNewPrice = formatPriceNumber(newPrice, reserveTokenDecimals.toNumber(), "ETH")
  const alsoNeedSymbolLine = Number(formattedNewPrice) > 1e-9 && Number(formattedNewPrice) < 0.001

  return (
    <>
    <Stack direction="row" pr='7'>
      <Stack w='50%'>
        <Text ml={7} mt={7} align="left" fontSize='md'>MARKET PRICE</Text>
        <Stack direction='row' fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>
          <Stack rowGap={0}>
            <Text ml={7} align="left">{`${formattedCurrentPrice}${needSymbolLine ? '' : ' ' + dashboardDataSet.reserveTokenSymbol}`}</Text>
            {
              needSymbolLine && 
              <>
                <Text textAlign={`left`}>{dashboardDataSet.reserveTokenSymbol}</Text>
              </>
            }
          </Stack>
          <Stack>
            {
              newPrice.gt(0) && !newPrice.eq(currentTokenPrice) && 
              <>
                <Stack direction="row">
                  <Box ml='7' mr='7'>
                    <Icon marginTop={`7px`} as={HiOutlineArrowRight}/>
                  </Box>
                  <Stack rowGap={0}>
                    <Text>{`${formattedNewPrice}${alsoNeedSymbolLine ? '' : ' ' + dashboardDataSet.reserveTokenSymbol}`}</Text>
                    {
                      alsoNeedSymbolLine && 
                      <>
                        <Text textAlign={`left`}>{dashboardDataSet.reserveTokenSymbol}</Text>
                      </>
                    }
                  </Stack>
                </Stack>
              </>
            }
          </Stack>
        </Stack>
      </Stack>
      <Stack w='50%' direction='row'>
        <Divider height='69px' mr='7' mt='7' orientation='vertical' colorScheme={'gray'} />
        <Stack align={'right'}>
          <Text mt={7} align="left" fontSize='md'>APPROX. STAKED REWARDS</Text>
          <Stack direction='row'>
            {
              <>

                <Text fontSize={{base: "xl", xl: "xl", "2xl": "2xl"}} fontWeight='700'>{`${formatNumber(reserve24HReward, dashboardDataSet.reserveTokenSymbol)} + ${formatNumber(ibc24HReward, dashboardDataSet.inverseTokenSymbol)}`}</Text>
                </>
            }
          </Stack>
        </Stack>
      </Stack>
      </Stack>
    </>
  )
}
