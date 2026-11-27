import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'coolprop-wasm'
import { math } from '../mathInstance.js'
import { createFluidFunctions } from '../fluidProperties.js'
import { MM } from '../molecularMass.js'

const CoolProp = await Module()
const { props, HAprops, phase } = createFluidFunctions(math, CoolProp)
const closeTo = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`)
}

test('fluid properties preserve unit conversion and saturation calculations', () => {
  const enthalpy = props('H', 'R134a', { T: math.unit(25, 'degC'), Q: 1 })
  closeTo(enthalpy.toNumber('J/kg'), 412333.95323186804)
  const criticalTemperature = props('Tcrit', 'Water', {})
  closeTo(criticalTemperature.toNumber('K'), 647.096, 1e-3)
})

test('humid air properties preserve unit conversion', () => {
  const enthalpy = HAprops('H', {
    T: math.unit(25, 'degC'),
    P: math.unit(1, 'atm'),
    R: math.evaluate('50 %')
  })
  closeTo(enthalpy.toNumber('J/kg'), 50423.45039075701)
})

test('phase and molecular mass remain available', () => {
  assert.equal(phase('Water', { P: math.unit(1, 'atm'), Q: 0 }), 'twophase')
  closeTo(MM('H2O').totalMass.toNumber('g/mol'), 18.01528)
})
