import { useCallback, useState } from 'react'
import { ethers } from 'ethers'
import {
	Box,
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
	parseUnits,
	formatUnits,
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
	maxReserveChangePercent,
	commandTypes,
	curveUtilization,
	defaultDecimals,
} from '../../config/constants'
import { CgArrowDownR } from 'react-icons/cg'

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { isAbleToSendTransaction } from '../../config/validation'
import { formatBalanceNumber, formatReceiveNumber, format, parse, sanitizeNumberInput } from '../../util/display_formatting'
import { computeSquareRoot, divBnJs, formatUnitsBnJs, mulPercent, parseUnitsBnJs } from '../../util/ethers_utils'
import { WalletState } from '@web3-onboard/core'

type mintProps = {
	dashboardDataSet: any
	parentSetters: any
	wallet: WalletState | null
}

export default function BurnTokens(props: mintProps) {
	const [amount, setAmount] = useState<BigNumber>()
	const [amountDisplay, setAmountDisplay] = useState<string>()
	const [ibcRouterAddress] = useState<string>(contracts.default.ibcRouterContract)
	const { dashboardDataSet, parentSetters, wallet } = props
	const [maxSlippage, setMaxSlippage] = useState<number>(maxSlippagePercent)
	const [maxReserve, setMaxReserve] = useState<number>(maxReserveChangePercent)
	const [liquidityReceived, setLiquidityReceived] = useState<BigNumber>(
		BigNumber.from(0)
	)
	const [liquidityReceivedDisplay, setLiquidityReceivedDisplay] = useState<number>()

	const inverseTokenAddress =
		'inverseTokenAddress' in dashboardDataSet
			? dashboardDataSet.inverseTokenAddress
			: ''
	const userInverseTokenAllowance = BigNumber.from(
		'userInverseTokenAllowance' in dashboardDataSet
			? dashboardDataSet.userInverseTokenAllowance
			: '0'
	)
	const bondingCurveParams =
		'bondingCurveParams' in dashboardDataSet
			? dashboardDataSet.bondingCurveParams
			: {}
	const inverseTokenDecimals = BigNumber.from(
		'inverseTokenDecimals' in dashboardDataSet
			? dashboardDataSet.inverseTokenDecimals
			: '0'
	)
	const userBalance = dashboardDataSet.reserveTokenSymbol == "ETH" ? BigNumber.from(
		'userEthBalance' in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'
	) : BigNumber.from('userReserveTokenBalance' in dashboardDataSet ? dashboardDataSet.userReserveTokenBalance : '0')
	const userIbcBalance ='userIbcTokenBalance' in dashboardDataSet
			? BigNumber.from(dashboardDataSet.userIbcTokenBalance)
			: BigNumber.from('0')
	const totalFeePercent =
		'fees' in dashboardDataSet
			? Object.keys(dashboardDataSet.fees).reduce(
					(x, y) =>
						Number(
							formatUnits(
								dashboardDataSet.fees[y]['sellTokens'],
								inverseTokenDecimals
							)
						) + x,
					0
			  )
			: 0
	const forceUpdate = dashboardDataSet.forceUpdate

	const currentTokenPrice = BigNumber.from(
		'currentTokenPrice' in bondingCurveParams
			? bondingCurveParams.currentTokenPrice
			: '0'
	)
	const reserveTokenDecimals = "reserveTokenDecimals" in dashboardDataSet ? Number(dashboardDataSet.reserveTokenDecimals) : defaultDecimals;
	const maxBurn = "inverseTokenSupply" in bondingCurveParams ? Number(formatUnits(bondingCurveParams.inverseTokenSupply, inverseTokenDecimals)) : 0
	const maxWithdraw = "reserveAmount" in bondingCurveParams ? Number(formatUnits(bondingCurveParams.reserveAmount, reserveTokenDecimals)) : 0
	const [resultPrice, setResultPrice] = useState<bignumber>(
		bignumber(currentTokenPrice.toString())
	)
	const [isProcessing, setIsProcessing] = useState(false)

	const sendTransaction = useCallback(async () => {
		if (!wallet || !amount) {
			return
		}

		try {
			setIsProcessing(true)
			const provider = new ethers.providers.Web3Provider(wallet.provider, 'any') 
			const signer = provider.getUncheckedSigner()
			const abiCoder = defaultAbiCoder
			let txDetails
			let description = 'Error details'

			if (userInverseTokenAllowance.gte(amount ?? BigNumber.from(0))) {
				if (!amount) {
					return
				}

				const functionDescriptorBytes = arrayify(
					solidityKeccak256(
						['string'],
						[
							'execute(address,address,bool,uint8,bytes)', // put function signature here w/ types + no spaces, ex: createPair(address,address)
						]
					)
				).slice(0, 4)

				const minPriceLimit = bignumber(liquidityReceived.toString())
					.multipliedBy(1 - maxSlippage / 100)
					.dividedBy(bignumber(amount.toString()))
					.toFixed(defaultDecimals)

				const maxPriceLimit = bignumber(liquidityReceived.toString())
					.multipliedBy(1 + maxSlippage / 100)
					.dividedBy(bignumber(amount.toString()))
					.toFixed(defaultDecimals)

				const minReserveLimit =
					Number(formatUnits(dashboardDataSet.contractReserveTokenBalance, reserveTokenDecimals)) *
					(1 - maxReserve / 100)

				const maxReserveLimit =
					Number(formatUnits(dashboardDataSet.contractReserveTokenBalance, reserveTokenDecimals)) *
					(1 + maxReserve / 100)

				const commandBytes = arrayify(
					abiCoder.encode(
						['address', 'uint256', 'uint256[2]', 'uint256[2]'], // array of types; make sure to represent complex types as tuples
						[
							wallet.accounts[0].address, //ignored by router
							amount,
							[parseUnits(minPriceLimit, defaultDecimals),parseUnits(maxPriceLimit, defaultDecimals)],
							[parseUnits(minReserveLimit.toFixed(defaultDecimals), defaultDecimals),parseUnits(maxReserveLimit.toFixed(defaultDecimals), defaultDecimals)],
						] // arg values
					)
				)

				const payloadBytes = arrayify(
					abiCoder.encode(
						['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
						[
							wallet.accounts[0].address,
							dashboardDataSet.curveAddress,
							true,
							commandTypes.sellTokens,
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
						[ibcRouterAddress, amount] // arg values; note https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder--methods
					)
				)

				txDetails = {
					to: inverseTokenAddress,
					data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
				}
			}

			const tx = await signer.sendTransaction(txDetails)
			const result = await tx.wait()

			if (result.status === 1) {
				// extract TokenSold event, and display details
				let tokenSoldDetails
				result.logs.find((x) => {
					try {
						tokenSoldDetails = abiCoder.decode(['uint256', 'uint256'], x.data)
						return true
					} catch (err) {
						return false
					}
				})

				if (tokenSoldDetails) {
					description = `Received ${Number(
						Number(formatUnits(tokenSoldDetails[1], defaultDecimals)) * (1-totalFeePercent)
					).toFixed(4)} ${dashboardDataSet.reserveTokenSymbol} for ${Number(
						formatUnits(tokenSoldDetails[0], inverseTokenDecimals)
					).toFixed(4)} ${dashboardDataSet.inverseTokenSymbol}`
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
		amount,
		wallet,
		dashboardDataSet,
		maxSlippage,
		liquidityReceived,
		userInverseTokenAllowance,
		inverseTokenAddress,
		ibcRouterAddress,
		reserveTokenDecimals,
	])

	const handleAmountChange = (val: any) => {
		const parsedAmount = sanitizeNumberInput(val)
		setAmountDisplay(parsedAmount)

		if (isNaN(val) || val.trim() === '' || Number(val) > maxBurn) {
			return
		}

		setAmount(parseUnitsBnJs(parsedAmount, inverseTokenDecimals.toNumber()))

		const decimaledParsedAmount = parseUnitsBnJs(parsedAmount,
			inverseTokenDecimals.toNumber()
		)
		const reserveAmount = BigNumber.from(bondingCurveParams.reserveAmount)
		const inverseTokenSupply = BigNumber.from(bondingCurveParams.inverseTokenSupply)

		// this should be a non-under/overflow number between 0,1
		const fee = parseUnitsBnJs(
			Number(
				Number(formatUnits(decimaledParsedAmount, inverseTokenDecimals)) *
					totalFeePercent
			).toFixed(Number(inverseTokenDecimals)),
			inverseTokenDecimals.toNumber()
		)
		const burnedAmount = decimaledParsedAmount.sub(fee)

		const supplyDeltaBig = bignumber(inverseTokenSupply.sub(burnedAmount).toString()).dividedBy(bignumber(inverseTokenSupply.toString()))
		const liquidityReceivedBig = reserveAmount.sub(mulPercent(reserveAmount, supplyDeltaBig.sqrt().toNumber()))

		// calculate spot price post mint
		const newReserve = reserveAmount.sub(liquidityReceivedBig)
		const newSupply = inverseTokenSupply.sub(burnedAmount)
		const newPriceBig = parseUnitsBnJs(curveUtilization.toString(), defaultDecimals).mul(newReserve).div(newSupply)
		
		setResultPrice(bignumber(newPriceBig.toString()))
		setLiquidityReceived(liquidityReceivedBig) 
		setLiquidityReceivedDisplay(Number(formatReceiveNumber(formatUnitsBnJs(mulPercent(liquidityReceivedBig, 1-totalFeePercent), defaultDecimals))))

		parentSetters?.setNewPrice(newPriceBig.toString())
		parentSetters?.setNewIbcIssuance(
			newSupply
		)
		parentSetters?.setNewReserve(
			newReserve.toString()
		)
	}

	const handleAmountReceivedChanged = (val: any) => {
		const parsedAmount = sanitizeNumberInput(val)
		setLiquidityReceivedDisplay(parsedAmount) // fee-adjusted

		if (isNaN(val) || val.trim() === '' || Number(val) > maxWithdraw) {
			return
		}
		const liquidityReceivedBig = mulPercent(parseUnitsBnJs(parsedAmount, defaultDecimals), 1/(1-totalFeePercent))
		setLiquidityReceived(liquidityReceivedBig) 

		// calculate ibc burn amount
		const currentInverseTokenSupplyBig = BigNumber.from(bondingCurveParams.inverseTokenSupply)
		const currentInverseTokenSupply = Number(ethers.utils.formatUnits(bondingCurveParams.inverseTokenSupply, inverseTokenDecimals.toString()))
		const k = 1 - curveUtilization

		const mBig = BigNumber.from(bondingCurveParams.currentTokenPrice).mul(
			computeSquareRoot(currentInverseTokenSupplyBig)
		)

		const m = Number(ethers.utils.formatUnits(bondingCurveParams.currentTokenPrice, defaultDecimals)) 
		* 
		Math.pow(
			currentInverseTokenSupply,
			k
		)
		const k_1 = 1 - k

		//solve for burn amount
		const bigTerm = mulPercent(liquidityReceivedBig, k_1/m).div(BigNumber.from(10**9)).sub(computeSquareRoot(currentInverseTokenSupplyBig))
		const burnAmountBig = mulPercent(currentInverseTokenSupplyBig.sub(bigTerm.pow(2)), 1/(1-totalFeePercent))
		const newSupplyBig = currentInverseTokenSupplyBig.sub(mulPercent(burnAmountBig, 1-totalFeePercent))
		const newReserveBig = BigNumber.from(bondingCurveParams.reserveAmount).sub(liquidityReceivedBig)
		const newPriceBig = parseUnitsBnJs(curveUtilization.toString(), defaultDecimals).mul(newReserveBig).div(newSupplyBig)

		setResultPrice(bignumber(newPriceBig.toString()))

		setAmount(burnAmountBig)
		setAmountDisplay(formatUnitsBnJs(burnAmountBig, inverseTokenDecimals.toNumber()))

		parentSetters?.setNewPrice(newPriceBig.toString())
		parentSetters?.setNewIbcIssuance(newSupplyBig) // this is wei format
		parentSetters?.setNewReserve(
			newReserveBig.toString()
		)
	}


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
						value={amountDisplay}
						max={maxBurn}
						onChange={(valueString) => handleAmountChange(valueString)}
						isDisabled={Object.keys(bondingCurveParams).length === 0}
					>
						<NumberInputField
							minWidth='auto'
							border='none'
							fontSize='5xl'
							placeholder={`0`}
							pl='0'
							data-testid='you_pay'
						/>
					</NumberInput>
					<Text align='right' fontSize='5xl'>
						{dashboardDataSet.inverseTokenSymbol}
					</Text>
				</Stack>
				<Stack direction='row' justify='right' fontSize='sm'>
					<Text align='right'>{`Balance: ${formatBalanceNumber(formatUnits(userIbcBalance, inverseTokenDecimals))}`}</Text>
					<Box
						as='button'
						color={colors.TEAL}
						onClick={() =>
							handleAmountChange(
								formatUnits(userIbcBalance, inverseTokenDecimals)
							)
						}
					>
						MAX
					</Box>
				</Stack>
				<Icon as={CgArrowDownR} fontSize='3xl' alignSelf={'center'} m='5' />
				<Text align='left' fontSize='sm'>
					YOU RECEIVE
				</Text>
				<Stack direction='row' justifyContent={'space-between'} fontSize='5xl'>

					<NumberInput
						value={liquidityReceivedDisplay}
						max={maxWithdraw}
						onChange={(valueString) => handleAmountReceivedChanged(valueString)}
						isDisabled={Object.keys(bondingCurveParams).length === 0}
					>
						<NumberInputField
							minWidth='auto'
							border='none'
							fontSize='5xl'
							placeholder={`0`}
							pl='0'
							marginBlockStart={`1rem`}
							data-testid='you_receive'
						/>
					</NumberInput>
					<Text align='right'>{dashboardDataSet.reserveTokenSymbol}</Text>
				</Stack>
				<Text align='right' fontSize='sm'>{`Balance: ${formatBalanceNumber(
					formatUnits(userBalance, reserveTokenDecimals)
				)}`}</Text>
			</Stack>
			<Stack>
				<Stack
					direction='row'
					fontSize='md'
					justifyContent={'space-between'}
					mt={{base:4, xl:4, "2xl": 12}}
				>
					<Text align='left'>Price Impact</Text>
					<Text align='right'>
						{`${
							currentTokenPrice.toString() === '0' ||
							resultPrice.toString() === '0'
								? 0
								: resultPrice
										.minus(bignumber(currentTokenPrice.toString()))
										.multipliedBy(100)
										.dividedBy(bignumber(currentTokenPrice.toString()))
										.toFixed(2)
						}%`}
					</Text>
				</Stack>
				<Stack direction='row' fontSize='md' justifyContent={'space-between'}>
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
				<Stack
					direction='row'
					fontSize='md'
					justifyContent={'space-between'}
					mb='7'
				>
					<Text align='left'>Max Reserve Divergence</Text>
					<NumberInput
						value={format(maxReserve)}
						onChange={(valueString) => setMaxReserve(parse(valueString))}
						defaultValue={maxReserveChangePercent}
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
					isDisabled={!isAbleToSendTransaction(wallet, wallet?.provider, amount)}
				>
					{userInverseTokenAllowance.gte(amount ?? BigNumber.from(0)) ? 'Burn' : 'Approve ' + dashboardDataSet.inverseTokenSymbol}
				</Button>
			</Stack>
		</Stack>
	)
}
