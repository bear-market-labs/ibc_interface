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

  if (num < 1000) {
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
  return Number(number).toFixed(3)
}