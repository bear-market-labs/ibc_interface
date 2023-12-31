import { useCallback, useState } from 'react'
import { ethers } from 'ethers'

import {
	Button,
	Icon,
	Link,
	NumberInput,
	NumberInputField,
	Stack,
	Text,
} from '@chakra-ui/react'
import {
	arrayify,
	concat,
	defaultAbiCoder,
	hexlify,
	solidityKeccak256,
} from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import {
	explorerUrl,
	maxSlippagePercent,
	commandTypes,
	defaultDecimals,
} from '../../config/constants'
import { CgArrowDownR } from 'react-icons/cg'

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { isAbleToSendTransaction } from '../../config/validation'
import { formatNumber, formatReceiveNumber, format, parse } from '../../util/display_formatting'
import { WalletState } from '@web3-onboard/core'
import { formatUnitsBnJs } from '../../util/ethers_utils'

type mintProps = {
	dashboardDataSet: any
	parentSetters: any
	wallet: WalletState | null
}

export default function RemoveLiquidity(props: mintProps) {
	const [amount] = useState<number>()
	const [ibcContractAddress] = useState<string>(contracts.default.ibcETHCurveContract)
	const [ibcRouterAddress] = useState<string>(contracts.default.ibcRouterContract)
	const { dashboardDataSet, wallet } = props
	const [maxSlippage, setMaxSlippage] = useState<number>(maxSlippagePercent)

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

	const userLpTokenBalance = 'userLpTokenBalance' in dashboardDataSet ? dashboardDataSet.userLpTokenBalance : '0'
	const userIbcTokenBalance = 'userIbcTokenBalance' in dashboardDataSet ? BigNumber.from(dashboardDataSet.userIbcTokenBalance) : BigNumber.from(0)

	const userLpIbcCredit = 'userLpIbcCredit' in dashboardDataSet
			? dashboardDataSet.userLpIbcCredit
			: BigNumber.from(0)

	let userLpIbcDebit = 'userLpIbcDebit' in dashboardDataSet
			? dashboardDataSet.userLpIbcDebit
			: BigNumber.from(0)

	const userLpIbcPayment = userLpIbcDebit.sub(userLpIbcCredit)

	const userLpRedeemableReserves = 'userLpRedeemableReserves' in dashboardDataSet ? dashboardDataSet.userLpRedeemableReserves : '0'
	
	const totalFeePercent =
		'fees' in dashboardDataSet
			? Object.keys(dashboardDataSet.fees).reduce(
					(x, y) =>
						Number(formatUnitsBnJs(dashboardDataSet.fees[y]['removeLiquidity'], defaultDecimals)) +
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

	const sendTransaction = useCallback(async () => {
		if (!wallet) {
			return
		}

		try {
			setIsProcessing(true)
			const provider = new ethers.providers.Web3Provider(wallet.provider, 'any') 
			const signer = provider.getUncheckedSigner()
			const abiCoder = defaultAbiCoder
			let txDetails

			if (userInverseTokenAllowance.gte(userLpIbcPayment)) {

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
							userLpIbcPayment.gt(0) ? userLpIbcPayment : 0,
							[minPriceLimit, maxPriceLimit],
						] // arg values
					)
				)

				const payloadBytes = arrayify(
					abiCoder.encode(
						['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
						[
							wallet.accounts[0].address,
							dashboardDataSet.curveAddress,
							dashboardDataSet.reserveTokenSymbol.toUpperCase() === "ETH",
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
						[ibcRouterAddress, userLpIbcPayment] // arg values; note https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder--methods
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
						formatUnitsBnJs(LiquidityRemovedDetails[1], defaultDecimals)
					).toFixed(4)} ${dashboardDataSet.reserveTokenSymbol} for ${Number(
						formatUnitsBnJs(LiquidityRemovedDetails[0], lpTokenDecimals.toNumber())
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
		ibcContractAddress,
		maxSlippage,
		userInverseTokenAllowance,
		ibcRouterAddress,
		inverseTokenAddress,
		userLpIbcPayment,
	])


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
							fontSize='5xl'
							placeholder={Number(formatUnitsBnJs(userLpTokenBalance, lpTokenDecimals.toNumber())).toFixed(3)}
							pl='0'
						/>
					</NumberInput>
					<Text align='right' fontSize='5xl'>
						LP
					</Text>
				</Stack>
				<Stack direction='row' justify='right' fontSize='sm'>
					<Text align='right'>
						{
							userLpIbcPayment.gt(0) ? `+ ${formatNumber(formatUnitsBnJs(userLpIbcPayment, lpTokenDecimals.toNumber()), dashboardDataSet.reserveTokenSymbol, true, true)} for withdrawal` : ` ` 
						}
					</Text>
				</Stack>

				<Icon as={CgArrowDownR} fontSize='3xl' alignSelf={'center'} m='5' />

				<Text align='left' fontSize='sm'>
					YOU RECEIVE
				</Text>

				<Stack direction='row' justifyContent={'space-between'} fontSize='5xl'>
					<Text>
						{formatReceiveNumber(
							(Number(userLpRedeemableReserves) *
								(1 - totalFeePercent)).toString()
						)}
					</Text>
					<Text align='right'>{dashboardDataSet.reserveTokenSymbol}</Text>
				</Stack>
				<Text align='right' fontSize='sm'>
					{
						userLpIbcPayment.lt(0) ? `+ ${Number(Number(formatUnitsBnJs(userLpIbcPayment.abs(), lpTokenDecimals.toNumber())) * (1 - totalFeePercent)).toFixed(3)} ${dashboardDataSet.inverseTokenSymbol} made available` : ` ` 
					}
				</Text>
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
						{`${Number(formatUnitsBnJs(currentTokenPrice, defaultDecimals)).toFixed(3)} ${dashboardDataSet.reserveTokenSymbol}`}
					</Text>
				</Stack>
				<Stack
					direction='row'
					fontSize='md'
					justifyContent={'space-between'}
					mb='7'
				>
					<Text align='left'>Max Price Divergence</Text>
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
					isDisabled={!isAbleToSendTransaction(wallet, wallet?.provider, Number(formatUnitsBnJs(userLpTokenBalance, lpTokenDecimals.toNumber()))) || userLpIbcPayment.gt(userIbcTokenBalance)}
				>
					{userLpTokenBalance === '0' ? `Add Required` : userLpIbcPayment.gt(userIbcTokenBalance) ? `Insufficient ${dashboardDataSet.inverseTokenSymbol}` : userInverseTokenAllowance.gte(userLpIbcPayment) ? 'Remove Liquidity' : 'Approve LP'}
				</Button>
			</Stack>
		</Stack>
	)
}
