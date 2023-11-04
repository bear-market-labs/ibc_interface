import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers, BigNumber } from 'ethers'
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
	concat,
	defaultAbiCoder,
	hexlify,
	formatUnits,
	parseUnits,
	solidityKeccak256,
} from 'ethers/lib/utils'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import {
	explorerUrl,
	maxSlippagePercent,
	format,
	parse,
	commandTypes,
	sanitizeNumberInput,
	lpTokenDecimals,
	defaultDecimals,
} from '../../config/constants'
import { CgArrowDownR } from 'react-icons/cg'

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { isAbleToSendTransaction } from '../../config/validation'
import { formatBalanceNumber, formatNumber, formatReceiveNumber } from '../../util/display_formatting'

type mintProps = {
	dashboardDataSet: any
	parentSetters: any
}

export default function AddLiquidity(props: mintProps) {
	const [{ wallet }] = useConnectWallet()
	const [provider, setProvider] =
		useState<ethers.providers.Web3Provider | null>()
	const [amount, setAmount] = useState<number>()
	const [ibcRouterAddress] = useState<string>(contracts.tenderly.ibcRouterContract)
	const { dashboardDataSet, parentSetters } = props
	const [maxSlippage, setMaxSlippage] = useState<number>(maxSlippagePercent)
	const [mintAmount, setMintAmount] = useState<BigNumber>(BigNumber.from(0))
	const [ibcCredit, setIbcCredit] = useState<number>(0)

	const bondingCurveParams =
		'bondingCurveParams' in dashboardDataSet
			? dashboardDataSet.bondingCurveParams
			: {}
	const inverseTokenDecimals = BigNumber.from(
		'inverseTokenDecimals' in dashboardDataSet
			? dashboardDataSet.inverseTokenDecimals
			: '0'
	)
  const reserveTokenDecimals = "reserveTokenDecimals" in dashboardDataSet ? dashboardDataSet.reserveTokenDecimals.toNumber() : 0; 
	const lpTokenSupply = BigNumber.from(
		'lpTokenSupply' in dashboardDataSet ? dashboardDataSet.lpTokenSupply : '0'
	)
	const userBalance = dashboardDataSet.reserveTokenSymbol == "ETH" ? BigNumber.from(
		'userEthBalance' in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'
	) : BigNumber.from('userReserveTokenBalance' in dashboardDataSet ? dashboardDataSet.userReserveTokenBalance : '0')
	const userLpTokenBalance = bignumber(
		'userLpTokenBalance' in dashboardDataSet
			? dashboardDataSet.userLpTokenBalance
			: '0'
	)
	const totalFeePercent =
		'fees' in dashboardDataSet
			? Object.keys(dashboardDataSet.fees).reduce(
					(x, y) =>
						Number(formatUnits(dashboardDataSet.fees[y]['addLiquidity'], defaultDecimals)) + x,
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
		if (!wallet || !provider || !amount) {
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
			let description = 'Error details'

			if (userReserveTokenAllowance.lt(parseUnits(Number(amount).toFixed(reserveTokenDecimals), reserveTokenDecimals)) && dashboardDataSet.reserveTokenSymbol.toUpperCase() !== "ETH"){
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
						[ibcRouterAddress, parseUnits(Number(amount).toFixed(reserveTokenDecimals), reserveTokenDecimals)] // arg values; note https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder--methods
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
							'execute(address,address,bool,uint8,bytes)', // put function signature here w/ types + no spaces, ex: createPair(address,address)
						]
					)
				).slice(0, 4)
	
				const minPriceLimit = BigNumber.from(
					bignumber(currentTokenPrice.toString())
						.multipliedBy(1 - maxSlippage / 100)
						.toFixed(0)
				)
	
				const maxPriceLimit = BigNumber.from(
					bignumber(currentTokenPrice.toString())
						.multipliedBy(1 + maxSlippage / 100)
						.toFixed(0)
				)
	
				const commandBytes = arrayify(
					abiCoder.encode(
						['address', 'uint256', 'uint256[2]'], // array of types; make sure to represent complex types as tuples
						[
							wallet.accounts[0].address, // ignored by router
							parseUnits(amount.toString(), reserveTokenDecimals),
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
							commandTypes.addLiquidity,
							commandBytes,
						] // arg values
					)
				)
	
				txDetails = {
					to: ibcRouterAddress,
					data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
					value: dashboardDataSet.reserveTokenSymbol.toUpperCase() === "ETH" ? parseUnits(amount.toString(), reserveTokenDecimals) : 0,
				}
			}

			const tx = await signer.sendTransaction(txDetails)
			const result = await tx.wait()

			if (result.status === 1) {
				// extract LiquidityAdded event, and display details
				let LiquidityAddedDetails
				result.logs.find((x) => {
					try {
						LiquidityAddedDetails = abiCoder.decode(
							['uint256', 'uint256', 'uint256'],
							x.data
						)
						return true
					} catch (err) {
						return false
					}
				})

				if (LiquidityAddedDetails) {
					description = `Received ${Number(
						formatUnits(LiquidityAddedDetails[1], lpTokenDecimals)
					).toFixed(4)} LP for ${Number(
						formatUnits(LiquidityAddedDetails[0], defaultDecimals)
					).toFixed(4)} ${dashboardDataSet.reserveTokenSymbol}`
				} else {
					description = `Allowance set to ${amount}`
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
		provider,
		dashboardDataSet,
		maxSlippage,
		mintAmount,
		currentTokenPrice,
	])

	const handleAmountChange = (val: any) => {
		const parsedAmount = sanitizeNumberInput(val)
		setAmount(parsedAmount)

		if (isNaN(val) || val.trim() === '') {
			return
		}

		const decimaledParsedAmount = parseUnits(val === '' ? '0' : val, defaultDecimals)
		const feeAdjustedAmount = BigInt(decimaledParsedAmount.toString()) * BigInt(10000 - totalFeePercent*10000) / BigInt(10000)

		const mintAmount = BigNumber.from(
			bignumber(Number(lpTokenSupply.toString()) * Number(feeAdjustedAmount))
				.dividedBy(
					bignumber(bondingCurveParams.reserveAmount)
				)
				.toFixed(0)
		)

		//calculate ibc credit
		const lpIbcCredit = Number(formatUnits(feeAdjustedAmount, defaultDecimals)) * Number(formatUnits(bondingCurveParams.inverseTokenSupply, inverseTokenDecimals)) / Number(formatUnits(bondingCurveParams.reserveAmount, defaultDecimals))

		setMintAmount(mintAmount)
		setIbcCredit(lpIbcCredit)

		parentSetters?.setNewLpIssuance(mintAmount.add(lpTokenSupply).toString())
		parentSetters?.setNewReserve(
			Number(Number(feeAdjustedAmount) + Number(bondingCurveParams.reserveAmount)).toString()
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
						value={amount}
						onChange={(valueString) => handleAmountChange(valueString)}
						isDisabled={Object.keys(bondingCurveParams).length === 0}
					>
						<NumberInputField
							minWidth='auto'
							border='none'
							fontSize='5xl'
							placeholder={`0`}
							pl='0'
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
					<Text>
						{formatReceiveNumber(formatUnits(mintAmount, lpTokenDecimals))}
					</Text>
					<Text align='right'>LP</Text>
				</Stack>
				<Text align='right' fontSize='sm'>
					{
						`+ ${formatNumber(ibcCredit.toString(), dashboardDataSet.reserveTokenSymbol, true, true)} bound to position`
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
					<Text align='left'>Market Price</Text>
					<Text align='right'>
						{`${Number(formatUnits(currentTokenPrice, defaultDecimals)).toFixed(3)} ${dashboardDataSet.reserveTokenSymbol}`}
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
					isDisabled={!isAbleToSendTransaction(wallet, provider, amount) || userLpTokenBalance.gt(0)}
				>
					{userLpTokenBalance.gt(0) ? `Removal Required` : `Add Liquidity`}
				</Button>
			</Stack>
		</Stack>
	)
}
