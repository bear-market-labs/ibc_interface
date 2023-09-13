import { Grid, GridItem, Link, Show, Text } from "@chakra-ui/react";
import Logo from "../logo";

const MobileDisplay = () => (
	<Show below='sm'>
		<Grid minH='100vh' gridTemplateRows={"150px 1fr 150px 70px"} fontSize='sm'>
			<GridItem alignSelf={"flex-start"}>
				<Logo />
			</GridItem>
			<GridItem alignSelf={"center"} ml='7'>
				<Text align={"left"} mb='7'>
					This UI does not support mobile.
				</Text>
				<Text align={"left"}>Please revisit on a desktop.</Text>
			</GridItem>
			<GridItem ml='7'>
				<Link
					color={"#2087BA"}
					display={"flex"}
					href='https://github.com/bear-market-labs'
					isExternal
				>
					Or check out our docs
				</Link>
			</GridItem>
			<GridItem justifySelf={"flex-end"} mr='7'>
				<Link href='https://twitter.com/bearmarketlabs' isExternal>
					@bearmarketlabs
				</Link>
			</GridItem>
		</Grid>
	</Show>
);

export default MobileDisplay;
