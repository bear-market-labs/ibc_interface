import { arrayify, concat, defaultAbiCoder, hexlify, Interface, parseEther, solidityKeccak256 } from 'ethers/lib/utils'
import { bigOne, multicallContinueOnErrorFlag } from '../config/constants'
import { BigNumber } from "ethers";
import { BigNumber as bignumber } from "bignumber.js"

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

export function convertToHigherDecimals(num: BigNumber, fromDecimals: number, toDecimals: number){
  const toDecimalsInt = Number(toDecimals.toFixed(0))
  const fromDecimalsInt = Number(fromDecimals.toFixed(0))
  
  if (toDecimalsInt < fromDecimalsInt){
    throw Error(`toDecimals, ${toDecimals}, must be larger than fromDecimals, ${fromDecimals}`)
  } 

  return num.mul(BigNumber.from(10**(toDecimalsInt-fromDecimalsInt)))
}

export function computeSquareRoot(num: BigNumber){
  // ethersjs does not support roots
  // we will use bignumber.js for this; arbitrary roots, if needed, would likely require newton-raphson

  const sqrt = bignumber(num.toString()).sqrt()
  return BigNumber.from(sqrt.toFixed(0))
}

// uses bignumber.js to replicate ethers.utils.formatUnits, w/o the over/underflow error
export function formatUnitsBnJs(num: BigNumber, decimals: number){
  const decimalsInt = Number(decimals.toFixed(0))

  const decFormatted = bignumber(num.toString()).div(bignumber(10**decimals))

  return decFormatted.toFixed(decimals)
}

export function mulPercent(numA: BigNumber, percentAsDecimal: number){
  const result = bignumber(percentAsDecimal).multipliedBy(bignumber(numA.toString()))
  return BigNumber.from(result.toFixed(0))
}