import { BigNumber } from 'ethers'

export function generateCurve(p0: number, x: number, s0: number, r0: number, maxX: number, numPoints: number){
  let datapoints = [];
  const m = p0 * Math.pow(1/s0, p0*s0/r0)
  const q = p0*s0/r0 - 1

  for (let i = 1; i < maxX; i+=Math.floor(maxX/numPoints)){
    datapoints.push({x: i, y: m*Math.pow(i, q)})
  }

  return datapoints
}

export function generateCurve2(m: BigNumber, k: BigNumber, x: BigNumber, maxX: BigNumber, numPoints: number){
  let datapoints = [];

  const xIncrement = maxX.div(BigNumber.from(numPoints)).toNumber()

  for (let i = 0; i < numPoints; i++){
    const currX = BigNumber.from(i * xIncrement)
    datapoints.push({x: currX, y: m.mul(currX.pow(k))})
  }

  return datapoints
}

export function price(s: number, p0: number, r0: number, s0: number){
  const m = p0 * Math.pow(1/s0, p0*s0/r0)
  const q = p0*s0/r0 - 1

  return m * Math.pow(s, q)
}

export function price2(m: BigNumber, k: BigNumber, s: BigNumber){
  return m.div(s.pow(k))
}

export function amountToMint(reserveAmountIn: number, p0: number, x: number, s0: number, r0: number){
  // formulate intergral expression
  const m = p0 * Math.pow(1/s0, p0*s0/r0)
  const q = p0*s0/r0 - 1

  const q_1 = p0*s0/r0
  const m_1 = m * q_1

  const integralAtStartSupply = m_1 * Math.pow(x, q_1)
  const integralAtEndSupply = reserveAmountIn + integralAtStartSupply

  // F(end) - F(start) = R
  // F(end) = R + F(start)
  // end**q_1 = (R + F(start)) / m_1
  // ln(end) = (1 / q_1) * ln((R + F(start)) / m_1)
  // end = exp( (1 / q_1) * ln(F(end) / m_1) )

  return  Math.exp(1/q_1 * Math.log(integralAtEndSupply / m_1)) - x
}

export function amountToMint2(reserveAmountIn: BigNumber, m: BigNumber, k: BigNumber, x: BigNumber){
  // formulate intergral expression
  //const m = p0 * Math.pow(1/s0, p0*s0/r0)
  //const q = p0*s0/r0 - 1

  const k_1 = k.sub(1)
  const m_1 = m.mul(k_1)

  const integralAtStartSupply = m_1.div(x.pow(k_1))
  const integralAtEndSupply = reserveAmountIn.add(integralAtStartSupply)

  // F(end) - F(start) = R
  // F(end) = R + F(start)
  // end**q_1 = (R + F(start)) / m_1
  // end = (F(end) / m_1) ** (1/q_1)

  return  (integralAtEndSupply.div(m_1)).pow(BigNumber.from(1).div(k_1)).sub(x)
}

export function areaUnderBondingCurve(startSupply: number, endSupply: number, p0: number, s0: number, r0: number){
  // perform definite integral, and return area under the curve
  const m = p0 * Math.pow(1/s0, p0*s0/r0)
  const q = p0*s0/r0 - 1

  const q_1 = p0*s0/r0
  const m_1 = m * q_1

  const integralAtStartSupply = m_1 * Math.pow(startSupply, q_1)
  const integralAtEndSupply = m_1 * Math.pow(endSupply, q_1)

  return integralAtEndSupply - integralAtStartSupply
}

export function areaUnderBondingCurve2(startSupply: BigNumber, endSupply: BigNumber, m: BigNumber, k: BigNumber){
  // perform definite integral, and return area under the curve

  const k_1 = k.sub(1)
  const m_1 = m.mul(k_1)

  const integralAtStartSupply = m_1.mul(startSupply.pow(k_1))
  const integralAtEndSupply = m_1.mul(endSupply.pow(k_1))

  return integralAtEndSupply.sub(integralAtStartSupply)
}

export function claimableLpYield(globalIndex: number, userIndex: number, userAccruedYield: number, userLpAmount: number){
  return userLpAmount * (globalIndex - userIndex) + userAccruedYield
}