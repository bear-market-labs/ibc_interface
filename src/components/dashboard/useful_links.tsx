import { Box, Stack, Link } from '@chakra-ui/react'
import { colors } from '../../config/style'

export default function UsefulLinks() {
	const links = [
		{
			text: 'Gitbook Docs',
			address: 'https://docs.inversebondingcurve.com/',
			isExternal: true,
		},
		{ text: 'What is a Bonding Curve?', address: '', isExternal: false },
		{
			text: 'What is an Inverse Bonding Curve?',
			address: '',
			isExternal: false,
		},
		{ text: 'What are ibAssets?', address: '', isExternal: false },
		{ text: 'Math on Mint / Burn', address: '', isExternal: false },
		{ text: 'Math on Add / Remove Liquidity', address: '', isExternal: false },
		{ text: 'GitHub Repositories', address: '', isExternal: true },
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
