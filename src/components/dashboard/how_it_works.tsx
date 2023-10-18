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
		'Their position value increases as more IBC tokens are burnt following the mint.',
		'Their position value decreases as more IBC tokens are minted following the mint.',
		'Mints and burns incur a fee, distributed to IBC stakers and LPs.',
		'Staked IBC accrues prorated fees from mints and burns and LP adds and removals.',
		'Later entrants can acquire a higher stake of fees as their mint price is lower.',
	]

	const liquidity_providers = [
		'Their position value increases as the price deviates from the price at the time of LP.',
		'LPs can maintain only one position per account / address at any given time.',
		'LPs must close their previous position in full before modifying their position size.',
		'Adding and removing liquidity incur a fee, distributed to IBC stakers and LPs.',
		'LPs accrue prorated fees from mints and burns and LP adds and removals.',
		'LPs may be required to provide or receive additional IBC in order for LP removal.',
	]

	return (
		<Stack spacing='7' fontSize='md' textAlign='left' p='7'>
			<Text>
				The inverse bonding curve implementation is the first demonstration of
				inverse bonding curves; used for minting assets that devalue as bought
				and rise in value as sold. The token minted via the inverse bonding
				curve implementation, IBC, is the first asset in history that follows
				the exact inverse of regular market dynamics.
			</Text>
			<Text>
				Inverse bonding curves are a brand new DeFi primitive derived from
				bonding curves. The pricing algorithm enforced by the inverse bonding
				curve shows various unique traits, one of them being its arbitrage
				characteristics. Arbitrage of IBC forces IBC to devalue per every
				purchase, regardless of where the purchase was made (CEX, Uniswap, etc.
				). Altogether, these distinctive properties of inverse bonding curves
				allow for the creation of DeFi mechanisms previous unthought of,
				including but not limited to an oracle-free derivatives protocol [link
				to be added].
			</Text>
			<Text>
				The purpose of the inverse bonding curve implementation is to increase
				awareness and understanding of this new primitive, which will help spark
				DeFi innovations that leverage its features.
			</Text>
			<Box>
				<Heading as='h5' size='sm'>
					Basic Protocol Functions
				</Heading>
				<Text>
					Two participant types power the inverse bonding curve implementation:
					IBC Minters / Stakers and Liquidity Providers (LPs). IBC can be minted
					by providing reserve assets (ETH) to the inverse bonding curve, from
					which new IBC tokens are minted into existence and given to the
					minter. LPs can provide additional ETH to improve the market liquidity
					of the inverse bonding curve.
				</Text>
			</Box>

			<Text>Each participant contains the following characteristics: </Text>

			<Box>
				<Heading as='h5' size='sm'>
					IBC Holders / Stakers
				</Heading>
				<List>
					{ibc_holder_stakes.map((stake) => (
						<ListItem>
							<ListIcon as={BsDash} />
							{stake}
						</ListItem>
					))}
				</List>
			</Box>
			<Box>
				<Heading as='h5' size='sm'>
					Liquidity Providers (LPs)
				</Heading>
				<List>
					{liquidity_providers.map((stake) => (
						<ListItem>
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
