import { ethers, BigNumber } from "ethers";

export const maxTickerLength = 5
export const targetNumCharacters = 9

// numeric values and units should be fitted into 9 characters (ignoring decimal and space characters)
export function formatNumber(number: string, unit: string, showUnit=true, prependIb=false){
  const tickerLength = Math.min(unit.length, maxTickerLength);
  let integerLength = parseInt(number).toString().length
  let num = parseFloat(number);
  const displayUnit = unit.length > maxTickerLength ? 'ASSET' : unit;

  // just passthru number if it's not a number (like NaN or Infinity)
  if (isNaN(num)) {
      return `${number} ${unit}`;
  }

  let retVal;

  if (num === 0){
    retVal = "0"
  } else if (num < 1e-9){
    console.log(number)
    const numDigits = targetNumCharacters - tickerLength - 4 // 4 for [0, ., E, -], can be 0, 1, 2
    let formattedNumber = numDigits === 0 ? `` : numDigits === 1 ? Number(number.split('.')[0]) : Number(number.split('.')[0]) + '.' + Number(number.split('.')[1].substring(0,1))
    let exponent = Number(number).toExponential().split('e')[1]
    retVal = formattedNumber + "E" + exponent.toString()
  }
  else if (num < 1e-3){
    const numDecimals = targetNumCharacters - tickerLength - 2 // 1 for the decimal, 1 for the leading integer 0
    const formattedNumber = num.toFixed(numDecimals)
    retVal = Number(formattedNumber)
  }else if (num < 1){
    retVal = num.toFixed(3)
  } else if (num < 1000) {
      const numDecimals = targetNumCharacters - tickerLength - integerLength
      const formattedNumber = num.toFixed(numDecimals);
      retVal = `${Number(formattedNumber)}`;
  } else if (num >= 1000 && num < 1e15) { 
      const units = ["", "K", "M", "B", "T"];
      let power = 0;
      while (num >= 1000) {
          num /= 1000;
          power++;
      }
      integerLength = parseInt(num.toString()).toString().length
      const numDecimals = Math.min(targetNumCharacters - tickerLength - integerLength - 1, 3)
      const formattedNumber = num.toFixed(numDecimals);
      retVal = `${Number(formattedNumber)}${units[power]}`;
  } else if (num < 1e100) {
      const decimalLength = Math.min(maxTickerLength - tickerLength, 2) // can be 0, 1, 2
      const displayNumber = Number(Number(number.substring(0,3)) / 100).toFixed(decimalLength)
      const exponent = number.toString().split('.')[0].length - 1
      retVal = `${displayNumber}E${exponent}`;
  } else {
    const decimalLength = Math.min(maxTickerLength - 1 - tickerLength, 1) // can be -1, 0, 1
    let displayNumber = Number(Number(parseInt(num.toString()).toString().substring(0,2)) / 10).toFixed(Math.max(decimalLength, 0))
    displayNumber = decimalLength === -1 ? `` : displayNumber
    retVal = `${displayNumber}E99+`;
  }

  return showUnit ? `${retVal} ${prependIb ? 'ib' : ''}${displayUnit}` : retVal
}

export function formatBalanceNumber(number: string){
  return Number(number).toFixed(2)
}

export function formatReceiveNumber(number: string){
  // "you receive" box always has sufficient space to assume smaller ticker length
  return formatNumber(number, "AAA", false)
}

export function formatPriceNumber(priceUnformatted: BigNumber, decimals: number, symbol: string, showSymbol=false){
  let priceNumeric = BigInt(priceUnformatted.toString());

  const exponent = priceNumeric.toString().length - decimals// can be negative
  const formattedSymbol = symbol.length > maxTickerLength ? 'ASSET' : symbol;

  if (priceUnformatted.eq(0)) {
    return showSymbol ? "0 " + formattedSymbol : "0"
  }else if (exponent <= -9){ 
    const numDigits = targetNumCharacters - Math.min(symbol.length, maxTickerLength) - 4 // 4 for [0, ., E, -], can be 0, 1, 2
    let formattedNumber = numDigits === 0 ? `` : Number(priceNumeric.toString().substring(0, numDigits)) / 10**(numDigits-1)
    return showSymbol ? formattedNumber + "E" + exponent.toString() + " " + formattedSymbol : formattedNumber + "E" + exponent.toString()
  } else if (exponent <= -3){
    let numSignificantZeros = Math.abs(exponent)
    let truncatedNumber = priceNumeric.toString().substring(0, 10 - numSignificantZeros)
    let formatttedNumber = '0.' + '0'.repeat(numSignificantZeros) + truncatedNumber
    return showSymbol ? formatttedNumber+ ' ' + formattedSymbol : formatttedNumber
  } else if (exponent <= 0) {
    return showSymbol ? Number(ethers.utils.formatUnits(priceUnformatted, decimals)).toFixed(3) + ' ' + formattedSymbol : Number(ethers.utils.formatUnits(priceUnformatted, decimals)).toFixed(3)
  }

  // default to > 1 handling
  return formatNumber(ethers.utils.formatUnits(priceUnformatted, decimals), symbol, showSymbol)
}

export function logBigInt(number: String){
  const numBigInt = BigInt(number.split('.')[0])
  const exponent = numBigInt.toString().length
  
  // log(huge_number) --> log(10**exponent * huge_number/10**exponent)
  // --> 10*log(exponent) + log(manageable_number)

  const logExponent = 10 * Math.log(exponent)
  const manageableNumber = Number(numBigInt / BigInt(10**exponent))
  const logManageableNumber = Math.log(manageableNumber)

  return logExponent + logManageableNumber
}