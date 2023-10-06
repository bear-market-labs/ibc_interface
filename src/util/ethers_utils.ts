import { arrayify, concat, defaultAbiCoder, hexlify, Interface, parseEther, solidityKeccak256 } from 'ethers/lib/utils'
import { multicallContinueOnErrorFlag } from '../config/constants'
import { contracts } from '../config/contracts'

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

export function getCallData(functionName: string, argTypes: string[], args: any[]){
  const functionDescriptorBytes = getFunctionDescriptorBytes(functionName, argTypes)
  const queryArgBytes = arrayify(defaultAbiCoder.encode(argTypes, args))
  return hexlify(concat([functionDescriptorBytes, queryArgBytes]))
}

export function composeQuery(contractAddress: string, functionName: string, argTypes: string[], args: any[]){
  const callDataBytes = getCallData(functionName, argTypes, args)

  const queryDetails = {
    to: contractAddress,
    data: callDataBytes,
  }

  return queryDetails
}

export function composeMulticallQuery(contractAddress: string, functionName: string, argTypes: string[], args: any[], continueOnError=multicallContinueOnErrorFlag){
  const callDataBytes = getCallData(functionName, argTypes, args)
  return [contractAddress, continueOnError, callDataBytes]
}