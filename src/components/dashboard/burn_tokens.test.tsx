import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { ChakraProvider, CSSReset, extendTheme } from '@chakra-ui/react';
import { ethers } from 'ethers'
import BurnTokens from './burn_tokens';
const theme = extendTheme({})

describe('Burn Token YOU PAY handling', () => {
	it('', async () => {

		let newPrice: any;
		function setNewPrice(x:any){
			newPrice = x
		}

		let newReserve: any;
		function setNewReserve(x:any){
			newReserve = x
		}

		let newIbcIssuance: ethers.BigNumber = ethers.BigNumber.from('0');
		function setNewIbcIssuance(x:ethers.BigNumber){
			newIbcIssuance = x
		}

		const { getByTestId } = render(
			<ChakraProvider theme={theme}>
				<CSSReset />
				<BurnTokens dashboardDataSet={{
					bondingCurveParams: {
						reserveAmount: "21131781542148949646",
						inverseTokenSupply: "14095447126455587752",
						invariant: "5628552015782940183"
					},
					reserveTokenDecimals: ethers.BigNumber.from("18"),
					inverseTokenDecimals: ethers.BigNumber.from("18"),
					fees: {"lpFee":{"buyTokens":"2500000000000000","sellTokens":"2500000000000000","addLiquidity":"2500000000000000","removeLiquidity":"2500000000000000"},"stakingFee":{"buyTokens":"2500000000000000","sellTokens":"2500000000000000","addLiquidity":"2500000000000000","removeLiquidity":"2500000000000000"},"protocolFee":{"buyTokens":"5000000000000000","sellTokens":"5000000000000000","addLiquidity":"5000000000000000","removeLiquidity":"5000000000000000"}}

				}} parentSetters={{                                
					setNewIbcIssuance: setNewIbcIssuance,
					setNewPrice: setNewPrice,
					setNewReserve: setNewReserve}} wallet={null}/>
			</ChakraProvider>
		)
		const inputElement = getByTestId('you_pay')

		fireEvent.change(inputElement, {target:{value:'11'}})

		await waitFor(() => {
			expect(newPrice).toBe('1571890826606560941')
			expect(newIbcIssuance.toString()).toBe(ethers.BigNumber.from('14095447126455587752').sub(ethers.BigNumber.from('10889999999999999999')).toString())
			expect(newReserve).toBe(ethers.BigNumber.from('21131781542148949646').sub(ethers.BigNumber.from('11054555675653151020')).toString())
		});
	});
});


describe('BurnToken YOU RECEIVE handling', () => {
	it('', async () => {

		let newPrice: any;
		function setNewPrice(x:any){
			newPrice = x
		}

		let newReserve: any;
		function setNewReserve(x:any){
			newReserve = x
		}

		let newIbcIssuance: ethers.BigNumber = ethers.BigNumber.from('0');
		function setNewIbcIssuance(x:ethers.BigNumber){
			newIbcIssuance = x
		}

		const { getByTestId } = render(
			<ChakraProvider theme={theme}>
				<CSSReset />
				<BurnTokens dashboardDataSet={{
					bondingCurveParams: {
						reserveAmount: "21131781542148949646",
						inverseTokenSupply: "14095447126455587752",
						invariant: "5628552015782940183",
						currentTokenPrice: "749595999068626357"
					},
					reserveTokenDecimals: ethers.BigNumber.from("18"),
					inverseTokenDecimals: ethers.BigNumber.from("18"),
					fees: {"lpFee":{"buyTokens":"2500000000000000","sellTokens":"2500000000000000","addLiquidity":"2500000000000000","removeLiquidity":"2500000000000000"},"stakingFee":{"buyTokens":"2500000000000000","sellTokens":"2500000000000000","addLiquidity":"2500000000000000","removeLiquidity":"2500000000000000"},"protocolFee":{"buyTokens":"5000000000000000","sellTokens":"5000000000000000","addLiquidity":"5000000000000000","removeLiquidity":"5000000000000000"}}
				}} parentSetters={{                                
					setNewIbcIssuance: setNewIbcIssuance,
					setNewPrice: setNewPrice,
					setNewReserve: setNewReserve}} wallet={null}/>
			</ChakraProvider>
		)
		const inputElement = getByTestId('you_receive')

		fireEvent.change(inputElement, {target:{value:'10.944'}})

		await waitFor(() => {
			expect(newPrice).toBe('1571889231749905718')
			expect(newIbcIssuance.toString()).toBe('3205453629956167694')
			expect(newReserve).toBe(ethers.BigNumber.from('21131781542148949646').sub(ethers.BigNumber.from('11054545454545455629')).toString())
		});
	});
});
