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
	format,
	parse,
	commandTypes,
	sanitizeNumberInput,
} from '../../config/constants'
import { CgArrowDownR } from 'react-icons/cg'

import { BigNumber as bignumber } from 'bignumber.js'
import { DefaultSpinner } from '../spinner'
import { Toast } from '../toast'
import { BiLinkExternal } from 'react-icons/bi'
import { error_message } from '../../config/error'
import { isAbleToSendTransaction } from '../../config/validation'
import { formatBalanceNumber, formatNumber, formatReceiveNumber } from '../../util/display_formatting'
import { composeMulticallQuery, composeQuery } from '../../util/ethers_utils'

type mintProps = {
	reserveAddress: string
	parentSetters: any
}

export default function CreateIBAsset(props: mintProps) {
	const [{ wallet, connecting }] = useConnectWallet()
	const [provider, setProvider] =
		useState<ethers.providers.Web3Provider | null>()
	const [amount, setAmount] = useState<number>()
	const ibcFactoryAddress = contracts.tenderly.ibcFactoryContract;
	const { reserveAddress, parentSetters } = props
	const [reserveSymbol, setReserveSymbol] = useState<string>('');
	const [reserveDecimal, setReserveDecimal] = useState<number>(0);
	const [userBalance, setUserBalance] = useState<BigNumber>(BigNumber.from(0));
	const [userAllowance, setUserAllowance] = useState<BigNumber>(BigNumber.from(0));

	const [mintAmount, setMintAmount] = useState<number>(0)
	const [ibcCredit, setIbcCredit] = useState<number>(0)
	const [fee, setFee] = useState<number>(0)
	const [initialPrice, setInitialPrice] = useState<number>(0)

	const INITIAL_RESERVE_DEDUCTION = 1e-10;

	const [isProcessing, setIsProcessing] = useState(false)

	useEffect(() => {
		const fetchTokenInfo = async () => {
			// If the wallet has a provider than the wallet is connected
			if (wallet?.provider) {
                const web3Provider = new ethers.providers.Web3Provider(wallet.provider, 'any');
                setProvider(web3Provider);

				const abiCoder = defaultAbiCoder;
				let multicallQueries = [
						composeMulticallQuery(reserveAddress, "symbol", [], []),
						composeMulticallQuery(reserveAddress, "decimals", [], []),
						composeMulticallQuery(reserveAddress, "balanceOf", ['address'], [wallet.accounts[0].address]),
						composeMulticallQuery(reserveAddress, "allowance", ['address', 'address'], [wallet.accounts[0].address, ibcFactoryAddress]),
				]

				let multicallQuery = composeQuery(contracts.tenderly.multicallContract, "aggregate3", ["(address,bool,bytes)[]"], [multicallQueries])
				let multicallBytes = await web3Provider.call(multicallQuery)
				let multicallResults = abiCoder.decode(["(bool,bytes)[]"], multicallBytes)[0]

				console.log(multicallResults)

				const symbolBytes = multicallResults[0][0] ? multicallResults[0][1] : [''];
				console.log(abiCoder.decode(["string"], symbolBytes)[0]);
				setReserveSymbol(abiCoder.decode(["string"], symbolBytes)[0]);

				const decimalBytes = multicallResults[1][0] ? multicallResults[1][1] : [0];
				console.log(abiCoder.decode(["uint256"], decimalBytes)[0]);
				setReserveDecimal(abiCoder.decode(["uint256"], decimalBytes)[0]);

				const userBalanceBytes = multicallResults[2][0] ? multicallResults[2][1] : [0];
				console.log(abiCoder.decode(["uint256"], userBalanceBytes)[0]);
				setUserBalance(abiCoder.decode(["uint256"], userBalanceBytes)[0]);

				const userAllowanceBytes = multicallResults[3][0] ? multicallResults[3][1] : [0];
				console.log(abiCoder.decode(["uint256"], userAllowanceBytes)[0]);
				setUserAllowance(abiCoder.decode(["uint256"], userAllowanceBytes)[0]);
			}
		}
		if(reserveAddress){
			fetchTokenInfo()
			.then()
			.catch((err) => console.log("error", err))
		}else{
			setReserveSymbol('');
			setReserveDecimal(0);
			setUserBalance(BigNumber.from(0));
			setUserAllowance(BigNumber.from(0));
			setAmount(0);
			setMintAmount(0)
			setIbcCredit(0)
			setFee(0);
			setInitialPrice(0);
		}
	}, [wallet, reserveAddress])

	const sendTransaction = useCallback(async () => {
		if (!wallet || !provider || !amount) {
			return
		}

		if (wallet?.provider) {
			setProvider(new ethers.providers.Web3Provider(wallet.provider, 'any'))
			// if using ethers v6 this is:
			// ethersProvider = new ethers.BrowserProvider(wallet.provider, 'any')
		}

		let txDetails
		let description = ''

		try {
			setIsProcessing(true)
			const signer = provider?.getUncheckedSigner()
			const abiCoder = defaultAbiCoder
			const initialReserve = parseUnits((amount || 0).toString(), reserveDecimal);
			console.log('initialReserve',initialReserve);
			console.log('reserveDecimal',reserveDecimal);
			let aproveAction = true;
			if(userAllowance.gte(initialReserve)){
				aproveAction = false;
				const functionDescriptorBytes = arrayify(
					solidityKeccak256(
						['string'],
						[
							'createCurve(uint256,address)', // put function signature here w/ types + no spaces, ex: createPair(address,address)
						]
					)
				).slice(0, 4)

				const payloadBytes = arrayify(
					abiCoder.encode(
						['uint256', 'address'], 
						[
							initialReserve,
							reserveAddress,
						] 
					)
				)	
	
				txDetails = {
					to: ibcFactoryAddress,
					data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
				}
	
			}else{
				description = 'Allowance updated';
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
						['address', 'uint256'], // array of types; make sure to represent complex types as tuples
						[ibcFactoryAddress, initialReserve] // arg values; note https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder--methods
					)
				)

				txDetails = {
					to: reserveAddress,
					data: hexlify(concat([functionDescriptorBytes, payloadBytes])),
				}
			}
			
			const tx = await signer.sendTransaction(txDetails)
			const result = await tx.wait()			

			if (result.status === 1) {
				if(aproveAction){
					setUserAllowance(initialReserve);
				}
				// extract LiquidityAdded event, and display details
				let curveCreatedDetail
				result.logs.find((x) => {
					try {
						curveCreatedDetail = abiCoder.decode(
							['address', 'address', 'address', 'uint256'],
							x.data
						)
						return true
					} catch (err) {
						return false
					}
				})

				if (curveCreatedDetail) {
					description = `Curve created at ${curveCreatedDetail[2]}, ib${reserveSymbol} created at ${curveCreatedDetail[1]}`
				}
			}else{
				description = 'Error details';			
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
	}, [
		amount,
		wallet,
		provider,
		mintAmount,
	])

	const handleAmountChange = (val: any) => {
		const parsedAmount = sanitizeNumberInput(val)
		setAmount(parsedAmount)

		if (isNaN(val) || val.trim() === '') {
			return
		}

		const decimaledParsedAmount = parseEther(val === '' ? '0' : val)

		const mintAmount = 1.0;
		const price = 2/val;
		const supply = val * val / 4;
		const tokenToDead = supply * INITIAL_RESERVE_DEDUCTION/ val;
		const lpToDead = INITIAL_RESERVE_DEDUCTION/ val;


		setMintAmount(mintAmount)
		setIbcCredit(supply)
		setFee(tokenToDead);
		setInitialPrice(price);
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
						isDisabled= {!reserveAddress}
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
						{reserveSymbol}
					</Text>
				</Stack>
				<Stack direction='row' justify='right' fontSize='sm'>
					<Text align='right'>{`Balance: ${formatBalanceNumber(
						formatUnits(userBalance, reserveDecimal)
					)}`}</Text>
					<Box
						as='button'
						color={colors.TEAL}
						onClick={() =>
							reserveAddress && handleAmountChange(formatUnits(userBalance, reserveDecimal).toString())
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
						{mintAmount}
					</Text>
					<Text align='right'>LP</Text>
				</Stack>
				<Text align='right' fontSize='sm'>
					{
						`+ ${formatNumber(ibcCredit.toString(), "IBC")} bound to position`
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
					<Text align='left'>Creation Fee</Text>
					<Text align='right'>
						{reserveSymbol?`${Number(fee).toFixed(4)} ib${reserveSymbol}` : '-'}
					</Text>
				</Stack>
				<Stack
					direction='row'
					fontSize='md'
					justifyContent={'space-between'}
				>
					<Text align='left'>Initial Price</Text>
					<Text align='right'>
						{`${Number(initialPrice).toFixed(4)} ${reserveSymbol}`}
					</Text>
				</Stack>

				{isProcessing && <DefaultSpinner />}
				<Button
					onClick={sendTransaction}
					isDisabled={!isAbleToSendTransaction(wallet, provider, amount) }
				>
					 {!reserveAddress || userAllowance.gte(parseUnits((amount || 0).toString(), reserveDecimal))  ? 'Create ibAsset' : `Approve ${reserveSymbol}`}
				</Button>
			</Stack>
		</Stack>
	)
}
