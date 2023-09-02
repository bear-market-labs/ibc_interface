import { Box, Spinner } from '@chakra-ui/react'

export function DefaultSpinner() {
    return (
        <Box
            display='flex'
            justifyContent='center'
        >
            <Spinner
                size='xl'
                speed='0.7s'
                thickness='4px'
                label='processing...'
            />
        </Box>
    )
}
