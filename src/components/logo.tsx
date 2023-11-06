import { Box, Text } from "@chakra-ui/react";

const Logo = () => (
	<Box
		textShadow='0px 4px 4px rgba(0, 0, 0, 0.25)'
		ml={7}
		mt={7}
		textAlign='left'
		fontSize='xl'
		letterSpacing='-0.36px'
		lineHeight='25px'
		fontWeight='400'
	>
		<Text>INVERSE</Text>
		<Text>BONDING</Text>
		<Text>CURVE</Text>
	</Box>
);

export default Logo;
