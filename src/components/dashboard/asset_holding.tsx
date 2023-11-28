import { useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers } from 'ethers'
import { Box, Link, Stack, Image, Tooltip } from '@chakra-ui/react'

import {
    Table,
    Tbody,
    Tr,
    Td,
    TableContainer,
} from '@chakra-ui/react'
import * as _ from "lodash";
import { composeMulticallQuery, composeQuery } from '../../util/ethers_utils'
// import { curves } from '../../config/curves'
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

type holdingBalance = {
    ibAsset: string,
    balance: number,
    verified: boolean,
    image: any,
    reserveAddress: string,
}

export default function AssetHolding(props: assetListProps) {
    const [{ wallet }] = useConnectWallet()
    const [, setProvider] =
        useState<ethers.providers.Web3Provider | null>()
    const [holdingBalance, setHoldingBalance] = useState<holdingBalance[]>();

    

    useEffect(() => {
        const curves = props.curveList;
        const fetchWalletInfo = async () => {
            const abiCoder = ethers.utils.defaultAbiCoder;
            if (wallet?.provider) {
                const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');
                setProvider(web3Provider);

                let queries = _.map(curves, curve => {
                    return [
                        composeMulticallQuery(curve.curveAddress, "stakingBalanceOf", ["address"], [wallet.accounts[0].address]),
                        composeMulticallQuery(curve.ibAssetAddress, "balanceOf", ["address"], [wallet.accounts[0].address]),
                        composeMulticallQuery(curve.ibAssetAddress, "symbol", [], []),
                    ]
                });

                let multicallQueries = _.flattenDepth(queries, 1);

                let multicallQuery = composeQuery(contracts.default.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
                let multicallBytes = await web3Provider.call(multicallQuery)
                let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

                let userBalances: holdingBalance[] = [];
                for (let i = 0; i < curves.length; i++) {
                    const stakingBalanceBytes = multicallResults[i * 3 + 0][0] ? multicallResults[i * 3 + 0][1] : [0];
                    const stakingBalance = abiCoder.decode(["uint256"], stakingBalanceBytes)[0]
                    const userBalanceBytes = multicallResults[i * 3 + 1][0] ? multicallResults[i * 3 + 1][1] : [0];
                    const userBalance = abiCoder.decode(["uint256"], userBalanceBytes)[0];
                    const symbolBytes = multicallResults[i * 3 + 2][0] ? multicallResults[i * 3 + 2][1] : [""];
                    const symbol = abiCoder.decode(["string"], symbolBytes)[0];
                    const userTotalHoldingBalance = Number(ethers.utils.formatEther(stakingBalance)) + Number(ethers.utils.formatEther(userBalance));

                    if (userTotalHoldingBalance > 0) {
                        userBalances.push({
                            ibAsset: symbol,
                            verified: curves[i].icon !== 'ib_asset_logo.svg',
                            balance: userTotalHoldingBalance,
                            reserveAddress: curves[i].reserveAddress,
                            image: require('../../assets/' + curves[i].icon)
                        })
                    }
                }

                setHoldingBalance(userBalances);
            }
        }

        fetchWalletInfo()
            .then()
            .catch((err) => console.log("error", err))
    }, [wallet, props.curveList, props.curveList.length])

    return (
        <Stack justifyContent={'start'} h='calc(100vh - 220px)'>
            <Stack direction="row" w='100%'>
                <TableContainer w='100%' maxH='calc(100vh - 200px)' overflowY='auto'>
                    <Table variant='simple'>
                        <Tbody>
                            {
                                holdingBalance && holdingBalance.map((balance) => {
                                    return (
                                        !balance.verified ?                                        
                                        <Tr h='70px'>
                                            <Tooltip label="Unverified" aria-label='Unverified'  placement='top' bg='gray' top="20px">
                                            <Td>
                                               
                                                    <Stack direction='row' align='center' gap='0'>
                                                        <Box boxSize='28px' mr='4'>
                                                            <Image src={balance.image} alt={balance.ibAsset} />
                                                        </Box>
                                                        <Link fontWeight={'700'} href={window.location.origin + "/#/" + balance.reserveAddress} isExternal>
                                                            {balance.ibAsset}
                                                        </Link>
                                                    </Stack>
                                                         
                                            </Td>
                                            </Tooltip>
                                            {/* <Td fontWeight='400'><Link href={window.location.origin + "\/#\/" + balance.reserveAddress} isExternal>{balance.ibAsset}</Link></Td> */}
                                            <Td fontWeight='400'>{balance.balance.toFixed(4)}</Td>
                                        </Tr>                                        
                                        :
                                        <Tr h='70px'>
                                        <Td>
                                           
                                                <Stack direction='row' align='center' gap='0'>
                                                    <Box boxSize='28px' mr='4'>
                                                        <Image src={balance.image} alt={balance.ibAsset} />
                                                    </Box>
                                                    <Link fontWeight={'700'} href={window.location.origin + "/#/" + balance.reserveAddress} isExternal>
                                                        {balance.ibAsset}
                                                    </Link>
                                                </Stack>
                                                     
                                        </Td>
                                        {/* <Td fontWeight='400'><Link href={window.location.origin + "\/#\/" + balance.reserveAddress} isExternal>{balance.ibAsset}</Link></Td> */}
                                        <Td fontWeight='400'>{balance.balance.toFixed(4)}</Td>
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