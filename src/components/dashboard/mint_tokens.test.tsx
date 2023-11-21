import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import MintTokens from './mint_tokens'
import { ChakraProvider, CSSReset, extendTheme } from '@chakra-ui/react';
import { ethers } from 'ethers'
const theme = extendTheme({})

describe('MintToken YOU PAY handling', () => {
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
				<MintTokens dashboardDataSet={{
					bondingCurveParams: {
						reserveAmount: "21131781542148949646",
						inverseTokenSupply: "14095447126455587752",
						invariant: "5628552015782940183"
					},
					reserveTokenDecimals: ethers.BigNumber.from("18"),

				}} parentSetters={{                                
					setNewIbcIssuance: setNewIbcIssuance,
					setNewPrice: setNewPrice,
					setNewReserve: setNewReserve}} />
			</ChakraProvider>
		)
		const inputElement = getByTestId('you_pay')

		fireEvent.change(inputElement, {target:{value:'11'}})

		await waitFor(() => {
			expect(newPrice).toBe('492979166977622560')
			expect(newIbcIssuance.toString()).toBe('32589390887558483686')
			expect(newReserve).toBe('32131781542148949646')
		});
	});
});


describe('MintToken YOU RECEIVE handling', () => {
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
				<MintTokens dashboardDataSet={{
					bondingCurveParams: {
						reserveAmount: "21131781542148949646",
						inverseTokenSupply: "14095447126455587752",
						invariant: "5628552015782940183"
					},
					reserveTokenDecimals: ethers.BigNumber.from("18"),

				}} parentSetters={{                                
					setNewIbcIssuance: setNewIbcIssuance,
					setNewPrice: setNewPrice,
					setNewReserve: setNewReserve}} />
			</ChakraProvider>
		)
		const inputElement = getByTestId('you_pay')

		fireEvent.change(inputElement, {target:{value:'11'}})

		await waitFor(() => {
			expect(newPrice).toBe('492979166977622560')
			expect(newIbcIssuance.toString()).toBe('32589390887558483686')
			expect(newReserve).toBe('32131781542148949646')
		});
	});
});