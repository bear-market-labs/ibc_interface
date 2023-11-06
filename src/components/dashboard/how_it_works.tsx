import {
	Box,
	Button,
	Heading,
	Stack,
	Text,
	Link,
	List,
	ListIcon,
	ListItem,
} from '@chakra-ui/react'
import { BsDash } from 'react-icons/bs'

export default function HowItWorks() {
	const ibc_holder_stakes = [
		'Mints ibAssets by providing reserve assets (e.g. ETH) to the IBC.',
		'Their position value increases as more ibAssets are burnt following the mint.',
		'Their position value decreases as more ibAssets are minted following the mint.',
		'Mints and burns incur a fee, distributed to ibAsset stakers and LPs.',
		'Staked ibAssets accrue prorated fees from mints and burns and LP adds and removals.',
		'Later entrants can acquire a higher stake of fees as their mint price is lower.',
	]

	const liquidity_providers = [
		'Provides additional reserve assets (e.g. ETH) to improve the IBC’s market liquidity.',
		'Their position value increases as the price deviates from the price at the time of LP.',
		'LPs can maintain only one position per account / address at any given time.',
		'LPs must close their previous position in full before modifying their position size.',
		'Adding and removing liquidity incur a fee, distributed to ibAsset stakers and LPs.',
		'LPs accrue prorated fees from mints and burns and LP adds and removals.',
		'LPs may be required to provide or receive additional IBC in order for LP removal.',
	]

	const curve_initializers = [
		'Creates new ibAssets for promising reserve assets.',
		'Curve initializers can be the early users of a new ibAsset, including LPing.',
		'Provides the initial reserves for a new ibAsset and receives a LP position.',
		'A small fee is taken from the provided initial reserves.',
	]

	return (
		<Stack spacing='8' fontSize='md' textAlign='left' p='7' fontWeight='normal'>
			<Text>
				The inverse bonding curve (IBC) implementation mints assets that devalue
				as bought and appreciate as sold. Tokens minted via IBCs, ibAssets, are
				the first asset class in history to follow the exact inverse of regular
				market dynamics. Arbitrage forces ibAssets to devalue per every
				purchase, regardless of where the purchase was made (CEX, Uniswap, etc.
				).
			</Text>
			<Text as='b'>
				The distinctive properties of IBCs allow for the creation of DeFi
				mechanisms previously unthought of, one of which is an oracle-free
				derivatives protocol{' '}
				<Link href='https://exponents.fi/'>https://exponents.fi/</Link>
				.
			</Text>
			<Text>
				The purpose of the IBC implementation is to increase awareness and
				understandings of this new primitive, helping to spark DeFi innovations
				that leverage its features.
			</Text>
			<Box>
				<Heading as='h5' size='m'>
					IBC Holders / Stakers
				</Heading>
				<List>
					{ibc_holder_stakes.map((stake, i) => (
						<ListItem key={i}>
							<ListIcon as={BsDash} />
							{stake}
						</ListItem>
					))}
				</List>
			</Box>
			<Box>
				<Heading as='h5' size='m'>
					Liquidity Providers (LPs)
				</Heading>
				<List>
					{liquidity_providers.map((stake, i) => (
						<ListItem key={i}>
							<ListIcon as={BsDash} />
							{stake}
						</ListItem>
					))}
				</List>
			</Box>
			<Box>
				<Heading as='h5' size='m'>
					Curve Initializers
				</Heading>
				<List>
					{curve_initializers.map((stake, i) => (
						<ListItem key={i}>
							<ListIcon as={BsDash} />
							{stake}
						</ListItem>
					))}
				</List>
			</Box>
			<Stack direction='row' spacing='7' mt='10'>
				<Link w='60%' href='https://docs.inversebondingcurve.com/' isExternal>
					<Button w='100%'>Read the docs for more in-depth details</Button>
				</Link>
				<Link w='30%' href='https://x.com/bearmarketlabs' isExternal>
					<Button w='100%' variant={'outline'}>
						Or follow us on X
					</Button>
				</Link>
			</Stack>
		</Stack>
	)
}
