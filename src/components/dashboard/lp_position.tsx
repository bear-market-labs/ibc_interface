import { useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers } from 'ethers'
import { Box,Link, Stack, Image, Tooltip } from '@chakra-ui/react'

import {
    Table,
    Tbody,
    Tr,
    Td,
    TableContainer,
} from '@chakra-ui/react'
import * as _ from "lodash";
import { composeMulticallQuery, composeQuery } from '../../util/ethers_utils'
import { contracts } from '../../config/contracts'

type CurveInfo = {
    curveAddress: string,
    reserveSymbol: string,
    icon: string,
    ibAsset: string,
    image: any,
    reserveAddress: string,
    ibAssetAddress: string
}

type assetListProps = {
    parentSetters: any,
    curveList: CurveInfo[],
}

type lpPosition = {
    ibAsset: string,
    balance: number,
    reserveAddress: string,
    image: any,
    verified: boolean
}

export default function LpPosition(props: assetListProps) {
    const [{ wallet, }] = useConnectWallet()
    const [provider, setProvider] =
        useState<ethers.providers.Web3Provider | null>()
    const [lpPosition, setLpPosition] = useState<lpPosition[]>();

    useEffect(() => {
        const curves = props.curveList;
        const fetchWalletInfo = async () => {
            const abiCoder = ethers.utils.defaultAbiCoder;
            if (wallet?.provider) {
                const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');
                setProvider(web3Provider);

                let queries = _.map(curves, curve => {
                    return [
                        composeMulticallQuery(curve.curveAddress, "liquidityPositionOf", ["address"], [wallet.accounts[0].address]),
                        composeMulticallQuery(curve.ibAssetAddress, "symbol", [], []),
                    ]
                });

                let multicallQueries = _.flattenDepth(queries, 1);

                let multicallQuery = composeQuery(contracts.default.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
                let multicallBytes = await web3Provider.call(multicallQuery)
                let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

                let lpPositions: lpPosition[] = [];
                for (let i = 0; i < curves.length; i++) {
                    const lpPositionBytes = multicallResults[i * 2 + 0][0] ? multicallResults[i * 2 + 0][1] : [0];
                    const lpBalance = Number(ethers.utils.formatEther(abiCoder.decode(["uint256", "uint256"], lpPositionBytes)[0]));
                    const symbolBytes = multicallResults[i * 2 + 1][0] ? multicallResults[i * 2 + 1][1] : [""];
                    const symbol = abiCoder.decode(["string"], symbolBytes)[0];

                    if (lpBalance > 0) {
                        lpPositions.push({
                            ibAsset: symbol,
                            balance: lpBalance,
                            reserveAddress: curves[i].reserveAddress,
                            image: require('../../assets/' + curves[i].icon),
                            verified: curves[i].icon !== 'ib_asset_logo.svg',
                        })
                    }
                }

                setLpPosition(lpPositions);
            }
        }

        fetchWalletInfo()
            .then()
            .catch((err) => console.log("error", err))
    }, [wallet, props.curveList])
    return (
        <Stack justifyContent={'start'} h='calc(100vh - 220px)'>
            <Stack direction="row" w='100%'>
                <TableContainer w='100%' maxH='calc(100vh - 270px)' overflowY='auto'>
                    <Table variant='simple'>
                        <Tbody>
                            {
                                lpPosition && lpPosition.map((position) => {

                                    return (
                                        !position.verified ?
                                            <Tr h='70px'>
                                                <Tooltip label="Unverified" aria-label='Unverified'  placement='top' bg='gray' top="20px">
                                                <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>
                                                    <Stack direction='row' align='center' gap='0'>
                                                        <Box boxSize='28px' mr='4'>
                                                            <Image src={position.image} alt={position.reserveAddress} />
                                                        </Box>
                                                        <Link fontWeight={'700'} href={window.location.origin + "/#/" + position.reserveAddress} isExternal>
                                                            {position.ibAsset}
                                                        </Link>
                                                    </Stack>
                                                </Td>
                                                </Tooltip>

                                                {/* <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'><Link href={window.location.origin + "\/#\/" + position.reserveAddress} isExternal>{position.ibAsset}</Link></Td> */}
                                                <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{position.balance.toFixed(4)} LP</Td>
                                            </Tr>
                                            :
                                            <Tr h='70px'>
                                                <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>
                                                    <Stack direction='row' align='center' gap='0'>
                                                        <Box boxSize='28px' mr='4'>
                                                            <Image src={position.image} alt={position.reserveAddress} />
                                                        </Box>
                                                        <Link fontWeight={'700'} href={window.location.origin + "/#/" + position.reserveAddress} isExternal>
                                                            {position.ibAsset}
                                                        </Link>
                                                    </Stack>
                                                </Td>

                                                {/* <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'><Link href={window.location.origin + "\/#\/" + position.reserveAddress} isExternal>{position.ibAsset}</Link></Td> */}
                                                <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{position.balance.toFixed(4)} LP</Td>
                                            </Tr>
                                    )
                                })
                            }
                        </Tbody>
                    </Table>
                </TableContainer>
            </Stack>

        </Stack>
    )
}