import { useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers } from 'ethers'
import { Box, Input, Stack, Text, Image, Link, Tooltip } from '@chakra-ui/react'

import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from '@chakra-ui/react'
import * as _ from "lodash";

import { curves } from '../../config/curves'
import { composeMulticallQuery, composeQuery } from '../../util/ethers_utils'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'

import {
    defaultAbiCoder
} from 'ethers/lib/utils'


type CurveInfo = {
    curveAddress: string,
    reserveSymbol: string,
    icon: string,
    // ibAsset: string,
    image: any,
    reserveAddress: string,
    verified: boolean,
    // ibAssetAddress: string
}

type assetListProps = {
    nonWalletProvider: any,
    reserveListUpdateTimestamp: number,
    parentSetters: any,
    curveList: CurveInfo[],
}



export default function CreateIBAssetList(props: assetListProps) {
    const { nonWalletProvider, parentSetters, reserveListUpdateTimestamp } = props
    const [{ wallet }] = useConnectWallet()

    const [curveList, setCurveList] = useState<CurveInfo[]>();
    const [filteredCurveList, setFilteredCurveList] = useState<CurveInfo[]>();
    const [searchValue, setSearchValue] = useState<string>('');

    const ibcFactoryAddress = contracts.default.ibcFactoryContract;

    const getProvider = () => {
        return wallet?.provider ? new ethers.providers.Web3Provider(wallet.provider, 'any') : nonWalletProvider;
    }

    useEffect(() => {
        // if (wallet?.provider) {
        //     const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');
        //     setProvider(web3Provider);
        // }

        const fetchCurvesInfo = async () => {
            const abiCoder = ethers.utils.defaultAbiCoder;
            if (wallet?.provider) {
                const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');

                const curves = props.curveList;
                let curveStates = _.map(curves, curve => {
                    return {
                        ...curve,
                        price: 0,
                        reserves: 0,
                        stakingApr: 0,
                        lpApr: 0,
                        image: require('../../assets/' + curve.icon),
                        verified: curve.icon !== 'ib_asset_logo.svg',
                    }
                });

                let queries = _.map(curves, curve => {
                    return [
                        composeMulticallQuery(curve.reserveAddress, "symbol", [], []),
                    ]
                });

                let multicallQueries = _.flattenDepth(queries, 1);

                let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
                let multicallBytes = await web3Provider.call(multicallQuery)
                let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

                for (let i = 0; i < curveStates.length; i++) {
                    const symbolBytes = multicallResults[i][0] ? multicallResults[i][1] : [""];
                    const symbol = abiCoder.decode(["string"], symbolBytes)[0];
                    curveStates[i].reserveSymbol = symbol;
                }
                setCurveList(curveStates);
                setFilteredCurveList(curveStates);
                if (searchValue) {
                    searchCurve(searchValue).then().catch((err) => console.log("error", err))
                }
            }
        }

        fetchCurvesInfo()
            .then()
            .catch((err) => console.log("error", err))


    }, [nonWalletProvider, wallet?.provider, reserveListUpdateTimestamp])


    const searchCurve = async (search: string) => {
        let reserveAddress = '';
        setSearchValue(search);

        if (search.startsWith("0x")) {
            setFilteredCurveList(_.filter(curveList, curve => curve.reserveAddress.toLowerCase() === search.toLowerCase()));

            if (search.length == 42) {
                const provider = getProvider();
                if (provider) {
                    try {
                        let query = composeQuery(ibcFactoryAddress, "getCurve", ["address"], [search])
                        let callResultBytes = await provider.call(query)
                        let callResult = defaultAbiCoder.decode(["address"], callResultBytes)[0]
                        if (callResult == ethers.constants.AddressZero) {
                            reserveAddress = search;
                        } else {
                            let curveInfo = {
                                curveAddress: '',
                                reserveAddress: '',
                                reserveSymbol: '',
                                icon: 'ib_asset_logo.svg',
                                verified: false,
                                image: ''
                            }
                            const curveAddress = callResult.toString()
                            curveInfo.curveAddress = curveAddress;
                            query = composeQuery(curveAddress, "reserveTokenAddress", [], [])
                            callResultBytes = await provider.call(query)
                            callResult = defaultAbiCoder.decode(["address"], callResultBytes)[0]
                            curveInfo.reserveAddress = search;

                            query = composeQuery(callResult, "symbol", [], [])
                            callResultBytes = await provider.call(query)
                            curveInfo.reserveSymbol = defaultAbiCoder.decode(["string"], callResultBytes)[0]


                            curveInfo.image = require('../../assets/' + curveInfo.icon);

                            setFilteredCurveList([curveInfo]);
                        }
                    } catch (error) {
                        console.log(error);
                    }
                }
            }

        } else {
            setFilteredCurveList(_.filter(curveList, curve => _.includes(curve.reserveSymbol.toLowerCase(), search.toLowerCase())));
        }

        parentSetters.setReserveAssetAddress(reserveAddress);
    }

    return (
        <Stack justifyContent={'start'} h='calc(100vh - 220px)' maxW='100%'>
            <Stack direction="row" pr='7'>
                <Stack w='100%'>
                    <Text ml={7} mt={7} align="left" fontSize='md'>RESERVE ASSET TO PROVIDE</Text>
                    <Stack direction='row' fontSize={{ base: "xl", xl: "xl", "2xl": "2xl" }} fontWeight='700'>
                        <Input ml={7}
                            fontSize={{ base: "xl", xl: "xl", "2xl": "2xl" }}
                            fontWeight='700'
                            placeholder='ASSET TO FIND'
                            minWidth='auto'
                            border='none'
                            height={`unset`}
                            paddingInline={`unset`}
                            value={searchValue}
                            onChange={async (event) => { await searchCurve(event.target.value) }}
                        />
                    </Stack>
                </Stack>
            </Stack>

            <Stack direction="row" mt='12' w='100%'>
                <TableContainer w='100%' maxH='calc(100vh - 350px)' overflowY='auto'>
                    <Table variant='simple'>
                        <Thead>
                            <Tr>
                                <Th textTransform='none' fontWeight='500' fontSize='sm' color={colors.WHITE}>ASSET</Th>
                                <Th fontWeight='500' fontSize='sm' color={colors.WHITE}>ADDRESS</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {filteredCurveList && filteredCurveList.map((item) => {
                                return (
                                    !item.verified ?
                                        <Tr h='70px'>
                                            <Tooltip label="Unverified" aria-label='Unverified' placement='top' bg='gray'>
                                                <Td>
                                                    <Stack direction='row' align='center' gap='0'>
                                                        <Box boxSize='28px' mr='4'>
                                                            <Image src={item.image} alt={item.reserveSymbol} />
                                                        </Box>
                                                        <Link fontWeight={'700'} href={window.location.origin + "\/#\/" + item.reserveAddress} isExternal>
                                                            {item.reserveSymbol}
                                                        </Link>
                                                    </Stack>

                                                </Td>
                                            </Tooltip>
                                            <Td fontWeight='400'>{item.reserveAddress}</Td>
                                        </Tr>
                                        :
                                        <Tr h='70px'>
                                            <Td>
                                                <Stack direction='row' align='center' gap='0'>
                                                    <Box boxSize='28px' mr='4'>
                                                        <Image src={item.image} alt={item.reserveSymbol} />
                                                    </Box>
                                                    <Link fontWeight={'700'} href={window.location.origin + "\/#\/" + item.reserveAddress} isExternal>
                                                        {item.reserveSymbol}
                                                    </Link>
                                                </Stack>

                                            </Td>
                                            <Td fontWeight='400'>{item.reserveAddress}</Td>
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