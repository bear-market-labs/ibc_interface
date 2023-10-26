import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers, BigNumber } from 'ethers'
import { Box, Button, Divider, Icon, Input, Menu, MenuButton, MenuItem, MenuList, Stack, Text, Image } from '@chakra-ui/react'

import {
    Table,
    Thead,
    Tbody,
    Tfoot,
    Tr,
    Th,
    Td,
    TableContainer,
} from '@chakra-ui/react'
import { BsChevronCompactDown } from 'react-icons/bs'
import * as _ from "lodash";

import { curves } from '../../config/curves'
import { composeMulticallQuery, composeQuery } from '../../util/ethers_utils'
import { contracts } from '../../config/contracts'
import { formatNumber } from '../../util/display_formatting'
import { blocksPerDay } from '../../config/constants'
import { colors } from '../../config/style'

type assetListProps = {
    nonWalletProvider: any,
    parentSetters: any
}

type CurveInfo = {
    curveAddress: string,
    reserveSymbol: string,
    icon: string,
    ibAsset: string,
    price: number,
    reserves: number,
    stakingApr: number,
    lpApr: number,
    image: any
}

export default function AssetList(props: assetListProps) {
    const { nonWalletProvider } = props
    const [{ wallet, connecting }] = useConnectWallet()
    const [provider, setProvider] =
        useState<ethers.providers.Web3Provider | null>()

    const [curveList, setCurveList] = useState<CurveInfo[]>();
    const [filteredCurveList, setFilteredCurveList] = useState<CurveInfo[]>();
    const [sortOption, setSortOption] = useState<string>("HIGHEST STAKING APR");

    useEffect(() => {
        const fetchCurveMetrics = async () => {
            const abiCoder = ethers.utils.defaultAbiCoder;

            let curveStates = _.map(curves, curve => {
                return {
                    ...curve,
                    price: 0,
                    reserves: 0,
                    stakingApr: 0,
                    lpApr: 0,
                    image: null
                }
            });

            let curveQueries = _.map(curves, curve => {
                return [
                    composeMulticallQuery(curve.curveAddress, "curveParameters", [], []),
                    composeMulticallQuery(curve.curveAddress, "totalStaked", [], []),
                    composeMulticallQuery(curve.curveAddress, "blockRewardEMA", ["uint8"], [0]),
                    composeMulticallQuery(curve.curveAddress, "blockRewardEMA", ["uint8"], [1])
                ]
            });


            let multicallQueries = _.flattenDepth(curveQueries, 1);

            let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
            let multicallBytes = await nonWalletProvider.call(multicallQuery)
            let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

            for (let i = 0; i < curves.length; i++) {
                const bondingCurveParamsBytes = multicallResults[i * 4][0] ? multicallResults[i * 4][1] : [[0, 0, 0, 0, 0]]
                const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,uint256,uint256)"], bondingCurveParamsBytes)

                const totalStakingBalanceBytes = multicallResults[i * 4 + 1][0] ? multicallResults[i * 4 + 1][1] : [0];
                const totalStakingBalance = abiCoder.decode(["uint"], totalStakingBalanceBytes)[0]

                const lpRewardEmaBytes = multicallResults[i * 4 + 2][0] ? multicallResults[i * 4 + 2][1] : [0, 0]
                const lpRewardEma = abiCoder.decode(["uint256", "uint256"], lpRewardEmaBytes)

                const stakingRewardEmaBytes = multicallResults[i * 4 + 3][0] ? multicallResults[i * 4 + 3][1] : [0, 0]
                const stakingRewardEma = abiCoder.decode(["uint256", "uint256"], stakingRewardEmaBytes)

                bondingCurveParams[0][0].toString()
                curveStates[i].price = Number(ethers.utils.formatEther(ethers.BigNumber.from(bondingCurveParams[0][3].toString())));
                curveStates[i].reserves = Number(ethers.utils.formatEther(ethers.BigNumber.from(bondingCurveParams[0][0].toString())));

                const reserveStakingRewardInIbc = Number(
                    Number(ethers.utils.formatEther(stakingRewardEma[1].toString()))
                    * blocksPerDay * 365
                    / curveStates[i].price
                )

                const ibcStakingReward = Number(
                    Number(ethers.utils.formatEther(stakingRewardEma[0].toString()))
                    * blocksPerDay * 365
                )
                curveStates[i].stakingApr = totalStakingBalance > 0? (reserveStakingRewardInIbc + ibcStakingReward) * 100 / Number(ethers.utils.formatEther(totalStakingBalance)): 0;

                const reserveStakingReward = Number(
                    Number(ethers.utils.formatEther(lpRewardEma[1].toString()))
                    * blocksPerDay * 365
                )

                const ibcStakingRewardInReserve = Number(
                    Number(ethers.utils.formatEther(lpRewardEma[0].toString()))
                    * blocksPerDay * 365 * curveStates[i].price
                )
                curveStates[i].lpApr = (reserveStakingReward + ibcStakingRewardInReserve) * 100 / curveStates[i].reserves;

                curveStates[i].image = require('../../assets/' + curveStates[i].icon);
            }

            setCurveList(curveStates);
            setFilteredCurveList(curveStates);
        }

        fetchCurveMetrics().then(() => { }).catch((err) => { console.log(err) })
    }, [nonWalletProvider])

    const sortCurves = (order: string) => {
        setSortOption(order);
        let orderField = "stakingApr";
        if (order === "HIGHEST STAKING APR") {
            orderField = "stakingApr";
        }else{
            orderField = "lpApr";
        }
        setFilteredCurveList(_.orderBy(curveList, [orderField], ['desc']));
    }

    const searchCurve = (search: string) => {

        if(search.startsWith("0x")){
            setFilteredCurveList(_.filter(curveList, curve => curve.curveAddress.toLowerCase() === search.toLowerCase()));
        }else{
            setFilteredCurveList(_.filter(curveList, curve => _.includes(curve.ibAsset.toLowerCase(), search.toLowerCase())));
        }
    }

    return (
        <Stack justifyContent={'start'} h='calc(100vh - 220px)' maxW='100%'>
            <Stack direction="row" pr='7'>
                <Stack w='50%'>
                    <Text ml={7} mt={7} align="left" fontSize='md'>SEARCH</Text>
                    <Stack direction='row' fontSize={{ base: "xl", xl: "xl", "2xl": "2xl" }} fontWeight='700'>
                        <Input ml={7}
                            fontSize={{ base: "xl", xl: "xl", "2xl": "2xl" }}
                            fontWeight='700'
                            placeholder='ASSET TO FIND'
                            minWidth='auto'
                            border='none'
                            height={`unset`}
                            paddingInline={`unset`}
                            onChange={(event) => searchCurve(event.target.value)}
                        />
                    </Stack>
                </Stack>
                <Stack w='50%' direction='row' fontSize={{ base: "xl", xl: "xl", "2xl": "2xl" }} fontWeight='700'>
                    <Divider height='69px' mr='7' mt='7' orientation='vertical' colorScheme={'gray'} />
                    <Stack align={'right'}>
                        <Text mt={7} align="left" fontSize='md'>SORT BY</Text>
                        <Stack direction='row'>
                            <Menu>
                                <MenuButton>
                                    <Stack direction='row' align='center' gap='0'>
                                        <Text>{sortOption}</Text>
                                        <Icon as={BsChevronCompactDown} fontSize='2xl' alignSelf={'right'} m='1' />
                                    </Stack>                                    
                                </MenuButton>
                                <MenuList>
                                    <MenuItem onClick={() => sortCurves("HIGHEST STAKING APR")}>HIGHEST STAKING APR</MenuItem>
                                    <MenuItem onClick={() => sortCurves("HIGHEST LP APR")}>HIGHEST LP APR</MenuItem>
                                </MenuList>
                            </Menu>
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>

            <Stack direction="row" mt='12' w='100%'>
                <TableContainer w='100%' maxH='calc(100vh - 350px)' overflowY='auto'>
                    <Table variant='simple'>
                        <Thead>
                            <Tr >
                                <Th borderColor='rgba(255, 255, 255, 0.16)' textTransform='none' fontWeight='500' fontSize='sm' color={colors.WHITE}>ibASSET</Th>
                                <Th borderColor='rgba(255, 255, 255, 0.16)' fontWeight='500' fontSize='sm' color={colors.WHITE}>PRICE</Th>
                                <Th borderColor='rgba(255, 255, 255, 0.16)' fontWeight='500' fontSize='sm' color={colors.WHITE}>RESERVES</Th>
                                <Th borderColor='rgba(255, 255, 255, 0.16)' fontWeight='500' fontSize='sm' color={colors.WHITE}>STAKING APR</Th>
                                <Th borderColor='rgba(255, 255, 255, 0.16)' fontWeight='500' fontSize='sm' color={colors.WHITE}>LP APR</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {filteredCurveList && filteredCurveList.map((item) => {
                                return (
                                    <Tr h='70px'>
                                        <Td borderColor='rgba(255, 255, 255, 0.16)'>
                                            <Stack direction='row' align='center' gap='0'>
                                                <Box boxSize='28px' mr='4'>
                                                    <Image src={item.image} alt={item.ibAsset} />
                                                </Box>
                                                <Text fontWeight='700'>{item.ibAsset}</Text>
                                            </Stack>

                                        </Td>
                                        <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{formatNumber(item.price.toString(), item.reserveSymbol)}</Td>
                                        <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{formatNumber(item.reserves.toString(), item.reserveSymbol)}</Td>
                                        <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{item.stakingApr.toFixed(2)}%</Td>
                                        <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{item.lpApr.toFixed(2)}%</Td>
                                    </Tr>
                                )
                            })}
                        </Tbody>
                    </Table>
                </TableContainer>
            </Stack>
        </Stack>
    )
}