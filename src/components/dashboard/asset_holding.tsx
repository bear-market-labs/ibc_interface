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
import * as _ from "lodash";
import { composeMulticallQuery, composeQuery } from '../../util/ethers_utils'
import { curves } from '../../config/curves'
import { contracts } from '../../config/contracts'

type assetListProps = {
    parentSetters: any
}

type holdingBalance = {
    ibAsset: string,
    balance: number
}

export default function AssetHolding(props: assetListProps) {
    const [{ wallet, }] = useConnectWallet()
    const [provider, setProvider] =
        useState<ethers.providers.Web3Provider | null>()
    const [holdingBalance, setHoldingBalance] = useState<holdingBalance[]>();

    useEffect(() => {
        const fetchWalletInfo = async () => {
            const abiCoder = ethers.utils.defaultAbiCoder;
            if (wallet?.provider) {
                const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');
                setProvider(web3Provider);

                let queries = _.map(curves, curve => {
                    return [
                        composeMulticallQuery(curve.curveAddress, "stakingBalanceOf", ["address"], [wallet.accounts[0].address]),
                        composeMulticallQuery(curve.ibAssetAddress, "balanceOf", ["address"], [wallet.accounts[0].address]),
                    ]
                });

                let multicallQueries = _.flattenDepth(queries, 1);

                let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
                let multicallBytes = await web3Provider.call(multicallQuery)
                let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

                let userBalances: holdingBalance[] = [];
                for (let i = 0; i < curves.length; i++) {
                    const stakingBalanceBytes = multicallResults[i * 2 + 0][0] ? multicallResults[i * 2 + 0][1] : [0];
                    const stakingBalance = abiCoder.decode(["uint256"], stakingBalanceBytes)[0]
                    const userBalanceBytes = multicallResults[i * 2 + 1][0] ? multicallResults[i * 2 + 1][1] : [0];
                    const userBalance = abiCoder.decode(["uint256"], userBalanceBytes)[0];
                    const userTotalHoldingBalance = Number(ethers.utils.formatEther(stakingBalance)) + Number(ethers.utils.formatEther(userBalance));
                    if (userTotalHoldingBalance > 0) {
                        userBalances.push({
                            ibAsset: curves[i].ibAsset,
                            balance: userTotalHoldingBalance
                        })
                    }
                }

                setHoldingBalance(userBalances);
            }
        }

        fetchWalletInfo()
            .then()
            .catch((err) => console.log("error", err))
    }, [wallet])

    return (
        <Stack justifyContent={'start'} h='calc(100vh - 220px)'>
            <Stack direction="row" w='100%'>
                <TableContainer w='100%' maxH='calc(100vh - 200px)' overflowY='auto'>
                    <Table variant='simple'>
                        <Tbody>
                            {
                                holdingBalance && holdingBalance.map((balance) => {
                                    return (
                                        <Tr h='70px'>
                                            <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{balance.ibAsset}</Td>
                                            <Td fontWeight='400' borderColor='rgba(255, 255, 255, 0.16)'>{balance.balance.toFixed(4)}</Td>
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