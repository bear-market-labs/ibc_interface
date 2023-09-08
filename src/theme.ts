import { extendTheme } from "@chakra-ui/react";
import "@fontsource-variable/roboto-mono";
import { mode } from "@chakra-ui/theme-tools";
import { colors } from "./config/style";

const config = {
	initialColorMode: 'dark',
	useSystemColorMode: false,
}

const theme = extendTheme({
	config,
	components: {
		Button: {
			baseStyle: {
				borderRadius: '5px'
			},
			sizes: {
				md: {
					h: '60px',
					w: '200px'
				}
			},
			variants: {
				solid: {
					bg: '#DDE2EA',
					color: '#1C1931'
				},
				outline: {
					border: '1px solid #DDE2EA',
				}
			},
		}
	},
	styles: {
		global: (props: any) => ({
			body: {
				bg: mode("#DDE2EA", "#1C1931")(props),
				color: mode("#1C1931", "#DDE2EA")(props),
			},
		}),
	},
	fonts: {
		body: `'Roboto Mono Variable',Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`,
	},
});

export default theme;
