import { symbolWye } from "d3";

export const maxTickerLength = 5
export const targetNumCharacters = 9

// numeric values and units should be fitted into 9 characters (ignoring decimal and space characters)
export function formatNumber(number: string, unit: string, showUnit=true){
  const tickerLength = Math.min(unit.length, maxTickerLength);
  let integerLength = parseInt(number).toString().length
  let num = parseFloat(number);
  const displayUnit = unit.length > maxTickerLength ? 'ASSET' : unit;

  // just passthru number if it's not a number (like NaN or Infinity)
  if (isNaN(num)) {
      return `${number} ${unit}`;
  }

  let retVal;

  if (num < 1){
    const numDecimals = targetNumCharacters - tickerLength - 2 // 1 for the decimal, 1 for the leading integer 0
    const formattedNumber = num.toFixed(numDecimals)
    retVal = Number(formattedNumber)
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
      const displayNumber = Number(Number(parseInt(num.toString()).toString().substring(0,3)) / 100).toFixed(decimalLength)
      const exponent = parseInt(num.toString()).toString().length - 1
      retVal = `${displayNumber}E${exponent}`;
  } else {
    const decimalLength = Math.min(maxTickerLength - 1 - tickerLength, 1) // can be -1, 0, 1
    let displayNumber = Number(Number(parseInt(num.toString()).toString().substring(0,2)) / 10).toFixed(Math.max(decimalLength, 0))
    displayNumber = decimalLength === -1 ? `` : displayNumber
    retVal = `${displayNumber}E99+`;
  }

  return showUnit ? `${retVal} ${displayUnit}` : retVal
}

export function formatBalanceNumber(number: string){
  return Number(number).toFixed(2)
}

export function formatReceiveNumber(number: string){
  // "you receive" box always has sufficient space to assume smaller ticker length
  return formatNumber(number, "AAA", false)
}

export function formatPriceNumber(number: string, symbol: string, showSymbol=false){
  let num = parseFloat(number);
  const formattedSymbol = symbol.length > maxTickerLength ? 'ASSET' : symbol;

  // three special cases for values under 1
  if (num > 0 && num < 1){
    const exponent = Number(num.toExponential().split('e')[1]) // includes negative sign
    
    if (exponent <= -9){
      const numDecimals = targetNumCharacters - Math.min(symbol.length, maxTickerLength) - 4 // 4 for [0, ., E, -]
      let formattedNumber = num.toExponential(numDecimals).toUpperCase()
      return showSymbol ? formattedNumber + formattedSymbol : formattedNumber
    } else if (exponent <= -3){
      //javascript behavior at underflow is to roundup
      //we'll multiply this by 10**10, and manually construct the number string
      let magnifiedNumber = parseInt((num * 1e9).toString())
      let numSignificantZeros = 9 - magnifiedNumber.toString().length
      let formatttedNumber = '0.' + '0'.repeat(numSignificantZeros) + magnifiedNumber
      return showSymbol ? formatttedNumber+ ' ' + formattedSymbol : formatttedNumber
    } else {
      return showSymbol ? num.toFixed(3) + ' ' + formattedSymbol : num.toFixed(3)
    }
  }
  
  // default to > 1 handling
  return formatNumber(number, symbol, showSymbol)
}