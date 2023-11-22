import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { ChakraProvider, CSSReset, extendTheme } from '@chakra-ui/react';
import { ethers } from 'ethers'
import AddLiquidity from './add_liquidity';
const theme = extendTheme({})

describe('Add liquidity YOU PAY handling', () => {
	it('', async () => {

		let newReserve: any;
		function setNewReserve(x:any){
			newReserve = x
		}

		let newLpIssuance: any;
		function setNewLpIssuance(x:any){
			newLpIssuance = x
		}

		const { getByTestId } = render(
			<ChakraProvider theme={theme}>
				<CSSReset />
				<AddLiquidity dashboardDataSet={{
					bondingCurveParams: {
						reserveAmount: "21131781542148949646",
						inverseTokenSupply: "14095447126455587752",
						invariant: "5628552015782940183",
						lpSupply: "7920149448591331248",
					},
					reserveTokenDecimals: ethers.BigNumber.from("18"),
					inverseTokenDecimals: ethers.BigNumber.from("18"),
					lpTokenSupply: "7920149448591331248",
					fees: {"lpFee":{"buyTokens":"2500000000000000","sellTokens":"2500000000000000","addLiquidity":"2500000000000000","removeLiquidity":"2500000000000000"},"stakingFee":{"buyTokens":"2500000000000000","sellTokens":"2500000000000000","addLiquidity":"2500000000000000","removeLiquidity":"2500000000000000"},"protocolFee":{"buyTokens":"5000000000000000","sellTokens":"5000000000000000","addLiquidity":"5000000000000000","removeLiquidity":"5000000000000000"}}

				}} parentSetters={{                                
					setNewLpIssuance: setNewLpIssuance,
					setNewReserve: setNewReserve}} wallet={null}/>
			</ChakraProvider>
		)
		const inputElement = getByTestId('you_pay')

		fireEvent.change(inputElement, {target:{value:'11'}})

		await waitFor(() => {
			expect(newLpIssuance.toString()).toBe(ethers.BigNumber.from('4081550214927526971').add(ethers.BigNumber.from('7920149448591331248')).toString())
			expect(newReserve).toBe(ethers.BigNumber.from('21131781542148949646').add(ethers.BigNumber.from('10890000000000000000')).toString())
		});
	});
});

