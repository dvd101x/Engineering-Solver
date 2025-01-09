const atom = { H: 1.00794, He: 4.0026, Li: 6.941, Be: 9.01218, B: 10.811, C: 12.011, N: 14.0067, O: 15.9994, F: 18.9984, Ne: 20.1797, Na: 22.98977, Mg: 24.305, Al: 26.98154, Si: 28.0855, P: 30.97376, S: 32.066, Cl: 35.4527, Ar: 39.948, K: 39.0983, Ca: 40.078, Sc: 44.9559, Ti: 47.88, V: 50.9415, Cr: 51.996, Mn: 54.938, Fe: 55.847, Co: 58.9332, Ni: 58.6934, Cu: 63.546, Zn: 65.39, Ga: 69.723, Ge: 72.61, As: 74.9216, Se: 78.96, Br: 79.904, Kr: 83.8, Rb: 85.4678, Sr: 87.62, Y: 88.9059, Zr: 91.224, Nb: 92.9064, Mo: 95.94, Tc: 98, Ru: 101.07, Rh: 102.9055, Pd: 106.42, Ag: 107.868, Cd: 112.41, In: 114.82, Sn: 118.71, Sb: 121.757, Te: 127.6, I: 126.9045, Xe: 131.29, Cs: 132.9054, Ba: 137.33, La: 138.9055, Hf: 178.49, Ta: 180.9479, W: 183.85, Re: 186.207, Os: 190.2, Ir: 192.22, Pt: 195.08, Au: 196.9665, Hg: 200.59, Tl: 204.383, Pb: 207.2, Bi: 208.9804, Po: 209, At: 210, Rn: 222, Fr: 223, Ra: 226.0254, Ac: 227, Rf: 261, Db: 262, Sg: 263, Bh: 262, Hs: 265, Mt: 266, Uun: 269, Uuu: 272, Uub: 277, Ce: 140.12, Pr: 140.9077, Nd: 144.24, Pm: 145, Sm: 150.36, Eu: 151.965, Gd: 157.25, Tb: 158.9253, Dy: 162.5, Ho: 164.9303, Er: 167.26, Tm: 168.9342, Yb: 173.04, Lu: 174.967, Th: 232.0381, Pa: 231.0359, U: 238.029, Np: 237.0482, Pu: 244, Am: 243, Cm: 247, Bk: 247, Cf: 251, Es: 252, Fm: 257, Md: 258, No: 259, Lr: 262 }

function addMolecules(molecA, molecB, molecBqty) {
  for (let [elem, atoms] of Object.entries(molecB)) {
    molecA[elem] ? molecA[elem] += molecBqty * atoms : molecA[elem] = molecBqty * atoms
  }
  return molecA
}

function chemEval(formula) {
  const element = /[A-Z][a-z]{0,2}/
  const numberAfterElement = /\d+$/
  let molec = {}
  const chemArray = formula.match(/[A-Z][a-z]*\d*/g)
  chemArray.forEach(x => {
    const ele = x.match(element)[0]
    const elemNumMatch = x.match(numberAfterElement)
    const atoms = elemNumMatch ? parseInt(elemNumMatch[0]) : 1
    const elem = {}
    elem[ele] = atoms
    molec = addMolecules(molec, elem, 1)
  })
  return molec
}

function MM(formula) {
  // Creates an object with properties of the molecule specified by the chemical formula
  const elementAndNumber = /[A-Z][a-z]{0,2}\d*/
  const element = /[A-Z][a-z]{0,2}/
  const numberAfterElement = /\d+$/
  const simpleFormula = /^([A-Z][a-z]{0,2}\d*)+/
  const validFormula = /([A-Z][a-z]{0,2}\d*)+|\(|\)\d*|\.\d*([A-Z][a-z]{0,2}\d*)+/g
  const formulaAfterDot = /\.\d*([A-Z][a-z]{0,2}\d*)+/
  const closingParenthesis = /^\)\d*$/
  const openingParenthesis = /^\($/
  const chemArray = formula.match(validFormula)//splits string into valid values

  let ele = ""
  let elmass = [{}]
  let level = 0
  let atoms = 0
  let parenNum = 0
  let multiplier = 0
  let total = null
  let numMatch = null

  formula = formula.replace(/\s/g, '');
  chemArray.forEach(x => {
    if (simpleFormula.test(x)) {
      elmass[level] = addMolecules(elmass[level], chemEval(x), 1)
    }
    else if (openingParenthesis.test(x)) {
      elmass[++level] = {}
    }
    else if (closingParenthesis.test(x)) {
      numMatch = x.match(/\d+$/)
      multiplier = numMatch ? parseInt(numMatch[0]) : 1
      elmass[level - 1] = addMolecules(elmass[level - 1], elmass[level], multiplier)
      elmass[level--] = null
    }
    else if (formulaAfterDot.test(x)) {
      numMatch = x.match(/\.(\d+)[A-Z]/)
      multiplier = numMatch ? parseInt(numMatch[1]) : 1
      elmass[level] = addMolecules(elmass[level], chemEval(x), multiplier)
    }
  })

  let molecularMass = {}

  for (let [ele, atoms] of Object.entries(elmass[0])) {
    molecularMass[ele] = math.unit(atom[ele] * atoms, 'g/mol')
    total = total ? math.add(total, molecularMass[ele]) : molecularMass[ele]
  }
  let fraction = {}
  for (let [ele, atoms] of Object.entries(elmass[0])) {
    fraction[ele] = math.divide(molecularMass[ele], total)
  }

  return { elements: elmass[0], totalMass: total, formula: chemArray.join(''), fraction: fraction, molecularMass: molecularMass }
}