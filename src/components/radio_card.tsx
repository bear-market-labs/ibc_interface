import { Box, useRadio } from "@chakra-ui/react"
import { colors } from "../config/style"

export function RadioCard(props: any) {
    const { getInputProps, getCheckboxProps } = useRadio(props)

    const input = getInputProps()
    const checkbox = getCheckboxProps()

    return (
        <Box as='label'>
            <input {...input} />
            <Box
                {...checkbox}
                border='none'
                cursor='pointer'
                borderRadius='20px'
                _checked={{
                    color:'#2087BA'
                }}
                _focus={{
                    /*boxShadow: 'outline',*/
                }}
                _hover={{ }}
                px={5}
                py={2}
            >
                {props.children}
            </Box>
        </Box>
    )
}