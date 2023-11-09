import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers, BigNumber } from 'ethers'
import { Button, Divider, Icon, Input, Link, Menu, MenuButton, MenuItem, MenuList, Stack, Text } from '@chakra-ui/react'

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
import * as _ from "lodash";
import { composeMulticallQuery, composeQuery } from '../../util/ethers_utils'
import { curves } from '../../config/curves'
import { contracts } from '../../config/contracts'

type assetListProps = {
    parentSetters: any
}

type lpPosition = {
    ibAsset: string,
    balance: number,
    reserveAddress: string,
}

export default function LpPosition(props: assetListProps) {
    const [{ wallet, }] = useConnectWallet()
    const [provider, setProvider] =
        useState<ethers.providers.Web3Provider | null>()
    const [lpPosition, setLpPosition] = useState<lpPosition[]>();

    useEffect(() => {
        const fetchWalletInfo = async () => {
            const abiCoder = ethers.utils.defaultAbiCoder;
            if (wallet?.provider) {
                const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');
                setProvider(web3Provider);

                let queries = _.map(curves, curve => {
                    return [
                        composeMulticallQuery(curve.curveAddress, "liquidityPositionOf", ["address"], [wallet.accounts[0].address]),
                    ]
                });

                let multicallQueries = _.flattenDepth(queries, 1);

                let multicallQuery = composeQuery(contracts.default.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
                let multicallBytes = await web3Provider.call(multicallQuery)
                let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

                let lpPositions: lpPosition[] = [];
                for (let i = 0; i < curves.length; i++) {
                    const lpPositionBytes = multicallResults[i][0] ? multicallResults[i][1] : [0];
                    const lpBalance = Number(ethers.utils.formatEther(abiCoder.decode(["uint256", "uint256"], lpPositionBytes)[0]))

                    if (lpBalance > 0) {
                        lpPositions.push({
                            ibAsset: curves[i].ibAsset,
                            balance: lpBalance,
                            reserveAddress: curves[i].reserveAddress,
                        })
                    }
                }

                setLpPosition(lpPositions);
            }
        }


        fetchWalletInfo()
            .then()
            .catch((err) => console.log("error", err))
    }, [wallet])
    return (
        <Stack justifyContent={'start'} h='calc(100vh - 220px)'>
            <Stack direction="row" w='100%'>
                <TableContainer w='100%' maxH='calc(100vh - 270px)' overflowY='auto'>
                    <Table variant='simple'>
                        <Tbody>
                            {
                                lpPosition && lpPosition.map((position) => {
                                    return (
                                        <Tr h='70px'>
                                            <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'><Link href={window.location.origin + "\/#\/" + position.reserveAddress} isExternal>{position.ibAsset}</Link></Td>
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