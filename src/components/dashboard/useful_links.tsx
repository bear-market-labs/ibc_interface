import { Box, Stack, Text, Link } from '@chakra-ui/react'
import { colors } from '../../config/style'

export default function UsefulLinks() {
	const links = [
		{ text: 'Gitbook Docs', link: '' },
		{ text: 'What is a Bonding Curve?', link: '' },
		{ text: 'What is an Inverse Bonding Curve?', link: '' },
		{ text: 'The IBC Token', link: '' },
		{ text: 'Math on Mint / Burn', link: '' },
		{ text: 'Math on Add / Remove Liquidity', link: '' },
		{ text: 'GitHub Repositories', link: '' },
	]
	return (
		<Stack textAlign='left'>
			<Text fontSize='sm' p='2' pl='7'>
				Useful Links
			</Text>
			<Stack>
				{links.map((link) => (
					<Box
						borderBottom={`0.5px ${colors.GRAYED_OUT_GRAY} solid`}
						pl='7'
						pb='5'
						pt='3'
					>
						<Link fontSize='lg'>{link.text}</Link>
					</Box>
				))}
			</Stack>
		</Stack>
	)
}
