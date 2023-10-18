import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers, constants } from 'ethers'

import {
	Box,
	Button,
	Icon,
	Input,
	Link,
	NumberInput,
	NumberInputField,
	Spacer,
	Stack,
	Text,
} from '@chakra-ui/react'
import {
	arrayify,
	parseUnits,
	concat,
	defaultAbiCoder,
	hexlify,
	formatUnits,
	parseEther,
	formatEther,
	solidityKeccak256,
} from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import {
	explorerUrl,
	maxSlippagePercent,
	reserveAssetSymbol,
	parse,
	format,
	commandTypes,
	reserveAssetDecimals,
} from '../../config/constants'
import { CgArrowDownR } from 'react-icons/cg'

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { isAbleToSendTransaction } from '../../config/validation'

type mintProps = {
	dashboardDataSet: any
	parentSetters: any
}

export default function RemoveLiquidity(props: mintProps) {
	const [{ wallet, connecting }] = useConnectWallet()
	const [provider, setProvider] =
		useState<ethers.providers.Web3Provider | null>()
	const [amount, setAmount] = useState<number>()
	const [ibcContractAddress] = useState<string>(contracts.tenderly.ibcETHCurveContract)
	const [ibcRouterAddress] = useState<string>(contracts.tenderly.ibcRouterContract)
	const { dashboardDataSet, parentSetters } = props
	const [maxSlippage, setMaxSlippage] = useState<number>(maxSlippagePercent)
	const [liquidityReceived, setLiquidityReceived] = useState<BigNumber>(
		BigNumber.from(0)
	)

	const userInverseTokenAllowance = BigNumber.from(
		'userInverseTokenAllowance' in dashboardDataSet
			? dashboardDataSet.userInverseTokenAllowance
			: '0'
	)
	const bondingCurveParams =
		'bondingCurveParams' in dashboardDataSet
			? dashboardDataSet.bondingCurveParams
			: {}
	const lpTokenDecimals = BigNumber.from(
		'lpTokenDecimals' in dashboardDataSet
			? dashboardDataSet.lpTokenDecimals
			: '0'
	)
	const userBalance = BigNumber.from(
		'userEthBalance' in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'
	)
	const userLpTokenBalance = 'userLpTokenBalance' in dashboardDataSet ? dashboardDataSet.userLpTokenBalance : '0'

	const userLpIbcCredit = 'userLpIbcCredit' in dashboardDataSet
			? dashboardDataSet.userLpIbcCredit
			: BigNumber.from(0)

	const userLpIbcDebit = 'userLpIbcDebit' in dashboardDataSet
			? dashboardDataSet.userLpIbcDebit
			: BigNumber.from(0)

	const userLpIbcPayment = userLpIbcDebit.gt(userLpIbcCredit) ? userLpIbcDebit.sub(userLpIbcCredit): BigNumber.from(0)

	const userLpRedeemableReserves = 'userLpRedeemableReserves' in dashboardDataSet ? dashboardDataSet.userLpRedeemableReserves : '0'
	
	const lpTokenSupply = BigNumber.from(
		'lpTokenSupply' in dashboardDataSet ? dashboardDataSet.lpTokenSupply : '0'
	)
	const totalFeePercent =
		'fees' in dashboardDataSet
			? Object.keys(dashboardDataSet.fees).reduce(
					(x, y) =>
						Number(formatEther(dashboardDataSet.fees[y]['removeLiquidity'])) +
						x,
					0
			  )
			: 0
	const forceUpdate = dashboardDataSet.forceUpdate

	const currentTokenPrice = BigNumber.from(
		'currentTokenPrice' in bondingCurveParams
			? bondingCurveParams.currentTokenPrice
			: '0'
	)
	const inverseTokenAddress =
	'inverseTokenAddress' in dashboardDataSet
		? dashboardDataSet.inverseTokenAddress
		: ''
	const [isProcessing, setIsProcessing] = useState(false)

	useEffect(() => {
		// If the wallet has a provider than the wallet is connected
		if (wallet?.provider) {
			setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
			// if using ethers v6 this is:
			// ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
		}
	}, [wallet])

	const sendTransaction = useCallback(async () => {
		if (!wallet || !provider) {
			return
		}

		if (wallet?.provider) {
			setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
			// if using ethers v6 this is:
			// ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
		}

		try {
			setIsProcessing(true)
			const signer = provider?.getUncheckedSigner()
			const abiCoder = defaultAbiCoder
			let txDetails

			if (userInverseTokenAllowance.gt(0)) {

				const functionDescriptorBytes = arrayify(
					solidityKeccak256(
						['string'],
						[
							'execute(address,address,bool,uint8,bytes)', // put function signature here w/ types + no spaces, ex: createPair(address,address)
						]
					)
				).slice(0, 4)

				const maxPriceLimit = BigNumber.from(
					bignumber(currentTokenPrice.toString())
						.multipliedBy(1 + maxSlippage / 100)
						.toFixed(0)
				)

				const minPriceLimit = BigNumber.from(
					bignumber(currentTokenPrice.toString())
						.multipliedBy(1 - maxSlippage / 100)
						.toFixed(0)
				)

				const commandBytes = arrayify(
					abiCoder.encode(
						['address', 'uint256', 'uint256[2]'], // array of types; make sure to represent complex types as tuples
						[
							wallet.accounts[0].address, //ignored by router
							userLpIbcPayment,
							[minPriceLimit, maxPriceLimit],
						] // arg values
					)
				)

				const payloadBytes = arrayify(
					abiCoder.encode(
						['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
						[
							wallet.accounts[0].address,
							ibcContractAddress,
							true,
							commandTypes.removeLiquidity,
							commandBytes,
						] // arg values
					)
				)

				txDetails = {
					to: ibcRouterAddress,
					data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
				}
			} else {
				const functionDescriptorBytes = arrayify(
					solidityKeccak256(
						['string'],
						[
							'approve(address,uint256)', // put function signature here w/ types + no spaces, ex: createPair(address,address)
						]
					)
				).slice(0, 4)

				const payloadBytes = arrayify(
					abiCoder.encode(
						['address', 'uint'], // array of types; make sure to represent complex types as tuples
						[ibcRouterAddress, constants.MaxUint256] // arg values; note https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder--methods
					)
				)

				txDetails = {
					to: inverseTokenAddress,
					data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
				}
			}

			const tx = await signer.sendTransaction(txDetails)
			const result = await tx.wait()

			let description = 'Error details'

			if (result.status === 1) {
				// extract TokenBought event, and display details
				let LiquidityRemovedDetails
				result.logs.find((x) => {
					try {
						LiquidityRemovedDetails = abiCoder.decode(
							['uint256', 'uint256', 'uint256', 'uint256'],
							x.data
						)
						return true
					} catch (err) {
						return false
					}
				})

				if (LiquidityRemovedDetails) {
					description = `Received ${Number(
						formatEther(LiquidityRemovedDetails[1])
					).toFixed(4)} ETH for ${Number(
						formatUnits(LiquidityRemovedDetails[0], lpTokenDecimals)
					).toFixed(4)} LP`
				} else {
					// allowance type tx was performed
					description = `Allowance updated`
				}
			}

			const url = explorerUrl + result.transactionHash

			Toast({
				id: result.transactionHash,
				title:
					result.status === 1 ? 'Transaction confirmed' : 'Transaction failed',
				description: (
					<div>
						<Link href={url} isExternal>
							{description +
								' ' +
								result.transactionHash.slice(0, 5) +
								'...' +
								result.transactionHash.slice(-5)}
							<BiLinkExternal></BiLinkExternal>
						</Link>
					</div>
				),
				status: result.status === 1 ? 'success' : 'error',
				duration: 5000,
				isClosable: true,
			})

			console.log(result)
		} catch (error: any) {
			console.log(error)
			Toast({
				id: '',
				title: 'Transaction failed',
				description: error_message(error),
				status: 'error',
				duration: null,
				isClosable: true,
			})
		}

		setIsProcessing(false)
		forceUpdate()
	}, [
		wallet,
		provider,
		ibcContractAddress,
		maxSlippage,
		userInverseTokenAllowance,
		ibcRouterAddress,
		inverseTokenAddress,
		userLpIbcPayment,
	])

	/*
	parentSetters?.setNewLpIssuance(
		lpTokenSupply.sub(userLpTokenBalance).toString()
	)
	parentSetters?.setNewReserve(
		BigNumber.from(bondingCurveParams.reserveAmount)
			.sub(parseUnits(userLpRedeemableReserves, reserveAssetDecimals))
			.toString()
	)
	*/

	return (
		<Stack justifyContent={'space-between'} h='calc(100vh - 220px)'>
			<Stack>
				<Text align='left' fontSize='sm'>
					YOU PAY
				</Text>

				<Stack
					direction='row'
					justifyContent={'space-between'}
					alignItems='center'
				>
					<NumberInput
						value={amount}
						isDisabled={true}
					>
						<NumberInputField
							minWidth='auto'
							border='none'
							fontSize='4xl'
							placeholder={Number(formatUnits(userLpTokenBalance, lpTokenDecimals)).toFixed(3)}
							pl='0'
						/>
					</NumberInput>
					<Text align='right' fontSize='4xl'>
						LP
					</Text>
				</Stack>
				<Stack direction='row' justify='right' fontSize='sm'>
					<Text align='right'>
						{
							`+ ${Number(formatUnits(userLpIbcPayment, lpTokenDecimals)).toFixed(3)} IBC for withdrawal`
						}
					</Text>
				</Stack>

				<Icon as={CgArrowDownR} fontSize='3xl' alignSelf={'center'} m='5' />

				<Text align='left' fontSize='sm'>
					YOU RECEIVE
				</Text>

				<Stack direction='row' justifyContent={'space-between'} fontSize='4xl'>
					<Text>
						{Number(
							Number(userLpRedeemableReserves) *
								(1 - totalFeePercent)
						).toFixed(3)}
					</Text>
					<Text align='right'>{reserveAssetSymbol}</Text>
				</Stack>
				<Text align='right' fontSize='sm'>{`Balance: ${Number(
					formatEther(userBalance)
				).toFixed(1)}`}</Text>
			</Stack>

			<Stack>
				<Stack
					direction='row'
					fontSize='md'
					justifyContent={'space-between'}
					mt='12'
				>
					<Text align='left'>Market price</Text>
					<Text align='right'>
						{`${Number(formatEther(currentTokenPrice)).toFixed(3)} ETH`}
					</Text>
				</Stack>
				<Stack
					direction='row'
					fontSize='md'
					justifyContent={'space-between'}
					mb='7'
				>
					<Text align='left'>Max Slippage</Text>
					<NumberInput
						value={format(maxSlippage)}
						onChange={(valueString) => setMaxSlippage(parse(valueString))}
						defaultValue={maxSlippagePercent}
						min={0}
						max={100}
						width={`50px`}
					>
						<NumberInputField
							minWidth='auto'
							border='none'
							height={`unset`}
							textAlign={`right`}
							paddingInline={`unset`}
							color={colors.TEAL}
						/>
					</NumberInput>
				</Stack>
				{isProcessing && <DefaultSpinner />}
				<Button
					onClick={sendTransaction}
					isDisabled={!isAbleToSendTransaction(wallet, provider, Number(formatUnits(userLpTokenBalance, lpTokenDecimals)))}
				>
					{userInverseTokenAllowance.gt(0) ? 'Remove Liquidity' : 'Approve LP'}
				</Button>
			</Stack>
		</Stack>
	)
}
