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
					bg: colors.WHITE,
					color: colors.ROYAL
				},
				outline: {
					border: `1px solid ${colors.WHITE}`,
				}
			},
		},
		Tabs: {
			baseStyle: {
				tab: {
					_selected: {
						color: colors.TEAL
					}
				},
				tablist: {
					color: colors.GRAYED_OUT_GRAY,
				}
			}

		}
	},
	styles: {
		global: (props: any) => ({
			body: {
				bg: mode(colors.WHITE, colors.ROYAL)(props),
				color: mode(colors.ROYAL, colors.WHITE)(props),
			},
		}),
	},
	fonts: {
		body: `'Roboto Mono Variable',Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`,
	},
	breakpoints: {
		sm: "30em",
		md: "48em",
		lg: "62em",
		xl: "80em",
		"2xl": "96em",
		"3xl": "128em",
	},
});

export default theme;
