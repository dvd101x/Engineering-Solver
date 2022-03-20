// List of units from coolprop
const propUnit = {
  '': '',
  DELTA: '',
  Delta: '',
  DMOLAR: 'mol/m^3',
  Dmolar: 'mol/m^3',
  D: 'kg/m^3',
  DMASS: 'kg/m^3',
  Dmass: 'kg/m^3',
  HMOLAR: 'J/mol',
  Hmolar: 'J/mol',
  H: 'J/kg',
  HMASS: 'J/kg',
  Hmass: 'J/kg',
  P: 'Pa',
  Q: '',
  SMOLAR: 'J/mol/K',
  Smolar: 'J/mol/K',
  S: 'J/kg/K',
  SMASS: 'J/kg/K',
  Smass: 'J/kg/K',
  TAU: '',
  Tau: '',
  T: 'K',
  UMOLAR: 'J/mol',
  Umolar: 'J/mol',
  U: 'J/kg',
  UMASS: 'J/kg',
  Umass: 'J/kg',
  ACENTRIC: '',
  acentric: '',
  ALPHA0: '',
  alpha0: '',
  ALPHAR: '',
  alphar: '',
  A: 'm/s',
  SPEED_OF_SOUND: 'm/s',
  speed_of_sound: 'm/s',
  BVIRIAL: '',
  Bvirial: '',
  CONDUCTIVITY: 'W/m/K',
  L: 'W/m/K',
  conductivity: 'W/m/K',
  CP0MASS: 'J/kg/K',
  Cp0mass: 'J/kg/K',
  CP0MOLAR: 'J/mol/K',
  Cp0molar: 'J/mol/K',
  CPMOLAR: 'J/mol/K',
  Cpmolar: 'J/mol/K',
  CVIRIAL: '',
  Cvirial: '',
  CVMASS: 'J/kg/K',
  Cvmass: 'J/kg/K',
  O: 'J/kg/K',
  CVMOLAR: 'J/mol/K',
  Cvmolar: 'J/mol/K',
  C: 'J/kg/K',
  CPMASS: 'J/kg/K',
  Cpmass: 'J/kg/K',
  DALPHA0_DDELTA_CONSTTAU: '',
  dalpha0_ddelta_consttau: '',
  DALPHA0_DTAU_CONSTDELTA: '',
  dalpha0_dtau_constdelta: '',
  DALPHAR_DDELTA_CONSTTAU: '',
  dalphar_ddelta_consttau: '',
  DALPHAR_DTAU_CONSTDELTA: '',
  dalphar_dtau_constdelta: '',
  DBVIRIAL_DT: '',
  dBvirial_dT: '',
  DCVIRIAL_DT: '',
  dCvirial_dT: '',
  DIPOLE_MOMENT: 'C m',
  dipole_moment: 'C m',
  FH: '',
  FRACTION_MAX: '',
  fraction_max: '',
  FRACTION_MIN: '',
  fraction_min: '',
  FUNDAMENTAL_DERIVATIVE_OF_GAS_DYNAMICS: '',
  fundamental_derivative_of_gas_dynamics: '',
  GAS_CONSTANT: 'J/mol/K',
  gas_constant: 'J/mol/K',
  GMOLAR_RESIDUAL: 'J/mol/K',
  Gmolar_residual: 'J/mol/K',
  GMOLAR: 'J/mol',
  Gmolar: 'J/mol',
  GWP100: '',
  GWP20: '',
  GWP500: '',
  G: 'J/kg',
  GMASS: 'J/kg',
  Gmass: 'J/kg',
  HELMHOLTZMASS: 'J/kg',
  Helmholtzmass: 'J/kg',
  HELMHOLTZMOLAR: 'J/mol',
  Helmholtzmolar: 'J/mol',
  HH: '',
  HMOLAR_RESIDUAL: 'J/mol/K',
  Hmolar_residual: 'J/mol/K',
  ISENTROPIC_EXPANSION_COEFFICIENT: '',
  isentropic_expansion_coefficient: '',
  ISOBARIC_EXPANSION_COEFFICIENT: '1/K',
  isobaric_expansion_coefficient: '1/K',
  ISOTHERMAL_COMPRESSIBILITY: '1/Pa',
  isothermal_compressibility: '1/Pa',
  I: 'N/m',
  SURFACE_TENSION: 'N/m',
  surface_tension: 'N/m',
  M: 'kg/mol',
  MOLARMASS: 'kg/mol',
  MOLAR_MASS: 'kg/mol',
  MOLEMASS: 'kg/mol',
  molar_mass: 'kg/mol',
  molarmass: 'kg/mol',
  molemass: 'kg/mol',
  ODP: '',
  PCRIT: 'Pa',
  P_CRITICAL: 'Pa',
  Pcrit: 'Pa',
  p_critical: 'Pa',
  pcrit: 'Pa',
  PHASE: '',
  Phase: '',
  PH: '',
  PIP: '',
  PMAX: 'Pa',
  P_MAX: 'Pa',
  P_max: 'Pa',
  pmax: 'Pa',
  PMIN: 'Pa',
  P_MIN: 'Pa',
  P_min: 'Pa',
  pmin: 'Pa',
  PRANDTL: '',
  Prandtl: '',
  PTRIPLE: 'Pa',
  P_TRIPLE: 'Pa',
  p_triple: 'Pa',
  ptriple: 'Pa',
  P_REDUCING: 'Pa',
  p_reducing: 'Pa',
  RHOCRIT: 'kg/m^3',
  RHOMASS_CRITICAL: 'kg/m^3',
  rhocrit: 'kg/m^3',
  rhomass_critical: 'kg/m^3',
  RHOMASS_REDUCING: 'kg/m^3',
  rhomass_reducing: 'kg/m^3',
  RHOMOLAR_CRITICAL: 'mol/m^3',
  rhomolar_critical: 'mol/m^3',
  RHOMOLAR_REDUCING: 'mol/m^3',
  rhomolar_reducing: 'mol/m^3',
  SMOLAR_RESIDUAL: 'J/mol/K',
  Smolar_residual: 'J/mol/K',
  TCRIT: 'K',
  T_CRITICAL: 'K',
  T_critical: 'K',
  Tcrit: 'K',
  TMAX: 'K',
  T_MAX: 'K',
  T_max: 'K',
  Tmax: 'K',
  TMIN: 'K',
  T_MIN: 'K',
  T_min: 'K',
  Tmin: 'K',
  TTRIPLE: 'K',
  T_TRIPLE: 'K',
  T_triple: 'K',
  Ttriple: 'K',
  T_FREEZE: 'K',
  T_freeze: 'K',
  T_REDUCING: 'K',
  T_reducing: 'K',
  V: 'Pa s',
  VISCOSITY: 'Pa s',
  viscosity: 'Pa s',
  Z: ''
}
const HApropUnit = {
  B: 'K',
  Twb: 'K',
  T_wb: 'K',
  WetBulb: 'K',
  C: 'J/kg/K',
  cp: 'J/kg/K',
  Cha: 'J/kg/K',
  cp_ha: 'J/kg/K',
  CV: 'J/kg/K',
  CVha: 'J/kg/K',
  cv_ha: 'J/kg/K',
  D: 'K',
  Tdp: 'K',
  DewPoint: 'K',
  T_dp: 'K',
  H: 'J/kg',
  Hda: 'J/kg',
  Enthalpy: 'J/kg',
  Hha: 'J/kg',
  K: 'W/m/K',
  k: 'W/m/K',
  Conductivity: 'W/m/K',
  M: 'Pa s',
  Visc: 'Pa s',
  mu: 'Pa s',
  psi_w: '',
  Y: '',
  P: 'Pa',
  P_w: 'Pa',
  R: '',
  RH: '',
  RelHum: '',
  S: 'J/kg/K',
  Sda: 'J/kg/K',
  Entropy: 'J/kg/K',
  Sha: 'J/kg/K',
  T: 'K',
  Tdb: 'K',
  T_db: 'K',
  V: 'm^3/kg',
  Vda: 'm^3/kg',
  Vha: 'm^3/kg',
  W: '',
  Omega: '',
  HumRat: '',
  Z: ''
}

const phases = ['liquid', 'supercritical', 'supercritical_gas', 'supercritical_liquid', 'critical_point', 'gas', 'twophase',
  'unknown', 'not_imposed']

//Calls coolprop with it's inputs, with the numeric value it needs

function subProp(prop) {
  // If the propertie is like 'T|liquid' returns only T
  return prop.includes('|') ? prop.substring(0, prop.indexOf('|')) : prop
}

function calcPropUnits(prop) {
  //Checks for partial derivatives, checks all the peroperties between parenthesis to identify if it's a derivative or second partial derivative by checking the number of variables between parenthesis, and creates a string of units. Partial derivative is in the form "d(Hmass)/d(T)|P" and a second partial derivative will get the form "d(d(Hmass)/d(T)|P)/d(Hmass)|P"

  if (prop.includes('|')) {
    let listProp = prop.match(/\(\w+?\)/g).map(str => str.slice(1, -1))
    if (listProp.length == 2) {
      return `(${propUnit[listProp[0]]})/(${propUnit[listProp[1]]})`
    }
    else if (listProp.length == 3) {
      return `(${propUnit[listProp[0]]})/(${propUnit[listProp[1]]} ${propUnit[listProp[2]]})`
    }
  }
  else {
    return propUnit[prop]
  }
}

// This is created only bacuse math.number(value,'') is not valid as '' can't be the unit
toValue = (v, u) => u ? math.number(v, u) : math.number(v)
// This is crate only becous math.unit(value,'') is not valid as '' can't be the unit
toUnit = (v, u) => u ? math.unit(v, u) : math.unit(v)

function props(desiredProperty, fluidName, fluidProperties) {
  const calcPropUnit = calcPropUnits(desiredProperty)
  let prop  = Object.keys(fluidProperties).slice(0,2)
  let value = Object.values(fluidProperties).slice(0,2)
  
  if (prop.length > 0) {
    const units = [propUnit[subProp(prop[0])], propUnit[subProp(prop[1])]]
    value = [toValue(value[0], units[0]), toValue(value[1], units[1])]
  }
  else {
    prop = ["", ""]
    value = [0, 0]
  }

  const calcValue = Module.PropsSI(desiredProperty,
    prop[0], value[0],
    prop[1], value[1],
    fluidName)

  return toUnit(calcValue, calcPropUnit)
}

function HAprops(calcProp, fluidProperties) {
  const calcPropUnit = HApropUnit[calcProp]
  const arrayProperties = Object.entries(fluidProperties)

  const prop = [arrayProperties[0][0],
  arrayProperties[1][0],
  arrayProperties[2][0]]

  const units = [HApropUnit[prop[0]],
  HApropUnit[prop[1]],
  HApropUnit[prop[2]]]

  const value = [toValue(arrayProperties[0][1], units[0]),
  toValue(arrayProperties[1][1], units[1]),
  toValue(arrayProperties[2][1], units[2])]

  const calcValue = Module.HAPropsSI(calcProp,
    prop[0], value[0],
    prop[1], value[1],
    prop[2], value[2])

  return toUnit(calcValue, calcPropUnit)
}

function phase(fluid, fluidProperties) {
  return phases[props('Phase',
    fluid,
    fluidProperties)]
}