import { extendTheme } from "@chakra-ui/react";
import "@fontsource-variable/roboto-mono";
import { mode } from "@chakra-ui/theme-tools";

const theme = extendTheme({
	styles: {
		global: (props:any) => ({
			body: {
				bg: mode("white", "#1C1931")(props),
			},
		}),
	},
	fonts: {
		body: `'Roboto Mono Variable',Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`,
	},
});

export default theme;
