import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers, BigNumber } from 'ethers'
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
	concat,
	defaultAbiCoder,
	hexlify,
	parseEther,
	formatUnits,
	parseUnits,
	formatEther,
	solidityKeccak256,
} from 'ethers/lib/utils'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import {
	explorerUrl,
	maxSlippagePercent,
	reserveAssetDecimals,
	reserveAssetSymbol,
	format,
	parse,
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

export default function AddLiquidity(props: mintProps) {
	const [{ wallet, connecting }] = useConnectWallet()
	const [provider, setProvider] =
		useState<ethers.providers.Web3Provider | null>()
	const [amount, setAmount] = useState<number>()
	const [ibcContractAddress] = useState<string>(contracts.tenderly.ibcContract)
	const { dashboardDataSet, parentSetters } = props
	const [maxSlippage, setMaxSlippage] = useState<number>(maxSlippagePercent)
	const [mintAmount, setMintAmount] = useState<BigNumber>(BigNumber.from(0))

	const bondingCurveParams =
		'bondingCurveParams' in dashboardDataSet
			? dashboardDataSet.bondingCurveParams
			: {}
	const lpTokenDecimals = BigNumber.from(
		'lpTokenDecimals' in dashboardDataSet
			? dashboardDataSet.lpTokenDecimals
			: '0'
	)
	const lpTokenSupply = BigNumber.from(
		'lpTokenSupply' in dashboardDataSet ? dashboardDataSet.lpTokenSupply : '0'
	)
	const userBalance = BigNumber.from(
		'userEthBalance' in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'
	)
	const userIbcBalance = bignumber(
		'userLpTokenBalance' in dashboardDataSet
			? dashboardDataSet.userLpTokenBalance
			: '0'
	)
	const totalFeePercent =
		'fees' in dashboardDataSet
			? Object.keys(dashboardDataSet.fees).reduce(
					(x, y) =>
						Number(formatEther(dashboardDataSet.fees[y]['addLiquidity'])) + x,
					0
			  )
			: 0
	const forceUpdate = dashboardDataSet.forceUpdate

	const currentTokenPrice = BigNumber.from(
		'currentTokenPrice' in bondingCurveParams
			? bondingCurveParams.currentTokenPrice
			: '0'
	)
	const [resultPrice, setResultPrice] = useState<bignumber>(
		bignumber(currentTokenPrice.toString())
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

			const functionDescriptorBytes = arrayify(
				solidityKeccak256(
					['string'],
					[
						'addLiquidity(address,uint256)', // put function signature here w/ types + no spaces, ex: createPair(address,address)
					]
				)
			).slice(0, 4)

			const minPriceLimit = BigNumber.from(
				bignumber(currentTokenPrice.toString())
					.multipliedBy(1 - maxSlippage / 100)
					.toFixed(0)
			)

			const payloadBytes = arrayify(
				abiCoder.encode(
					['address', 'uint256'], // array of types; make sure to represent complex types as tuples
					[wallet.accounts[0].address, minPriceLimit] // arg values
				)
			)

			const txDetails = {
				to: ibcContractAddress,
				data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
				value: parseEther(amount.toString()),
			}

			const tx = await signer.sendTransaction(txDetails)
			const result = await tx.wait()

			let description = 'Error details'

			if (result.status === 1) {
				// extract LiquidityAdded event, and display details
				let LiquidityAddedDetails
				result.logs.find((x) => {
					try {
						LiquidityAddedDetails = abiCoder.decode(
							['uint256', 'uint256', 'uint256', 'uint256'],
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
						formatEther(LiquidityAddedDetails[0])
					).toFixed(4)} ETH`
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
		ibcContractAddress,
		maxSlippage,
		mintAmount,
		currentTokenPrice,
	])

	const handleAmountChange = (val: any) => {
		const parsedAmount = val
		setAmount(parsedAmount)

		if (isNaN(val) || val.trim() === '') {
			return
		}

		const decimaledParsedAmount = parseEther(val === '' ? '0' : val)
		const feeAdjustedAmount = parseEther(
			Number(
				Number(formatEther(decimaledParsedAmount)) * (1 - totalFeePercent)
			).toFixed(reserveAssetDecimals)
		)

		const supply = formatUnits(
			bondingCurveParams.inverseTokenSupply,
			bondingCurveParams.inverseTokenDecimals
		)
		const price_supply_product = bignumber(
			bondingCurveParams.currentTokenPrice
		).multipliedBy(supply)

		const mintAmount = BigNumber.from(
			bignumber(lpTokenSupply.mul(feeAdjustedAmount).toString())
				.dividedBy(
					bignumber(bondingCurveParams.reserveAmount).minus(
						price_supply_product
					)
				)
				.toFixed(0)
		)

		setMintAmount(mintAmount)

		parentSetters?.setNewLpIssuance(mintAmount.add(lpTokenSupply).toString())
		parentSetters?.setNewReserve(
			feeAdjustedAmount.add(bondingCurveParams.reserveAmount).toString()
		)
	}

	return (
		<Stack justifyContent={'space-between'} h='calc(100vh - 220px)'>
			<Stack>
				<Text align='left' fontSize='sm'>
					YOU PAY
				</Text>

				<Stack direction='row' justifyContent={'space-between'}>
					<NumberInput
						value={amount}
						onChange={(valueString) => handleAmountChange(valueString)}
					>
						<NumberInputField
							minWidth='auto'
							border='none'
							fontSize='4xl'
							placeholder={`0`}
							pl='0'
						/>
					</NumberInput>
					<Text align='right' fontSize='4xl'>
						{reserveAssetSymbol}
					</Text>
				</Stack>
				<Stack direction='row' justify='right' fontSize='sm'>
					<Text align='right'>{`Balance: ${Number(
						formatEther(userBalance)
					).toFixed(1)}`}</Text>
					<Box
						as='button'
						color={colors.TEAL}
						onClick={() =>
							handleAmountChange(formatEther(userBalance).toString())
						}
					>
						MAX
					</Box>
				</Stack>
				<Icon as={CgArrowDownR} fontSize='3xl' alignSelf={'center'} m='5' />
				<Text align='left' fontSize='sm'>
					YOU RECEIVE
				</Text>
				<Stack direction='row' justifyContent={'space-between'} fontSize='4xl'>
					<Text>
						{Number(formatUnits(mintAmount, lpTokenDecimals)).toFixed(2)}
					</Text>
					<Text align='right'>LP</Text>
				</Stack>
				<Text align='right' fontSize='sm'>{`Balance: ${userIbcBalance
					.dividedBy(Math.pow(10, lpTokenDecimals.toNumber()))
					.toFixed(2)}`}</Text>
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
					isDisabled={!isAbleToSendTransaction(wallet, provider, amount)}
				>
					Add Liquidity
				</Button>
			</Stack>
		</Stack>
	)
}
