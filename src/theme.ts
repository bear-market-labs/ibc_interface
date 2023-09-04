import { extendTheme } from "@chakra-ui/react";
import "@fontsource-variable/roboto-mono";
import { mode } from "@chakra-ui/theme-tools";

const config = {
	initialColorMode: 'dark',
	useSystemColorMode: false,
  }
  
const theme = extendTheme({
	config,
	styles: {
		global: (props:any) => ({
			body: {
				bg: mode("#DDE2EA", "#1C1931")(props),
				color: mode("#1C1931","#DDE2EA")(props)
			},
		}),
	},
	fonts: {
		body: `'Roboto Mono Variable',Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`,
	},
});

export default theme;
