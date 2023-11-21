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

		fireEvent.change(inputElement, {target:{value:'18.309'}})

		await waitFor(() => {
			expect(newPrice).toBe('492979199947639139')
			expect(newIbcIssuance.toString()).toBe('32589386520394984566')
			expect(newReserve).toBe(ethers.BigNumber.from('21131781542148949646').add(ethers.BigNumber.from('10999997848294913204')).toString()) 
		});
	});
});

/*
2814276007789739754535245660
281427600789147
2814276007789739754535245660 2814276007789739754535245660
492979199947639139

492979199978490656

18493939393939393939
18493939393939396

14095447126455587
14095447126455587752
*/