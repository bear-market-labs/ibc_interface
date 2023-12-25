import { useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers } from 'ethers'
import { Box, Divider, Icon, Input, Menu, MenuButton, MenuItem, MenuList, Stack, Text, Image, Link, Button, Tooltip } from '@chakra-ui/react'

import {
    Table,
    Thead,
    Tbody,
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
import { formatNumber, formatPriceNumber } from '../../util/display_formatting'
import { defaultDecimals, secondsPerDay } from '../../config/constants'
import { colors } from '../../config/style'
import { DefaultSpinner } from '../spinner'

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
    image: any,
    reserveAddress: string,
    ibAssetAddress: string,
    verified: boolean,
}

export default function AssetList(props: assetListProps) {
    const { nonWalletProvider, parentSetters } = props
    const [{ wallet }] = useConnectWallet()

    const [totalCurveCount, setTotalCurveCount] = useState<number>(0);
    const [curveMetadataList, setCurveMetadataList] = useState<CurveInfo[]>([]);
    const [curveList, setCurveList] = useState<CurveInfo[]>();
    const [filteredCurveList, setFilteredCurveList] = useState<CurveInfo[]>();
    const [sortOption, setSortOption] = useState<string>("HIGHEST STAKING APR");
    const [isLoading, setIsLoading] = useState(false)

    const getProvider = () => {
        return wallet?.provider ? new ethers.providers.Web3Provider(wallet.provider, 'any') : nonWalletProvider;
    }

    const fetchCurvesAddress = async () => {
        setIsLoading(true);
        let curveMetaList = [ ...curveMetadataList || []];
        if (curveMetaList.length == 0) {
            curveMetaList = _.map(curves, curve => {
                return {
                    ...curve,
                    price: 0,
                    reserves: 0,
                    stakingApr: 0,
                    lpApr: 0,
                    image: '',
                    verified: false
                }
            })
        }


        const abiCoder = ethers.utils.defaultAbiCoder;
        let multicallQueries = [
            composeMulticallQuery(contracts.default.ibcFactoryContract, "allCurvesLength", [], [])
        ]
        // Try to get 10 curves, will get 0 if not that many curves
        //TODO: improve code below to fetch the actual curve which is not in current list
        for(let i = 0; i < 10; i++){
            multicallQueries.push(composeMulticallQuery(contracts.default.ibcFactoryContract, "curves", ["uint256"], [i+ (curveList? curveList.length : 0)]));
        }
        let multicallQuery = composeQuery(contracts.default.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
        let multicallBytes = await getProvider().call(multicallQuery)
        let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]
        const totalCurveCountBytes = multicallResults[0][0] ? multicallResults[0][1] : [0];
        const totalCurveCnt = (abiCoder.decode(["uint"], totalCurveCountBytes)[0]).toNumber();
        // if(totalCurveCnt <= curveMetaList.length){
        //     return;
        // }
        console.log("totalCurveCount", totalCurveCnt);
        setTotalCurveCount(totalCurveCnt);

        const curveAddressList = [];
        for (let i = 0; i < 10; i++) {
            if (multicallResults[i + 1][0]) {
                const curveAddress = abiCoder.decode(["address"], multicallResults[i + 1][1])[0];
                if (curveAddress != ethers.constants.AddressZero) {
                    curveAddressList.push(curveAddress);
                }
            }
        }

        const curvesUnlisted = _.difference(curveAddressList, _.map(curveMetaList, 'curveAddress'));
        let curveQueries = _.map(curvesUnlisted, (curveAddress) => {
            return [
                composeMulticallQuery(curveAddress, "inverseTokenAddress", [], []),
                composeMulticallQuery(curveAddress, "reserveTokenAddress", [], []),
            ]
        });

        const multicallCurveQueries = _.flattenDepth(curveQueries, 1);

        const multicallCurveQuery = composeQuery(contracts.default.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallCurveQueries])
        multicallBytes = await getProvider().call(multicallCurveQuery)
        multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]


        for (let i = 0; i < curvesUnlisted.length; i++) {
            const inverseTokenAddressBytes = multicallResults[i * 2][0] ? multicallResults[i * 2][1] : [""];
            const inverseTokenAddress = abiCoder.decode(["address"], inverseTokenAddressBytes)[0];

            const reserveTokenAddressBytes = multicallResults[i * 2 + 1][0] ? multicallResults[i * 2 + 1][1] : [""];
            const reserveTokenAddress = abiCoder.decode(["address"], reserveTokenAddressBytes)[0];

            const curveMeta = {
                ibAsset: '',
                reserveSymbol: "",
                icon: 'ib_asset_logo.svg',
                curveAddress: curvesUnlisted[i],
                reserveAddress: reserveTokenAddress,
                ibAssetAddress: inverseTokenAddress,
                price: 0,
                reserves: 0,
                stakingApr: 0,
                lpApr: 0,
                image: '',
                verified: false
            }

            curveMetaList.push(curveMeta);

        }
        setCurveMetadataList(curveMetaList);
        parentSetters.setCurveList(curveMetaList);
        setIsLoading(false);
    }

    useEffect(() => {
        const fetchCurveMetrics = async () => {
            const abiCoder = ethers.utils.defaultAbiCoder;

            const curvesMissingInfo = _.differenceBy(curveMetadataList, curveList || [], 'curveAddress');

            if (curvesMissingInfo.length == 0) {
                return;
            }
            setIsLoading(true);
            let curveStates = _.map(curvesMissingInfo, curve => {
                return {
                    ...curve,
                    price: 0,
                    reserves: 0,
                    stakingApr: 0,
                    lpApr: 0,
                    image: null,
                    verified: false
                }
            });

            let curveQueries = _.map(curvesMissingInfo, curve => {
                return [
                    composeMulticallQuery(curve.curveAddress, "curveParameters", [], []),
                    composeMulticallQuery(curve.curveAddress, "totalStaked", [], []),
                    composeMulticallQuery(curve.curveAddress, "rewardEMAPerSecond", ["uint8"], [0]),
                    composeMulticallQuery(curve.curveAddress, "rewardEMAPerSecond", ["uint8"], [1]),
                    composeMulticallQuery(curve.reserveAddress, "symbol", [], []),
                    composeMulticallQuery(curve.ibAssetAddress, "symbol", [], [])
                ]
            });


            let multicallQueries = _.flattenDepth(curveQueries, 1);

            let multicallQuery = composeQuery(contracts.default.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
            let multicallBytes = await getProvider().call(multicallQuery)
            let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

            const requestCountPerCurve = 6;

            for (let i = 0; i < curvesMissingInfo.length; i++) {
                const bondingCurveParamsBytes = multicallResults[i * requestCountPerCurve][0] ? multicallResults[i * requestCountPerCurve][1] : [[0, 0, 0, 0, 0]]
                const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,uint256,uint256)"], bondingCurveParamsBytes)

                const totalStakingBalanceBytes = multicallResults[i * requestCountPerCurve + 1][0] ? multicallResults[i * requestCountPerCurve + 1][1] : [0];
                const totalStakingBalance = abiCoder.decode(["uint"], totalStakingBalanceBytes)[0]

                const lpRewardEmaBytes = multicallResults[i * requestCountPerCurve + 2][0] ? multicallResults[i * requestCountPerCurve + 2][1] : abiCoder.encode(["uint256","uint256"], [0, 0]);
                const lpRewardEma = abiCoder.decode(["uint256", "uint256"], lpRewardEmaBytes)

                const stakingRewardEmaBytes = multicallResults[i * requestCountPerCurve + 3][0] ? multicallResults[i * requestCountPerCurve + 3][1] : abiCoder.encode(["uint256","uint256"], [0, 0]);
                const stakingRewardEma = abiCoder.decode(["uint256", "uint256"], stakingRewardEmaBytes)

                const reserveTokenSymbolBytes = multicallResults[i * requestCountPerCurve + 4][0] ? multicallResults[i * requestCountPerCurve + 4][1] : [""];
                let reserveTokenSymbol = abiCoder.decode(["string"], reserveTokenSymbolBytes)[0];
                if (reserveTokenSymbol == 'WETH') {
                    reserveTokenSymbol = 'ETH';
                }

                const inverseTokenSymbolBytes = multicallResults[i * requestCountPerCurve + 5][0] ? multicallResults[i * requestCountPerCurve + 5][1] : [""];
                const inverseTokenSymbol = abiCoder.decode(["string"], inverseTokenSymbolBytes)[0];

                curveStates[i].reserveSymbol = reserveTokenSymbol;
                curveStates[i].ibAsset = inverseTokenSymbol;

                bondingCurveParams[0][0].toString()
                curveStates[i].price = Number(ethers.utils.formatEther(ethers.BigNumber.from(bondingCurveParams[0][3].toString())));
                curveStates[i].reserves = Number(ethers.utils.formatEther(ethers.BigNumber.from(bondingCurveParams[0][0].toString())));

                const reserveStakingRewardInIbc = Number(
                    Number(ethers.utils.formatEther(stakingRewardEma[1].toString()))
                    * secondsPerDay * 365
                    / curveStates[i].price
                )

                const ibcStakingReward = Number(
                    Number(ethers.utils.formatEther(stakingRewardEma[0].toString()))
                    * secondsPerDay * 365
                )
                curveStates[i].stakingApr = totalStakingBalance > 0 ? (reserveStakingRewardInIbc + ibcStakingReward) * 100 / Number(ethers.utils.formatEther(totalStakingBalance)) : 0;

                const reserveStakingReward = Number(
                    Number(ethers.utils.formatEther(lpRewardEma[1].toString()))
                    * secondsPerDay * 365
                )

                const ibcStakingRewardInReserve = Number(
                    Number(ethers.utils.formatEther(lpRewardEma[0].toString()))
                    * secondsPerDay * 365 * curveStates[i].price
                )
                curveStates[i].lpApr = (reserveStakingReward + ibcStakingRewardInReserve) * 100 / curveStates[i].reserves;
                curveStates[i].verified = curveStates[i].icon !== 'ib_asset_logo.svg';
                curveStates[i].image = require('../../assets/' + curveStates[i].icon);
            }
            const newCurveList = _.concat(curveList || [], curveStates);
            setCurveList(newCurveList);
            setFilteredCurveList(newCurveList);
            setIsLoading(false);
        }

        fetchCurveMetrics().then(() => { }).catch((err) => { console.log(err) })
    }, [curveMetadataList, curveMetadataList.length]);

    useEffect(() => {
        fetchCurvesAddress().then(() => { }).catch((err) => { console.log(err) });

    }, [nonWalletProvider, wallet?.provider])

    const fectchCurveInfo = async (curveAddress: string) => {
        const abiCoder = ethers.utils.defaultAbiCoder;
        const curveInfo =
        {
            curveAddress: curveAddress,
            ibAssetAddress: '',
            reserveAddress: '',
            reserveSymbol: '',
            icon: '',
            ibAsset: '',
            price: 0,
            reserves: 0,
            stakingApr: 0,
            lpApr: 0,
            image: '',
            verified: false
        }

        let multicallQueries =
            [
                composeMulticallQuery(curveAddress, "curveParameters", [], []),
                composeMulticallQuery(curveAddress, "totalStaked", [], []),
                composeMulticallQuery(curveAddress, "rewardEMAPerSecond", ["uint8"], [0]),
                composeMulticallQuery(curveAddress, "rewardEMAPerSecond", ["uint8"], [1]),
                composeMulticallQuery(curveAddress, "inverseTokenAddress", [], []),
                composeMulticallQuery(curveAddress, "reserveTokenAddress", [], [])
            ]

        let multicallQuery = composeQuery(contracts.default.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
        let multicallBytes = await getProvider().call(multicallQuery)
        let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

        if (multicallResults[0][0] && multicallResults[1][0] && multicallResults[2][0] && multicallResults[3][0] && multicallResults[4][0] && multicallResults[5][0]) {
            const bondingCurveParamsBytes = multicallResults[0][1]
            const bondingCurveParams = abiCoder.decode(["(uint256,uint256,uint256,uint256,uint256)"], bondingCurveParamsBytes)

            const totalStakingBalanceBytes = multicallResults[1][1]
            const totalStakingBalance = abiCoder.decode(["uint"], totalStakingBalanceBytes)[0]

            const lpRewardEmaBytes = multicallResults[2][0] ? multicallResults[2][1] : abiCoder.encode(["uint256","uint256"], [0, 0]);
            const lpRewardEma = abiCoder.decode(["uint256", "uint256"], lpRewardEmaBytes)

            const stakingRewardEmaBytes = multicallResults[3][0] ? multicallResults[3][1] : abiCoder.encode(["uint256","uint256"], [0, 0]);
            const stakingRewardEma = abiCoder.decode(["uint256", "uint256"], stakingRewardEmaBytes)

            curveInfo.ibAssetAddress = abiCoder.decode(["address"], multicallResults[4][1])[0].toString();
            curveInfo.reserveAddress = abiCoder.decode(["address"], multicallResults[5][1])[0].toString();

            bondingCurveParams[0][0].toString()
            curveInfo.price = Number(ethers.utils.formatEther(ethers.BigNumber.from(bondingCurveParams[0][3].toString())));
            curveInfo.reserves = Number(ethers.utils.formatEther(ethers.BigNumber.from(bondingCurveParams[0][0].toString())));

            const reserveStakingRewardInIbc = Number(
                Number(ethers.utils.formatEther(stakingRewardEma[1].toString()))
                * secondsPerDay * 365
                / curveInfo.price
            )

            const ibcStakingReward = Number(
                Number(ethers.utils.formatEther(stakingRewardEma[0].toString()))
                * secondsPerDay * 365
            )
            curveInfo.stakingApr = totalStakingBalance > 0 ? (reserveStakingRewardInIbc + ibcStakingReward) * 100 / Number(ethers.utils.formatEther(totalStakingBalance)) : 0;

            const reserveStakingReward = Number(
                Number(ethers.utils.formatEther(lpRewardEma[1].toString()))
                * secondsPerDay * 365
            )

            const ibcStakingRewardInReserve = Number(
                Number(ethers.utils.formatEther(lpRewardEma[0].toString()))
                * secondsPerDay * 365 * curveInfo.price
            )
            curveInfo.lpApr = (reserveStakingReward + ibcStakingRewardInReserve) * 100 / curveInfo.reserves;


            multicallQueries =
                [
                    composeMulticallQuery(curveInfo.ibAssetAddress, "symbol", [], []),
                    composeMulticallQuery(curveInfo.reserveAddress, "symbol", [], [])
                ]

            multicallQuery = composeQuery(contracts.default.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])

            multicallBytes = await getProvider().call(multicallQuery)
            multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]
            curveInfo.ibAsset = abiCoder.decode(["string"], multicallResults[0][1])[0].toString();
            curveInfo.reserveSymbol = abiCoder.decode(["string"], multicallResults[1][1])[0].toString();
            curveInfo.image = require('../../assets/' + curveInfo.icon);

            return [curveInfo];
        } else {
            return [];
        }
    }

    const sortCurves = (order: string) => {
        setSortOption(order);
        let orderField = "stakingApr";
        if (order === "HIGHEST STAKING APR") {
            orderField = "stakingApr";
        } else {
            orderField = "lpApr";
        }
        setFilteredCurveList(_.orderBy(curveList, [orderField], ['desc']));
    }

    const searchCurve = async (search: string) => {

        if (search.startsWith("0x")) {
            let filterResult = _.filter(curveList, curve => curve.curveAddress.toLowerCase() === search.toLowerCase());
            setFilteredCurveList(filterResult);
            if (filterResult.length === 0) {
                filterResult = await fectchCurveInfo(search);
                setFilteredCurveList(filterResult);
            }

        } else {
            setFilteredCurveList(_.filter(curveList, curve => _.includes(curve.ibAsset.toLowerCase(), search.toLowerCase())));
        }
    }

    const loadCurves = async () => {
        await fetchCurvesAddress();
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
                            _placeholder={{ color: colors.WHITE }}
                        />
                    </Stack>
                </Stack>
                <Stack w='50%' direction='row' fontSize={{ base: "xl", xl: "xl", "2xl": "2xl" }} fontWeight='700'>
                    <Divider height='69px' mr='7' mt='7' orientation='vertical' />
                    <Stack align={'right'}>
                        <Text mt={7} align="left" fontSize='md'>SORT BY</Text>
                        <Stack direction='row'>
                            <Menu>
                                <MenuButton>
                                    <Stack direction='row' align='center' gap='0'>
                                        <Text fontWeight='700'>{sortOption}</Text>
                                        <Icon as={BsChevronCompactDown} fontSize='2xl' alignSelf={'right'} m='1' />
                                    </Stack>
                                </MenuButton>
                                <MenuList>
                                    <MenuItem onClick={async () => await sortCurves("HIGHEST STAKING APR")}>HIGHEST STAKING APR</MenuItem>
                                    <MenuItem onClick={async () => await sortCurves("HIGHEST LP APR")}>HIGHEST LP APR</MenuItem>
                                </MenuList>
                            </Menu>
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>

            <Stack direction="row" mt='12' w='100%' h=''>
                <TableContainer w='100%' h='calc(100vh - 450px)' overflowY='auto'>
                    <Table variant='simple'>
                        <Thead>
                            <Tr >
                                <Th textTransform='none' fontWeight='500' fontSize='sm' color={colors.WHITE}>ibASSET</Th>
                                <Th fontWeight='500' fontSize='sm' color={colors.WHITE}>PRICE</Th>
                                <Th fontWeight='500' fontSize='sm' color={colors.WHITE}>RESERVES</Th>
                                <Th fontWeight='500' fontSize='sm' color={colors.WHITE}>STAKING APR</Th>
                                <Th fontWeight='500' fontSize='sm' color={colors.WHITE}>LP APR</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {filteredCurveList && filteredCurveList.map((item) => {
                                return (
                                    <Tr h='70px'>
                                        {
                                            !item.verified ?
                                                <Tooltip label="Unverified" aria-label='Unverified' placement='top' bg='gray' top="20px">
                                                    <Td>
                                                        <Stack direction='row' align='center' gap='0'>
                                                            <Box boxSize='28px' mr='4'>
                                                                <Image src={item.image} alt={item.ibAsset} />
                                                            </Box>
                                                            <Link fontWeight={'700'} href={window.location.origin + "\/#\/" + item.reserveAddress} isExternal>
                                                                {item.ibAsset}
                                                            </Link>
                                                        </Stack>
                                                    </Td>
                                                </Tooltip>
                                                :
                                                <Td>
                                                    <Stack direction='row' align='center' gap='0'>
                                                        <Box boxSize='28px' mr='4'>
                                                            <Image src={item.image} alt={item.ibAsset} />
                                                        </Box>
                                                        <Link fontWeight={'700'} href={window.location.origin + "\/#\/" + item.reserveAddress} isExternal>
                                                            {item.ibAsset}
                                                        </Link>
                                                    </Stack>
                                                </Td>

                                        }
                                        <Td fontWeight='400'>{formatPriceNumber(ethers.utils.parseUnits(item.price.toFixed(defaultDecimals), defaultDecimals), defaultDecimals, item.reserveSymbol)}</Td>
                                        <Td fontWeight='400'>{formatNumber(item.reserves.toString(), item.reserveSymbol)}</Td>
                                        <Td fontWeight='400'>{item.stakingApr.toFixed(2)}%</Td>
                                        <Td fontWeight='400'>{item.lpApr.toFixed(2)}%</Td>
                                    </Tr>
                                )
                            })}
                        </Tbody>
                    </Table>
                </TableContainer>

            </Stack>
            <Stack direction="row" mt='12' w='100%' justifyContent='center'>
                {isLoading && <DefaultSpinner />}
                <Button
                    onClick={loadCurves}
                    isDisabled={isLoading || (curveList ? totalCurveCount <= curveList.length : true)}
                >
                    Load More
                </Button>
            </Stack>
        </Stack>
    )
}