import { useCallback, useState } from 'react'
import { ethers } from 'ethers'
import {
	Box,
	Button,
	Icon,
	Stack,
	Text,
	NumberInput,
	NumberInputField,
} from '@chakra-ui/react'
import {
	arrayify,
	formatUnits,
	concat,
	parseUnits,
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
	bigOne,
} from '../../config/constants'
import { CgArrowDownR } from 'react-icons/cg'

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { Toast } from '../toast'
import { Link } from '@chakra-ui/react'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { isAbleToSendTransaction } from '../../config/validation'
import { formatBalanceNumber, format, parse, sanitizeNumberInput, formatReceiveNumber } from '../../util/display_formatting'
import { computeSquareRoot, formatUnitsBnJs, mulPercent, parseUnitsBnJs, } from '../../util/ethers_utils'
import { WalletState } from '@web3-onboard/core'

type mintProps = {
	dashboardDataSet: any
	parentSetters: any,
	wallet: WalletState | null,
}

export default function MintTokens(props: mintProps) {
	const [amount, setAmount] = useState<BigNumber>(BigNumber.from(0)) // tied to actual number for tx
	const [amountDisplay, setAmountDisplay] = useState<string>() // tied to display amount
	const [ibcRouterAddress] = useState<string>(contracts.default.ibcRouterContract)
	const { dashboardDataSet, parentSetters, wallet } = props
	const [maxSlippage, setMaxSlippage] = useState<number>(maxSlippagePercent)
	const [maxReserve, setMaxReserve] = useState<number>(maxReserveChangePercent)
	const [mintAmount, setMintAmount] = useState<BigNumber>(BigNumber.from(0)) // this is tied to the actual number sent for tx
	const [mintAmountDisplay, setMintAmountDisplay] = useState<string>() // this is tied to the numberinput of the received assets

	const bondingCurveParams =
		'bondingCurveParams' in dashboardDataSet
			? dashboardDataSet.bondingCurveParams
			: {}
	const inverseTokenDecimals = BigNumber.from(
		'inverseTokenDecimals' in dashboardDataSet
			? dashboardDataSet.inverseTokenDecimals
			: '0'
	)
	// todo: special case - use the eth balance for weth
	const userBalance = dashboardDataSet.reserveTokenSymbol == "ETH" ? BigNumber.from(
		'userEthBalance' in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'
	) : BigNumber.from('userReserveTokenBalance' in dashboardDataSet ? dashboardDataSet.userReserveTokenBalance : '0')
	const userIbcBalance =
		'userIbcTokenBalance' in dashboardDataSet
			? BigNumber.from(dashboardDataSet.userIbcTokenBalance)
			: BigNumber.from('0')
	const totalFeePercent =
		'fees' in dashboardDataSet
			? Object.keys(dashboardDataSet.fees).reduce(
					(x, y) =>
						Number(
							formatUnits(
								dashboardDataSet.fees[y]['buyTokens'],
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
	const userReserveTokenAllowance = BigNumber.from(
		'userReserveTokenAllowance' in dashboardDataSet
			? dashboardDataSet.userReserveTokenAllowance
			: '0'
	)

	const reserveTokenDecimals = "reserveTokenDecimals" in dashboardDataSet ? Number(dashboardDataSet.reserveTokenDecimals) : defaultDecimals;
	const contractReserveTokenBalance = "contractReserveTokenBalance" in dashboardDataSet ? dashboardDataSet.contractReserveTokenBalance : BigNumber.from(0);

	const [resultPrice, setResultPrice] = useState<bignumber>(
		bignumber(currentTokenPrice.toString())
	)
	const [isProcessing, setIsProcessing] = useState(false)

	const sendTransaction = useCallback(async () => {
		if (!wallet || !amount) {
			return
		}

		if (!(wallet?.provider)) {
			return
		}

		try {
			setIsProcessing(true)
			const provider = new ethers.providers.Web3Provider(wallet.provider, 'any') 
			const signer = provider.getUncheckedSigner()
			const abiCoder = defaultAbiCoder
			let txDetails
			let description = 'Error details'

			if (userReserveTokenAllowance.lt(amount) && dashboardDataSet.reserveTokenSymbol.toUpperCase() !== "ETH"){
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
					to: dashboardDataSet.reserveTokenAddress,
					data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
				}
			} else {

				const functionDescriptorBytes = arrayify(
					solidityKeccak256(
						['string'],
						[
							'execute(address,address,bool,uint8,bytes)',
						]
					)
				).slice(0, 4)
	
				const receivedAmount =
					Number(formatUnits(mintAmount, inverseTokenDecimals)) *
					(1 - totalFeePercent)
	
				const maxPriceLimit = bignumber(
					Number(formatUnits(amount, reserveTokenDecimals)) * (1 + maxSlippage / 100)
				)
					.dividedBy(bignumber(receivedAmount))
					.toFixed(defaultDecimals)
	
				const minPriceLimit = bignumber(
					Number(formatUnits(amount, reserveTokenDecimals)) * (1 - maxSlippage / 100)
				)
					.dividedBy(bignumber(receivedAmount))
					.toFixed(defaultDecimals)
	
				const maxReserveLimit =
					Number(formatUnits(contractReserveTokenBalance, reserveTokenDecimals)) *
					(1 + maxReserve / 100)
	
				const minReserveLimit =
					Number(formatUnits(contractReserveTokenBalance, reserveTokenDecimals)) *
					(1 - maxReserve / 100)
	
				const commandBytes = arrayify(
					abiCoder.encode(
						['address', 'uint256', 'uint256', 'uint256[2]', "uint256[2]"],
						[
							wallet.accounts[0].address, // unused when going thru router
							amount, // reserve in
							0, // exact out arg not used in frontend
							[parseUnits(minPriceLimit, defaultDecimals), parseUnits(maxPriceLimit, defaultDecimals)],
							[parseUnits(minReserveLimit.toFixed(defaultDecimals), defaultDecimals), parseUnits(maxReserveLimit.toFixed(defaultDecimals), defaultDecimals)],
						] 
					)
				)
	
				const payloadBytes = arrayify(
					abiCoder.encode(
						['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
						[
							wallet.accounts[0].address,
							dashboardDataSet.curveAddress,
							dashboardDataSet.reserveTokenSymbol.toUpperCase() === "ETH", //frontend will interact with ETH, not WETH, for now
							commandTypes.buyTokens,
							commandBytes,
						] // arg values
					)
				)
	
				txDetails = {
					to: ibcRouterAddress,
					data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
					value: dashboardDataSet.reserveTokenSymbol.toUpperCase() === "ETH" ? amount: 0,
				}
			}


			const tx = await signer.sendTransaction(txDetails)
			const result = await tx.wait()

			if (result.status === 1) {
				// extract TokenBought event, and display details
				let tokenBoughtDetails
				result.logs.find((x) => {
					try {
						tokenBoughtDetails = abiCoder.decode(['uint256', 'uint256'], x.data)
						return true
					} catch (err) {
						return false
					}
				})

				if (tokenBoughtDetails) {
					description = `Received ${Number(
						formatUnits(tokenBoughtDetails[1], inverseTokenDecimals)
					).toFixed(4)} ${dashboardDataSet.inverseTokenSymbol} for ${Number(
						formatUnits(tokenBoughtDetails[0], defaultDecimals)
					).toFixed(4)} ${dashboardDataSet.reserveTokenSymbol}`
				} else {
					description = `Allowance set to ${formatUnits(amount, reserveTokenDecimals)}`
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
		mintAmount,
		inverseTokenDecimals,
		totalFeePercent,
		maxReserve,
		reserveTokenDecimals,
		contractReserveTokenBalance,
		userReserveTokenAllowance
	])

	const handleAmountChange = (val: any) => {
		const parsedAmount = sanitizeNumberInput(val)
		setAmountDisplay(parsedAmount)

		if (isNaN(val) || val.trim() === '') {
			return
		}
		setAmount(BigNumber.from(bignumber(parsedAmount).multipliedBy(bignumber(10**reserveTokenDecimals)).toFixed(0))) // will be fed into router; needs to reflect "real" decimals

		const decimaledParsedAmount = val === '' ? BigNumber.from('0') : BigNumber.from(bignumber(parsedAmount).multipliedBy(bignumber(10**defaultDecimals)).toFixed(0)) // for all calcs, stay in default decimals (all curve params are in default decimals)
		const reserveAmount = BigNumber.from(bondingCurveParams.reserveAmount)
		const inverseTokenSupply = BigNumber.from(bondingCurveParams.inverseTokenSupply)

		// this should be a non-under/overflow number
		const reserveDeltaBig = decimaledParsedAmount.mul(bigOne).div(reserveAmount)

		// updated_supply = supply * (1+reserve_delta)**(1/u)
		const newSupplyBig = inverseTokenSupply.mul((reserveDeltaBig.add(bigOne)).pow(2)).div(bigOne.pow(2))

		// calculate spot price post mint
		const curveInvariantBig = BigNumber.from(bondingCurveParams.invariant)
		const newPriceBig = curveInvariantBig.mul(parseUnits(curveUtilization.toString(), defaultDecimals)).div(computeSquareRoot(newSupplyBig)).div(parseUnits("1", defaultDecimals/2))

		setResultPrice(bignumber(newPriceBig.toString()))
		setMintAmount(newSupplyBig.sub(inverseTokenSupply))
		setMintAmountDisplay(formatReceiveNumber(formatUnitsBnJs(mulPercent(newSupplyBig.sub(inverseTokenSupply), 1-totalFeePercent), inverseTokenDecimals.toNumber()).toString()))

		parentSetters?.setNewPrice(newPriceBig.toString())
		parentSetters?.setNewIbcIssuance(newSupplyBig) // this is wei format
		parentSetters?.setNewReserve(
			reserveAmount.add(decimaledParsedAmount).toString()
		)
	}

	const handleAmountReceivedChanged = (val: any) => {
		const parsedAmount = sanitizeNumberInput(val)
		setMintAmountDisplay(parsedAmount) // fee-adjusted

		if (isNaN(val) || val.trim() === '') {
			return
		}

		const mintAmountBig = BigNumber.from(bignumber(parsedAmount).multipliedBy(bignumber(10**inverseTokenDecimals.toNumber())).dividedBy(bignumber(1-totalFeePercent)).toFixed(0))
		setMintAmount(mintAmountBig)

		const currentInverseTokenSupplyBig = BigNumber.from(bondingCurveParams.inverseTokenSupply)
		const newSupplyBig = currentInverseTokenSupplyBig.add(mintAmountBig)

		// calculate ETH payment

		const mBig = BigNumber.from(bondingCurveParams.currentTokenPrice).mul(
			computeSquareRoot(currentInverseTokenSupplyBig)
		)
		const newPriceBig = mBig.div(computeSquareRoot(newSupplyBig))
		const diffRootSupply = computeSquareRoot(newSupplyBig).sub(computeSquareRoot(currentInverseTokenSupplyBig))
		const reserveNeededBig = mBig.mul(diffRootSupply).mul(2).div(bigOne)

		setResultPrice(bignumber(newPriceBig.toString()))
		setAmount(reserveNeededBig.div(10**(defaultDecimals - reserveTokenDecimals))) // sent to router, needs to be the 'real' decimals
		setAmountDisplay(bignumber(reserveNeededBig.toString()).dividedBy(bignumber(bigOne.toString())).toFixed(defaultDecimals))

		parentSetters?.setNewPrice(newPriceBig.toString())
		parentSetters?.setNewIbcIssuance(newSupplyBig) // this is wei format
		parentSetters?.setNewReserve(
			BigNumber.from(bondingCurveParams.reserveAmount).add(reserveNeededBig)
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
						onChange={(valueString) => handleAmountChange(valueString)}
						isDisabled={Object.keys(bondingCurveParams).length === 0}
					>
						<NumberInputField
							minWidth='auto'
							border='none'
							fontSize='5xl'
							placeholder={`0`}
							pl='0'
							data-testid="you_pay"
						/>
					</NumberInput>
					<Text align='right' fontSize='5xl'>
						{dashboardDataSet.reserveTokenSymbol}
					</Text>
				</Stack>

				<Stack direction='row' justify='right' fontSize='sm'>
					<Text align='right'>{`Balance: ${formatBalanceNumber(
						formatUnits(userBalance, reserveTokenDecimals)
					)}`}</Text>
					<Box
						as='button'
						color={colors.TEAL}
						onClick={() =>
							handleAmountChange(formatUnits(userBalance, reserveTokenDecimals).toString())
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
						value={mintAmountDisplay}
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
							data-testid="you_receive"
						/>
					</NumberInput>

					<Text align='right'>{dashboardDataSet.inverseTokenSymbol}</Text>
				</Stack>
				<Text align='right' fontSize='sm'>{`Balance: ${formatBalanceNumber(formatUnits(userIbcBalance.toString(), inverseTokenDecimals))}`}</Text>
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
					isDisabled={!isAbleToSendTransaction(wallet, wallet?.provider, amount)}
					onClick={sendTransaction}
				>
					Mint
				</Button>
			</Stack>
		</Stack>
	)
}
