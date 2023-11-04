import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
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
	reserveAssetDecimals,
	format,
	parse,
  commandTypes,
	sanitizeNumberInput,
	curveUtilization,
	defaultDecimals,
} from '../../config/constants'
import { CgArrowDownR } from 'react-icons/cg'

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { Toast } from '../toast'
import { Link } from '@chakra-ui/react'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { isAbleToSendTransaction } from '../../config/validation'
import { formatBalanceNumber, formatReceiveNumber } from '../../util/display_formatting'

type mintProps = {
	dashboardDataSet: any
	parentSetters: any
}

export default function MintTokens(props: mintProps) {
	const [{ wallet }] = useConnectWallet()
	const [provider, setProvider] =
		useState<ethers.providers.Web3Provider | null>()
	const [amount, setAmount] = useState<BigNumber>(BigNumber.from(0)) // tied to actual number for tx
	const [amountDisplay, setAmountDisplay] = useState<number>() // tied to display amount
	const [ibcRouterAddress] = useState<string>(contracts.tenderly.ibcRouterContract)
	const { dashboardDataSet, parentSetters } = props
	const [maxSlippage, setMaxSlippage] = useState<number>(maxSlippagePercent)
	const [maxReserve, setMaxReserve] = useState<number>(maxReserveChangePercent)
	const [mintAmount, setMintAmount] = useState<BigNumber>(BigNumber.from(0)) // this is tied to the actual number sent for tx
	const [mintAmountDisplay, setMintAmountDisplay] = useState<number>() // this is tied to the numberinput of the received assets

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

	const reserveTokenDecimals = "reserveTokenDecimals" in dashboardDataSet ? dashboardDataSet.reserveTokenDecimals.toNumber() : reserveAssetDecimals;
	const contractReserveTokenBalance = "contractReserveTokenBalance" in dashboardDataSet ? dashboardDataSet.contractReserveTokenBalance : BigNumber.from(0);

	const [resultPrice, setResultPrice] = useState<bignumber>(
		bignumber(currentTokenPrice.toString())
	)
	const [isProcessing, setIsProcessing] = useState(false)

	useEffect(() => {
		// If the wallet has a provider than the wallet is connected
		if (wallet?.provider) {
			setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
		}
	}, [wallet])

	const sendTransaction = useCallback(async () => {
		if (!wallet || !provider || !amount) {
			return
		}

		if (wallet?.provider) {
			setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
		}

		try {
			setIsProcessing(true)
			const signer = provider?.getUncheckedSigner()
			const abiCoder = defaultAbiCoder
			let txDetails
			let description = 'Error details'

			if (userReserveTokenAllowance.lt(amount)){
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
		provider,
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

		setAmount(parseUnits(parsedAmount, reserveTokenDecimals)) // will be fed into router; needs to reflect "real" decimals

		const decimaledParsedAmount = parseUnits(val === '' ? '0' : val, defaultDecimals) // for all calcs, stay in default decimals (all curve params are in default decimals)
		const reserveAmount = BigNumber.from(bondingCurveParams.reserveAmount)
		const inverseTokenSupply = BigNumber.from(bondingCurveParams.inverseTokenSupply)

		// this should be a non-under/overflow number
		const reserveDelta =
			Number(formatUnits(decimaledParsedAmount, defaultDecimals)) /
			Number(formatUnits(reserveAmount, defaultDecimals))

		// keep calc in non-under/overflow numeric domains
		const logMintedTokensPlusSupply =
			Math.log(1 + reserveDelta) / curveUtilization +
			Math.log(
				Number(formatUnits(inverseTokenSupply, inverseTokenDecimals))
			)
			
		const newSupplySaneFormat = Math.exp(logMintedTokensPlusSupply)
		const newSupply = BigInt(Math.floor(Math.exp(logMintedTokensPlusSupply) * 10**(inverseTokenDecimals.toNumber())))
		const mintAmount = newSupply - BigInt(inverseTokenSupply.toString()) // wei format

		// calculate spot price post mint
		const curveInvariant = Number(formatUnits(reserveAmount, defaultDecimals)) / Math.pow(Number(formatUnits(inverseTokenSupply, inverseTokenDecimals)), curveUtilization) 

		const newPrice = Number(
			curveInvariant 
			* 
			curveUtilization 
			/
			Math.pow(
				newSupplySaneFormat // this is in sane format
				, 
				1 - curveUtilization
			)
		).toFixed(defaultDecimals) 

		setResultPrice(bignumber(parseUnits(newPrice, defaultDecimals).toString()))
		setMintAmount(BigNumber.from(mintAmount))
		setMintAmountDisplay(Number(formatReceiveNumber(Number(Number(formatUnits(mintAmount.toString(), inverseTokenDecimals)) *
		(1 - totalFeePercent)).toString())))

		parentSetters?.setNewPrice(Number(Number(newPrice) * 10**defaultDecimals).toString())
		parentSetters?.setNewIbcIssuance(newSupply) // this is wei format
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

		const mintAmount = parsedAmount / (1 - totalFeePercent) // full mint-amount

		setMintAmount(parseUnits(mintAmount.toFixed(inverseTokenDecimals.toNumber()), inverseTokenDecimals.toNumber()))

		// calculate ETH payment
		const currentInverseTokenSupply = Number(ethers.utils.formatUnits(bondingCurveParams.inverseTokenSupply, inverseTokenDecimals.toString()))
		const k = 1 - curveUtilization
		const m = Number(ethers.utils.formatUnits(bondingCurveParams.currentTokenPrice, defaultDecimals)) 
		* 
		Math.pow(
			currentInverseTokenSupply,
			k
		)

		const newPrice = Number(m * (currentInverseTokenSupply + mintAmount) ** (-k)).toFixed(inverseTokenDecimals.toNumber())
		const k_1 = 1 - k
		const reserveNeeded = (m/k_1)*((currentInverseTokenSupply + mintAmount)**k_1 - currentInverseTokenSupply**k_1)

		setResultPrice(bignumber(parseUnits(newPrice, inverseTokenDecimals).toString()))

		setAmount(parseUnits(reserveNeeded.toFixed(reserveTokenDecimals), reserveTokenDecimals)) // sent to router, needs to be the 'real' decimals
		setAmountDisplay(reserveNeeded)

		parentSetters?.setNewPrice(parseUnits(newPrice, inverseTokenDecimals).toString())
		parentSetters?.setNewIbcIssuance(BigInt((currentInverseTokenSupply + mintAmount)*10**inverseTokenDecimals.toNumber())) // this is wei format
		parentSetters?.setNewReserve(
			BigNumber.from(bondingCurveParams.reserveAmount).add(parseUnits(reserveNeeded.toFixed(defaultDecimals), defaultDecimals).toString()
		))
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
					isDisabled={!isAbleToSendTransaction(wallet, provider, amount)}
					onClick={sendTransaction}
				>
					Mint
				</Button>
			</Stack>
		</Stack>
	)
}
