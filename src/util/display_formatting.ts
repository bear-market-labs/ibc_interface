
// numeric values and units should be fitted into 9 characters (ignoring decimal and space characters)
export function formatNumber(number: string, unit: string){
  const tickerLength = Math.min(unit.length, 5);
  let integerLength = parseInt(number).toString().length
  let num = parseFloat(number);

  if (isNaN(num)) {
      return `${number} ${unit}`;
  }

  if (num < 1000) {
      const numDecimals = 9 - tickerLength - integerLength
      const formattedNumber = num.toFixed(numDecimals);
      return `${Number(formattedNumber)} ${unit}`;
  } else if (num >= 1000 && num < 1e15) { 
      const units = ["", "K", "M", "B", "T"];
      let power = 0;
      while (num >= 1000) {
          num /= 1000;
          power++;
      }
      integerLength = parseInt(num.toString()).toString().length
      const numDecimals = 9 - tickerLength - integerLength - 1
      const formattedNumber = num.toFixed(numDecimals);
      return `${Number(formattedNumber)}${units[power]} ${unit}`;
  } else if (num < 1e100) {
      const decimalLength = 5 - tickerLength // can be 0, 1, 2
      const displayNumber = Number(Number(parseInt(num.toString()).toString().substring(0,3)) / 100).toFixed(decimalLength)
      const exponent = parseInt(num.toString()).toString().length - 1
      return `${displayNumber}E${exponent} ${unit}`;
  } else {
    const decimalLength = 4 - tickerLength // can be -1, 0, 1
    let displayNumber = Number(Number(parseInt(num.toString()).toString().substring(0,2)) / 10).toFixed(Math.max(decimalLength, 0))
    displayNumber = decimalLength === -1 ? `` : displayNumber
    return `${displayNumber}E99+ ${unit}`;
  }
}
