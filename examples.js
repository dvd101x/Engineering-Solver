const mathExamples = {
  '': ['', ''],
  'chemistry':
    `# Evaluate molar mass of Sulfuric Acid
sulfuricAcid = MM('H2SO4');
# Show the used formula
sulfuricAcid.formula

# Show the elements for that formula
sulfuricAcid.elements

# Show the total molar mass
sulfuricAcid.totalMass

# Show the molar mass for all Hydrogen atoms
sulfuricAcid.molecularMass.H

# Show the molar mass fraction of Oxygen
sulfuricAcid.fraction.O

H2SO4 = sulfuricAcid.totalMass;
# Calculate 2 moles of Sulfuric Acid
2 mol H2SO4

# Calculate 2 grams of Sulfuric Acid
2 g / H2SO4`
  ,
  'coolpropHigh':
    `# Based on http://www.coolprop.org/coolprop/HighLevelAPI.html#high-level-api

# Saturation temperature of Water at 1 atm in K
props('T','Water',{P:101325 Pa, Q:0})

# Saturated vapor enthalpy of Water at 1 atm in J/kg
H_V = props('H','Water',{P:101325 Pa,Q:1})

# Saturated liquid enthalpy of Water at 1 atm in J/kg
H_L = props('H','Water',{P:101325 Pa,Q:0})

# Latent heat of vaporization of Water at 1 atm in J/kg
H_V - H_L

# Get the density of Water at T = 461.1 K and P = 5.0e6 Pa, imposing the liquid phase
props('D','Water',{'T|liquid':461.1 K,P:5e6 Pa})

# Get the density of Water at T = 597.9 K and P = 5.0e6 Pa, imposing the gas phase
props('D','Water',{T:597.9 K, 'P|gas':5e6 Pa})

# You can call the props function directly using an empty object
props("Tcrit","Water",{})

# It can be useful to know what the phase of a given state point is
phase('Water', {P:101325 Pa, Q:0})

# The phase index (as floating point number) can also be obtained using the PropsSI function. In python you would do
props('Phase','Water',{P:101325 Pa,Q:0})

# c_p using c_p
props('C','Water',{P:101325 Pa,T:300 K})

# c_p using derivate
props('d(Hmass)/d(T)|P','Water',{P:101325 Pa,T:300 K})

# c_p using second partial derivative
props('d(d(Hmass)/d(T)|P)/d(Hmass)|P','Water',{P:101325 Pa,T:300 K})`
  ,
  'coolprop':
    `props('D','Water',{T:597.9 K,'P|gas':5e6 Pa})
D = [ ];H=[ ];T=[];
D[1] = props('D', 'CO2', {T:298.15 K, P:100e5 Pa})
H[1] = props('H', 'R134a', {T:298.15 K, Q:1})
H[2] = HAprops('H',{T:298.15 K, P:101325 Pa, R:0.5})
T[2] = HAprops('T',{P:101325 Pa, H:H[2], R:1.0})
T[2] = HAprops('T',{H:H[2], R:1.0, P:101325 Pa})`
  ,
  'objects':
    `# An object is enclosed by curly brackets {, } contains a set of comma separated key/value pairs.
# Keys and values are separated by a colon :
{a: 2 + 1, b: 4}
# Keys can be a symbol like prop or a string like "prop".
{"a": 2 + 1, "b": 4}

# An object can contain an object
{a: 2, b: {c: 3, d: 4}}

obj = {prop: 42}
# Object properties can be retrieved or replaced using dot notation or bracket notation.
obj.prop
obj["prop"]
id= "prop";
obj[id]
obj.prop = 43
obj["prop"]

# Objects can be used for operations like
car = {mass : 1000 kg, acceleration : 10 m/s^2}
car.force = car.mass*car.acceleration to N
car.force to lbf`,
  'matrices':
    `[1, 2, 3]
[[1, 2, 3], [4, 5, 6]]
[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
[1, 2, 3; 4, 5, 6]
zeros(3, 2)
ones(3) 
5 * ones(2, 2)
identity(2)
1:4
0:2:10

a = [1, 2; 3, 4]
b = zeros(2, 2)
c = 5:9
b[1, 1:2] = [5, 6]
b[2, :] = [7, 8]
d = a * b
d[2, 1]
d[2, 1:end]
c[end - 1 : -1 : 2]`,
  'units':
    `20 celsius in fahrenheit
90 km/h to m/s
number(5 cm, mm)
0.5kg + 33g
(12 seconds * 5) in minutes
sin(45 deg)
9.81 m/s^2 * 5 s to mi/h`,
  'strings':
    `"Hello"
a = concat("hello", " world")
size(a)
a[1:5]
a[1] = "H"
a[7:12] = "there!"
a
#String conversion
number("300")
string(300)`
  ,
  'basicUsage':
    `1.2 / (3.3 + 1.7)
a = 5.08 cm + 2 inch
a to inch
sin(90 deg)
f(x, y) = x ^ y;
f(2, 3)
round(e,3)
atan2(3,-3)
log(10000,10)
sqrt(-4)
derivative("x^2 +x","x")
pow([-1,2;3,1],2)
1.2 * (2 + 4.5)
12.7 cm to inch
sin(45 deg) ^ 2
9 / 3 + 2i
det([-1, 2; 3, 1])
sqrt(3^2 + 4^2)
2 inch to cm
cos(45 deg)
(2 == 3) == false
22e-3`,
  'refCycleWithRecuperator':
    `# Vapor compression cycle with recuperator (IHX)
fluid = 'R404a'
mDot = 281.1 kg/h

evap = {T: 7.2 degC, P_drop :7066 Pa, superHeating : 0.1 K};
cond = {T: 35 degC, P_drop: 0 Pa, subCooling : 0.1 K};
etaS = 0.75;
IHX = {epsilon : 0.8, thickness : 1 mm, cellSize : 10 mm, k : 230 W/(m K)};

# Define initial states
cycle = {T:[], P:[], D:[], H:[], S:[]};

# Define low and high pressure
"P_low"
P_low = props('P',fluid,{'T':evap.T,'Q':1})
"P high"
P_high = props('P',fluid,{'T':cond.T, 'Q':0})

# 4 to 1 Evaporation
cycle.P[1] = P_low;
cycle.T[1] = evap.T+ evap.superHeating;
cycle.D[1] = props('D',fluid,{'T':cycle.T[1],'P':cycle.P[1]});
cycle.H[1] = props('H',fluid,{'T':cycle.T[1],'P':cycle.P[1]});
cycle.S[1] = props('S',fluid,{'T':cycle.T[1],'P':cycle.P[1]});

# 1 to 2 IHX low
cycle.P[2] = cycle.P[1];
cycle.T[4] = cond.T-cond.subCooling;
H_eta = props('H',fluid,{'T':cycle.T[4],'P':cycle.P[2]});
cycle.H[2] = IHX.epsilon*(H_eta-cycle.H[1])+cycle.H[1];

cycle.T[2] = props('T',fluid,{'P':cycle.P[2],'H':cycle.H[2]});
cycle.D[2] = props('D',fluid,{'P':cycle.P[2],'H':cycle.H[2]});
cycle.S[2] = props('S',fluid,{'P':cycle.P[2],'H':cycle.H[2]});

# 2 to 3 Compression
cycle.P[3] = P_high;
H_i = props('H',fluid,{'P':cycle.P[3],'S':cycle.S[2]});
cycle.H[3] = (H_i-cycle.H[2])/etaS + cycle.H[2];
cycle.T[3] = props('T',fluid,{'P':cycle.P[3],'H':cycle.H[3]});
cycle.D[3] = props('D',fluid,{'P':cycle.P[3],'H':cycle.H[3]});
cycle.S[3] = props('S',fluid,{'P':cycle.P[3],'H':cycle.H[3]});

# 3 to 4 Condensation
cycle.P[4] = cycle.P[3]-cond.P_drop;
cycle.D[4] = props('D',fluid,{'P':cycle.P[4],'T':cycle.T[4]});
cycle.H[4] = props('H',fluid,{'P':cycle.P[4],'T':cycle.T[4]});
cycle.S[4] = props('S',fluid,{'P':cycle.P[4],'T':cycle.T[4]});

# 4 to 5 IHX high
cycle.H[5] = cycle.H[1]-cycle.H[2]+cycle.H[4];
cycle.P[5] = cycle.P[4];
cycle.T[5] = props('T',fluid,{'P':cycle.P[5],'H':cycle.H[5]});
cycle.D[5] = props('D',fluid,{'P':cycle.P[5],'H':cycle.H[5]});
cycle.S[5] = props('S',fluid,{'P':cycle.P[5],'H':cycle.H[5]});

# 5 to 6 Expansion
cycle.H[6] = cycle.H[5];
cycle.P[6] = cycle.P[1]-evap.P_drop;
cycle.T[6] = props('T',fluid,{'P':cycle.P[6],'H':cycle.H[6]});
cycle.D[6] = props('D',fluid,{'P':cycle.P[6],'H':cycle.H[6]});
cycle.S[6] = props('S',fluid,{'P':cycle.P[6],'H':cycle.H[6]});

# Display results
"Compressor's power:"
W_comp = mDot*(cycle.H[3]-cycle.H[2])
"Condenser heat out:"
Q_h = mDot*(cycle.H[4]-cycle.H[3])
"Recuperator heat exchange:"
Q_IHX = mDot*(cycle.H[2]-cycle.H[1])
"Evaporator heat in:"
Q_c = mDot*(cycle.H[1]-cycle.H[6])

IHX.T = [cycle.T[1],cycle.T[2],cycle.T[3],cycle.T[4]];

deltaA = IHX.T[3]-IHX.T[2];
deltaB = IHX.T[4]-IHX.T[1];

IHX.LMTD = (deltaA-deltaB)/log(deltaA/deltaB)
IHX.U = IHX.k/IHX.thickness;
IHX.A = Q_IHX/(IHX.U*IHX.LMTD)
IHX.cellVol = IHX.cellSize^3;
cellSizeToAreaFactor = 3.8424;
IHX.cellArea = cellSizeToAreaFactor*IHX.cellSize^2;
"Recuprator's Volume"
IHX.Volume = IHX.A*IHX.cellVol/IHX.cellArea to mm^3

"Evap COP with recuperator"
evap_COP = Q_c/W_comp
"Cond COP"
cond_COP = Q_h/W_comp

H_i_w = props('H', fluid,{ 'P': cycle.P[3], 'S': cycle.S[1]});
H_w = (H_i_w-cycle.H[1])/etaS + cycle.H[1];
qNoIHX = cycle.H[1]-cycle.H[4];
wNoIHX = H_w-cycle.H[1];
"COP without recuperator"
noIHX_COP = qNoIHX/wNoIHX
"Improvement with recuperator"
evap_COP/noIHX_COP`
  ,
  'VaporCompressionCycle':
    `# Vapor Compression Cycle
fluid = 'R134a'
mDot  = 1 kg/minute

evap  = {T: -20 degC, P_drop: 0 Pa, superHeating: 10 K}
cond  = {T:  40 degC, P_drop: 0 Pa, subCooling  : 10 K}
etaS  = 0.75

# Define an array of empty states as objects
c = [{},{},{},{}];

# Short function to get fluid properties
p(DesiredProperty, FluidState) = props(DesiredProperty, fluid, FluidState);

# Define low and high pressure
pLow  = p('P', {T: evap.T, Q: 100%});
pHigh = p('P', {T: cond.T, Q: 0%  });

# 4 to 1 Evaporation
c[1].P = pLow;
c[1].T = evap.T+ evap.superHeating;
c[1].D = p('D', c[1]);
c[1].H = p('H', c[1]);
c[1].S = p('S', c[1]);

# 1 to 2 Compression of vapor
c[2].P = pHigh;
H_i    = p('H',{P:c[2].P, S:c[1].S});
c[2].H = (H_i-c[1].H)/etaS + c[1].H;
c[2].T = p('T', c[2]);
c[2].D = p('D', c[2]);
c[2].S = p('S', c[2]);


# 2 to 3 Condensation
c[3].P = c[2].P - cond.P_drop;
c[3].T = cond.T-cond.subCooling;
c[3].D = p('D', c[3]);
c[3].H = p('H', c[3]);
c[3].S = p('S', c[3]);

# 3 to 4 Expansion
c[4].H = c[3].H;
c[4].P = c[1].P - evap.P_drop;
c[4].T = p('T', c[4]);
c[4].D = p('D', c[4]);
c[4].S = p('S', c[4]);


# Work, Energy and Performance
W_comp   = mDot*(c[2].H - c[1].H);
Q_h      = mDot*(c[2].H - c[3].H);
Q_c      = mDot*(c[1].H - c[4].H);

evap_COP = Q_c/W_comp;
cond_COP = Q_h/W_comp;

# Display results

print('Compressor power   : $0 \\t$1\\t$2', W_comp to [W, BTU/h, TR], 4)
print('Condenser heat out : $0 \\t$1\\t$2', Q_h    to [W, BTU/h, TR], 4)
print('Evaporator heat in : $0 \\t$1\\t$2', Q_c    to [W, BTU/h, TR], 4)

print('COP(cooling)       : $0', [evap_COP], 3)
print('COP(heating)       : $0', [cond_COP], 3)`
}

function insertExampleFunc(ID) {
  const mathExampleCode = mathExamples[ID];
  editor.navigateFileEnd()
  editor.insert('\n' + mathExampleCode)
}
