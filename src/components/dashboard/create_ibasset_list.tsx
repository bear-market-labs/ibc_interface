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

import {
	defaultAbiCoder
} from 'ethers/lib/utils'

type assetListProps = {
    nonWalletProvider: any,
    reserveListUpdateTimestamp: number,
    parentSetters: any
}

type CurveInfo = {
    curveAddress: string,
    reserveAddress: string,
    reserveSymbol: string,
    icon: string,
    image: any
}

export default function CreateIBAssetList(props: assetListProps) {
    const { nonWalletProvider, parentSetters, reserveListUpdateTimestamp } = props
    const [{ wallet, connecting }] = useConnectWallet()
    const [provider, setProvider] =
        useState<ethers.providers.Web3Provider | null>()

    const [curveList, setCurveList] = useState<CurveInfo[]>();
    const [filteredCurveList, setFilteredCurveList] = useState<CurveInfo[]>();
    const [searchValue, setSearchValue] = useState<string>('');

    const ibcFactoryAddress = contracts.tenderly.ibcFactoryContract;

    useEffect(() => {
        // if (wallet?.provider) {
        //     const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');
        //     setProvider(web3Provider);
        // }
        let curveStates = _.map(curves, curve => {
            return {
                ...curve,
                price: 0,
                reserves: 0,
                stakingApr: 0,
                lpApr: 0,
                image: require('../../assets/' + curve.icon)
            }
        });

        setCurveList(curveStates);
        setFilteredCurveList(curveStates);
        if(searchValue){
            searchCurve(searchValue).then().catch((err) => console.log("error", err))
        }        
    }, [nonWalletProvider, reserveListUpdateTimestamp])


    const searchCurve = async (search: string) => {
        let reserveAddress = '';
        setSearchValue(search);
        const abiCoder = ethers.utils.defaultAbiCoder;
        if(search.startsWith("0x")){            
            setFilteredCurveList(_.filter(curveList, curve => curve.reserveAddress.toLowerCase() === search.toLowerCase()));

            if(search.length == 42){
                if(wallet?.provider){                
                    const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');
                    try {
                        let query = composeQuery(ibcFactoryAddress, "getCurve", ["address"], [search])
                        let callResultBytes = await web3Provider.call(query)
                        let callResult = defaultAbiCoder.decode(["address"], callResultBytes)[0]
                        if(callResult == ethers.constants.AddressZero){
                            reserveAddress = search;                        
                        }else{
                            let curveInfo = {
                                curveAddress: '',
                                reserveAddress: '',
                                reserveSymbol: '',
                                icon: 'unlisted_logo.png',
                                image: ''
                            }
                            const curveAddress = callResult.toString() 
                            curveInfo.curveAddress = curveAddress;
                            query = composeQuery(curveAddress, "reserveTokenAddress", [], [])
                            callResultBytes = await web3Provider.call(query)
                            callResult = defaultAbiCoder.decode(["address"], callResultBytes)[0]
                            curveInfo.reserveAddress = curveAddress;
                            
                            query = composeQuery(callResult, "symbol", [], [])
                            callResultBytes = await web3Provider.call(query)
                            curveInfo.reserveSymbol = defaultAbiCoder.decode(["string"], callResultBytes)[0]

                            
                            curveInfo.image = require('../../assets/' + curveInfo.icon);

                            setFilteredCurveList([curveInfo]);
                        }
                    } catch (error) {
                        console.log(error);
                    }  
                }
            }

        }else{
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
                            onChange={async(event) => {await searchCurve(event.target.value)}}
                        />
                    </Stack>
                </Stack>
            </Stack>

            <Stack direction="row" mt='12' w='100%'>
                <TableContainer w='100%' maxH='calc(100vh - 350px)' overflowY='auto'>
                    <Table variant='simple'>
                        <Thead>
                            <Tr >
                                <Th borderColor='rgba(255, 255, 255, 0.16)' textTransform='none' fontWeight='500' fontSize='sm' color={colors.WHITE}>ASSET</Th>
                                <Th borderColor='rgba(255, 255, 255, 0.16)' fontWeight='500' fontSize='sm' color={colors.WHITE}>ADDRESS</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {filteredCurveList && filteredCurveList.map((item) => {
                                return (
                                    <Tr h='70px'>
                                        <Td borderColor='rgba(255, 255, 255, 0.16)'>
                                            <Stack direction='row' align='center' gap='0'>
                                                <Box boxSize='28px' mr='4'>
                                                    <Image src={item.image} alt={item.reserveSymbol} />
                                                </Box>
                                                <Text fontWeight='700'>{item.reserveSymbol}</Text>
                                            </Stack>

                                        </Td>
                                        <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{item.curveAddress}</Td>
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