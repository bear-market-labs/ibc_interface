export function generateCurve(m: number, s: number, q: number, maxX: number, numPoints: number){
  let datapoints = [];
  for (let i = 1; i < maxX; i+=Math.floor(maxX/numPoints)){
    datapoints.push({x: i, y: m*Math.pow(s, q)})
  }

  return datapoints
}

export function amountToMint(reserveAmountIn: number, m: number, s: number, q: number){
  // formulate intergral expression
}

export function areaUnderBondingCurve(startSupply: number, endSupply: number, m: number, q: number){
  // perform definite integral, and return area under the curve
}

export function bondingCurveTwist(m: number, s: number, q: number, reserveAmountIn: number){
  // curve update, constrained by:
  // - same spot price
  // - same token supply
}