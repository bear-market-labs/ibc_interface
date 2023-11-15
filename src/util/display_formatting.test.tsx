import { formatBalanceNumber, sanitizeNumberInput } from './display_formatting'

describe('formatBalanceNumber', () => {
	it('formats balance numbers wtih two decimal places with round up', () => {
		expect(formatBalanceNumber('1.23456')).toEqual('1.23')
		expect(formatBalanceNumber('1.23756')).toEqual('1.24')
		expect(formatBalanceNumber('1')).toEqual('1.00')
		expect(formatBalanceNumber('0')).toEqual('0.00')
		expect(formatBalanceNumber('1.23e+5')).toEqual('123000.00')
	})
})

describe('sanitizeNumberInput', () => {
	it('sanitize user number input', () => {
		expect(sanitizeNumberInput('5.5.5')).toEqual('5.55')
	})
})
