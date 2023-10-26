import { useCallback, useEffect, useState } from 'react'
import { useConnectWallet } from '@web3-onboard/react'
import { ethers } from 'ethers'
import {
	Box,
	Button,
	Input,
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
	parseEther,
	formatEther,
	solidityKeccak256,
} from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import { contracts } from '../../config/contracts'
import { colors } from '../../config/style'
import {
	explorerUrl,
	ibcSymbol,
	maxSlippagePercent,
	maxReserveChangePercent,
	reserveAssetDecimals,
	reserveAssetSymbol,
	format,
	parse,
  commandTypes,
	sanitizeNumberInput,
} from '../../config/constants'
import { composeQuery } from '../../util/ethers_utils'
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
	const [{ wallet, connecting }] = useConnectWallet()
	const [provider, setProvider] =
		useState<ethers.providers.Web3Provider | null>()
	const [amount, setAmount] = useState<number>()
	const [ibcContractAddress] = useState<string>(contracts.tenderly.ibcETHCurveContract)
	const [ibcRouterAddress] = useState<string>(contracts.tenderly.ibcRouterContract)
	const { dashboardDataSet, parentSetters } = props
	const [maxSlippage, setMaxSlippage] = useState<number>(maxSlippagePercent)
	const [maxReserve, setMaxReserve] = useState<number>(maxReserveChangePercent)
	const [mintAmount, setMintAmount] = useState<BigNumber>(BigNumber.from(0))

	const bondingCurveParams =
		'bondingCurveParams' in dashboardDataSet
			? dashboardDataSet.bondingCurveParams
			: {}
	const inverseTokenDecimals = BigNumber.from(
		'inverseTokenDecimals' in dashboardDataSet
			? dashboardDataSet.inverseTokenDecimals
			: '0'
	)
	const userBalance = BigNumber.from(
		'userEthBalance' in dashboardDataSet ? dashboardDataSet.userEthBalance : '0'
	)
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

	const reserveTokenDecimals = "reserveTokenDecimals" in dashboardDataSet ? dashboardDataSet.reserverTokenDecimals : reserveAssetDecimals;
	const contractReserveTokenBalance = "contractReserveTokenBalance" in dashboardDataSet ? dashboardDataSet.contractReserveTokenBalance : BigNumber.from(0);

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
						'execute(address,address,bool,uint8,bytes)', // put function signature here w/ types + no spaces, ex: createPair(address,address)
					]
				)
			).slice(0, 4)

			const receivedAmount =
				Number(formatUnits(mintAmount, inverseTokenDecimals)) *
				(1 - totalFeePercent)

			const maxPriceLimit = bignumber(
				Number(amount.toString()) * (1 + maxSlippage / 100)
			)
				.dividedBy(bignumber(receivedAmount))
				.toFixed(reserveAssetDecimals)

      const minPriceLimit = bignumber(
        Number(amount.toString()) * (1 - maxSlippage / 100)
      )
        .dividedBy(bignumber(receivedAmount))
        .toFixed(reserveAssetDecimals)

			const maxReserveLimit =
				Number(formatUnits(contractReserveTokenBalance, reserveTokenDecimals)) *
				(1 + maxReserve / 100)

      const minReserveLimit =
				Number(formatUnits(contractReserveTokenBalance, reserveTokenDecimals)) *
				(1 - maxReserve / 100)

			const commandBytes = arrayify(
				abiCoder.encode(
					['address', 'uint256', 'uint256', 'uint256[2]', "uint256[2]"], // array of types; make sure to represent complex types as tuples
					[
						wallet.accounts[0].address, // unused when going thru router
            parseEther(amount.toString()), // reserve in
            0, // exact out arg not used in frontend
						[parseEther(minPriceLimit), parseEther(maxPriceLimit)],
						[parseEther(minReserveLimit.toFixed(reserveAssetDecimals)), parseEther(maxReserveLimit.toFixed(reserveAssetDecimals))],
					] 
				)
			)

      const payloadBytes = arrayify(
				abiCoder.encode(
					['address', 'address', 'bool', 'uint8', 'bytes'], // array of types; make sure to represent complex types as tuples
					[
						wallet.accounts[0].address,
            ibcContractAddress,
            true,
            commandTypes.buyTokens,
            commandBytes,
					] // arg values
				)
			)

			const txDetails = {
				to: ibcRouterAddress,
				data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
				value: parseEther(amount.toString()),
			}

			const tx = await signer.sendTransaction(txDetails)
			const result = await tx.wait()

			let description = 'Error details'

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
					).toFixed(4)} IBC for ${Number(
						formatEther(tokenBoughtDetails[0])
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
		inverseTokenDecimals,
		totalFeePercent,
		maxReserve,
		reserveTokenDecimals,
		contractReserveTokenBalance
	])

	const handleAmountChange = (val: any) => {
		const parsedAmount = sanitizeNumberInput(val)
		setAmount(parsedAmount)

		if (isNaN(val) || val.trim() === '') {
			return
		}

		const decimaledParsedAmount = parseEther(val === '' ? '0' : val)

		const calcMintAmount = async (
			decimaledParsedAmount: BigNumber,
			reserveAmount: BigNumber,
			inverseTokenSupply: BigNumber,
			utilization: BigNumber
		) => {
			if (wallet?.provider) {
				const provider = new ethers.providers.Web3Provider(
					wallet.provider,
					'any'
				)
				const abiCoder = ethers.utils.defaultAbiCoder

				//directly calculate mintAmount with invariant and utilization

				// this should be a non-under/overflow number
				const reserveDelta =
					Number(formatEther(decimaledParsedAmount)) /
					Number(formatEther(reserveAmount))

				// keep calc in non-under/overflow numeric domains
				const logMintedTokensPlusSupply =
					Math.log(1 + reserveDelta) / Number(formatEther(utilization)) +
					Math.log(
						Number(formatUnits(inverseTokenSupply, inverseTokenDecimals))
					)
					
				const newSupplySaneFormat = Math.exp(logMintedTokensPlusSupply)
				const newSupply = BigInt(Math.floor(Math.exp(logMintedTokensPlusSupply) * 10**(inverseTokenDecimals.toNumber())))

				const mintAmount = newSupply - BigInt(inverseTokenSupply.toString())



        // calculate spot price post mint
        const curveInvariant = Number(formatEther(reserveAmount)) / Math.pow(Number(formatUnits(inverseTokenSupply, inverseTokenDecimals)), Number(formatEther(utilization))) 

        const newPrice = Number(
					curveInvariant 
					* 
					Number(formatEther(utilization)) 
        	/
        	Math.pow(
						newSupplySaneFormat // this is in sane format
						, 
						1 - Number(formatEther(utilization))
					)
				).toFixed(inverseTokenDecimals.toNumber()) 

				// this is the minter's price, not the resulting bonding curve price!!!
				const resultPriceInEth = bignumber(decimaledParsedAmount.toString())
					.dividedBy(bignumber(mintAmount.toString()))
					.toFixed(reserveAssetDecimals)
				const resultPriceInWei = parseEther(resultPriceInEth)
				setResultPrice(bignumber(resultPriceInWei.toString()))
				setMintAmount(BigNumber.from(mintAmount))

				parentSetters?.setNewPrice(parseUnits(newPrice, inverseTokenDecimals).toString())
				parentSetters?.setNewIbcIssuance(newSupply) // this is wei format
				parentSetters?.setNewReserve(
					reserveAmount.add(decimaledParsedAmount).toString()
				)
			}
		}

		if (
			'reserveAmount' in bondingCurveParams &&
			'inverseTokenSupply' in bondingCurveParams &&
			'utilization' in bondingCurveParams
		) {
			calcMintAmount(
				decimaledParsedAmount,
				BigNumber.from(bondingCurveParams.reserveAmount),
				BigNumber.from(bondingCurveParams.inverseTokenSupply),
				BigNumber.from(bondingCurveParams.utilization)
			)
				.then()
				.catch((err) => console.log(err))
		}
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
						{reserveAssetSymbol}
					</Text>
				</Stack>

				<Stack direction='row' justify='right' fontSize='sm'>
					<Text align='right'>{`Balance: ${formatBalanceNumber(
						formatEther(userBalance)
					)}`}</Text>
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
				<Stack direction='row' justifyContent={'space-between'} fontSize='5xl'>
					<Text>
						{
							formatReceiveNumber((Number(formatUnits(mintAmount, inverseTokenDecimals)) *
							(1 - totalFeePercent)).toString()
						)}
					</Text>
					<Text align='right'>{ibcSymbol}</Text>
				</Stack>
				<Text align='right' fontSize='sm'>{`Balance: ${formatBalanceNumber(formatUnits(userIbcBalance.toString(), inverseTokenDecimals))}`}</Text>
			</Stack>

			<Stack>
				<Stack
					direction='row'
					fontSize='md'
					justifyContent={'space-between'}
					mt='12'
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
					MINT
				</Button>
			</Stack>
		</Stack>
	)
}
