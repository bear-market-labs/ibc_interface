import { Box, Stack, Link } from '@chakra-ui/react'
import { colors } from '../../config/style'

export default function UsefulLinks() {
	const links = [
		{
			text: 'Gitbook Docs',
			address: 'https://docs.inversebondingcurve.com/',
			isExternal: true,
		},
		{ text: 'What is a Bonding Curve?', address: 'https://docs.inversebondingcurve.com/concepts-and-protocol/bonding-curves', isExternal: false },
		{
			text: 'What is an Inverse Bonding Curve?',
			address: 'https://docs.inversebondingcurve.com/concepts-and-protocol/inverse-bonding-curves-ibcs',
			isExternal: false,
		},
		{ text: 'What are ibAssets?', address: 'https://docs.inversebondingcurve.com/concepts-and-protocol/inverse-bonded-assets-ibassets', isExternal: false },
		{ text: 'Math on Mint / Burn', address: 'https://docs.inversebondingcurve.com/concepts-and-protocol/minting-burning', isExternal: false },
		{ text: 'Math on Add / Remove Liquidity', address: 'https://docs.inversebondingcurve.com/concepts-and-protocol/liquidity-providing', isExternal: false },
		{ text: 'GitHub Repositories', address: 'https://github.com/bear-market-labs', isExternal: true },
	]
	return (
		<Stack textAlign='left'>
			<Stack>
				{links.map((link, i) => (
					<Box
						borderBottom={`0.5px ${colors.GRAYED_OUT_GRAY} solid`}
						ml='-9'
						mr='-9'
						pl='7'
						pb='5'
						pt='3'
						key={i}
					>
						<Link
							fontSize='lg'
							href={link.address}
							isExternal={link.isExternal}
						>
							{link.text}
						</Link>
					</Box>
				))}
			</Stack>
		</Stack>
	)
}
