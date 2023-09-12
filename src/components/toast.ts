import { createStandaloneToast } from '@chakra-ui/react'
const { toast } = createStandaloneToast()

type props={
    id:any;
    title:any;
    description:any
    status:any;
    duration:any;
    isClosable:any;
}

export function Toast(props: props) {
    const { id, title, description, status, duration, isClosable } = props
    if(id){
        if (!toast.isActive(id)) {
            toast({
                id: id,
                title: title,
                description: description,
                status: status,
                duration: duration,
                isClosable: isClosable,
                position: "top-right",
            })
        }
    }else{
        toast({
            title: title,
            description: description,
            status: status,
            duration: duration,
            isClosable: isClosable,
            position: "top-right",
        })
    }
}