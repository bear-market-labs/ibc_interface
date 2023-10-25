import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers, BigNumber } from 'ethers'
import { Button, Divider, Icon, Input, Menu, MenuButton, MenuItem, MenuList, Stack, Text } from '@chakra-ui/react'

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

type assetListProps = {
    nonWalletProvider: any,
    parentSetters: any
}

type CurveInfo = {
    curveAddress: string,
    reserveSymbol: string,
    ibAsset: string,
    price: number,
    reserves: number,
    stakingApr: number,
    lpApr: number
}

export default function AssetList(props: assetListProps) {
    const { nonWalletProvider } = props
    const [{ wallet, connecting }] = useConnectWallet()
    const [provider, setProvider] =
        useState<ethers.providers.Web3Provider | null>()

    const [curveList, setCurveList] = useState<CurveInfo[]>();

    useEffect(() => {
        const fetchCurveMetrics = async () => {
            const abiCoder = ethers.utils.defaultAbiCoder;

            let curveStates = _.map(curves, curve => {
                return {
                    ...curve,
                    price: 0,
                    reserves: 0,
                    stakingApr: 0,
                    lpApr: 0
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
            console.log(multicallQueries);


            let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
            let multicallBytes = await nonWalletProvider.call(multicallQuery)
            let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

            console.log(multicallResults)

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



                // reserveAsset: stakingRewardEma[1].toString(),
                // ibcAsset: stakingRewardEma[0].toString(),

                const reserveStakingRewardInIbc = Number(
                    Number(ethers.utils.formatEther(stakingRewardEma[1].toString()))
                    * blocksPerDay * 365
                    / curveStates[i].price
                )

                const ibcStakingReward = Number(
                    Number(ethers.utils.formatEther(stakingRewardEma[0].toString()))
                    * blocksPerDay * 365
                )
                curveStates[i].stakingApr = (reserveStakingRewardInIbc + ibcStakingReward) * 100 / Number(ethers.utils.formatEther(totalStakingBalance));

                const reserveStakingReward = Number(
                    Number(ethers.utils.formatEther(lpRewardEma[1].toString()))
                    * blocksPerDay * 365
                )

                const ibcStakingRewardInReserve = Number(
                    Number(ethers.utils.formatEther(lpRewardEma[0].toString()))
                    * blocksPerDay * 365 * curveStates[i].price
                )
                curveStates[i].lpApr = (reserveStakingReward + ibcStakingRewardInReserve) * 100 / curveStates[i].reserves;



            }

            setCurveList(curveStates);

        }

        fetchCurveMetrics().then(() => { }).catch((err) => { console.log(err) })
    }, [nonWalletProvider])

    const sortCurves = (order: string) => {

    }

    return (
        <Stack justifyContent={'start'} h='calc(100vh - 220px)'>
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
                                    HIGHEST STAKING APR<Icon as={BsChevronCompactDown} fontSize='2xl' alignSelf={'right'} m='1' />
                                </MenuButton>
                                <MenuList>
                                    <MenuItem onClick={() => sortCurves("")}>HIGHEST STAKING APR</MenuItem>
                                    <MenuItem onClick={() => sortCurves("")}>HIGHEST LP APR</MenuItem>
                                </MenuList>
                            </Menu>
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>

            <Stack direction="row" mt='12' w='100%'>
                <TableContainer w='100%'>
                    <Table variant='simple'>
                        <Thead>
                            <Tr textTransform={'none'}>
                                <Th>ibASSET</Th>
                                <Th>PRICE</Th>
                                <Th>RESERVES</Th>
                                <Th>STAKING APR</Th>
                                <Th>LP APR</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {curveList && curveList.map((item) => {

                                return (
                                    <Tr>
                                        <Td>{item.ibAsset}</Td>
                                        <Td>{formatNumber(item.price.toString(), item.reserveSymbol)}</Td>
                                        <Td>{formatNumber(item.reserves.toString(), item.reserveSymbol)}</Td>
                                        <Td>{item.stakingApr.toFixed(2)}%</Td>
                                        <Td>{item.lpApr.toFixed(2)}%</Td>
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