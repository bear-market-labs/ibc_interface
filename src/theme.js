import { theme as chakraTheme } from '@chakra-ui/react';
import '@fontsource-variable/roboto-mono';

const theme = {
    ...chakraTheme,

    fonts: {
        ...chakraTheme.fonts,
        body: `'Roboto Mono Variable',Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`
    },
    fontWeights: {
        normal: 400,
        medium: 600,
        bold: 700
    },
    icons: {
        ...chakraTheme.icons
    }
};

export default theme;