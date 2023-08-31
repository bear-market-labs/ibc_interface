import { theme as chakraTheme } from '@chakra-ui/react';

const theme = {
    ...chakraTheme,

    styles: {
        global: {
          'html, body': {
            backgroundColor: '#111',
          },
      },
    },
    colors: {
        black: '#111',
        purple: '#682ABF'
    },
    fonts: {
        ...chakraTheme.fonts,
        body: `'roboto',Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`
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