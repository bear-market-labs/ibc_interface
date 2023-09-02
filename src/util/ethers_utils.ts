import { arrayify, concat, defaultAbiCoder, hexlify, Interface, parseEther, solidityKeccak256 } from 'ethers/lib/utils'

export function getFunctionDescriptorBytes(functionName: string, argTypes: string[]){
  const functionDescriptorBytes = arrayify(solidityKeccak256(
    [
      "string"
    ]
    ,
    [
      functionName + "(" + argTypes.join(',') + ")" // put function signature here w/ types + no spaces, ex: createPair(address,address)
    ]
  )).slice(0,4)

  return functionDescriptorBytes
}

export function composeQuery(contractAddress: string, functionName: string, argTypes: string[], args: any[]){
  const functionDescriptorBytes = getFunctionDescriptorBytes(functionName, argTypes)
  const queryArgBytes = arrayify(defaultAbiCoder.encode(argTypes, args))

  const queryDetails = {
    to: contractAddress,
    data: hexlify(concat([functionDescriptorBytes, queryArgBytes]))
  }

  return queryDetails
}