const mathExamples = {
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
    String.raw`# # Vapor compression cycle with recuperator(IHX)
fluid = 'R404a';
mDot = 233 lb / h;

#Evaporator
evap = {
    T: 25 degF,
    P_drop: 1.93 psi,
    superHeating: 10 degF
};

cond = {
    T: 95 degF,
    P_drop: 0 Pa,
    subCooling: 2.5 K
};

etaS = 0.75;

IHX = {
    epsilon: 0.9,
    thickness: 1 mm,
    cellSize: 10 mm,
    k: 230 W/ (m K)
};

#Define initial states
cycle = [{}, {}, {}, {}, {}, {}];

#Define the fluid function
p(prop, state) = props(prop, fluid, state);

#Define low and high pressure
# P_low
P_low = p('P', { 'T|gas': evap.T, Q: 1 })
# P high
P_high = p('P', { 'T|liquid': cond.T, Q: 0 })

#4 to 1 Evaporation
cycle[1].P = P_low;
cycle[1].T = evap.T + evap.superHeating;

cycle[1].D = p('D', {"T|gas":cycle[1].T, P:cycle[1].P});
cycle[1].H = p('H', {"T|gas":cycle[1].T, P:cycle[1].P});
cycle[1].S = p('S', {"T|gas":cycle[1].T, P:cycle[1].P});

#1 to 2 IHX low
cycle[2].P = cycle[1].P;
cycle[4].T = cond.T - cond.subCooling;
H_eta = p('H', { 'T': cycle[4].T, 'P': cycle[2].P });

cycle[2].H = IHX.epsilon * (H_eta - cycle[1].H) + cycle[1].H;
cycle[2].T = p('T', cycle[2]);
cycle[2].D = p('D', cycle[2]);
cycle[2].S = p('S', cycle[2]);

#2 to 3 Compression
cycle[3].P = P_high + cond.P_drop;
H_i = p('H', { 'P': cycle[3].P, 'S': cycle[2].S });
cycle[3].H = (H_i - cycle[2].H) / etaS + cycle[2].H;
cycle[3].T = p('T', cycle[3]);
cycle[3].D = p('D', cycle[3]);
cycle[3].S = p('S', cycle[3]);

#3 to 4 Condensation
cycle[4].P = P_high;
cycle[4].D = p('D', {"T|liquid":cycle[4].T, P:cycle[4].P});
cycle[4].H = p('H', {"T|liquid":cycle[4].T, P:cycle[4].P});
cycle[4].S = p('S', {"T|liquid":cycle[4].T, P:cycle[4].P});

#4 to 5 IHX high
cycle[5].H = cycle[1].H - cycle[2].H + cycle[4].H;
cycle[5].P = cycle[4].P;
cycle[5].T = p('T', cycle[5]);
cycle[5].D = p('D', cycle[5]);
cycle[5].S = p('S', cycle[5]);

#5 to 6 Expansion
cycle[6].H = cycle[5].H;
cycle[6].P = cycle[1].P + evap.P_drop;
cycle[6].T = p('T', cycle[6]);
cycle[6].D = p('D', cycle[6]);
cycle[6].S = p('S', cycle[6]);

# Display results
# Compressor's power:
W_comp = mDot * (cycle[3].H - cycle[2].H)
# Condenser heat out:
Q_h = mDot * (cycle[4].H - cycle[3].H)
# Recuperator heat exchange:
Q_IHX = mDot * (cycle[2].H - cycle[1].H)
# Evaporator heat in:
Q_c = mDot * (cycle[1].H - cycle[6].H)
IHX.T = [cycle[1].T, cycle[2].T, cycle[3].T, cycle[4].T];
deltaA = IHX.T[3] - IHX.T[2];
deltaB = IHX.T[4] - IHX.T[1];
IHX.LMTD = (deltaA - deltaB) / log(deltaA / deltaB)
IHX.U = IHX.k / IHX.thickness;
IHX.A = Q_IHX / (IHX.U * IHX.LMTD)
IHX.cellVol = IHX.cellSize ^ 3;
cellSizeToAreaFactor = 3.8424;
IHX.cellArea = cellSizeToAreaFactor * IHX.cellSize ^ 2;

# Recuprator's Volume
IHX.Volume = IHX.A * IHX.cellVol / IHX.cellArea to mm ^ 3

# Side of a IHX Cube
IHX.Volume ^ (1 / 3)

# Evap COP with recuperator
evap_COP = Q_c / W_comp

cond_COP = Q_h / W_comp;
H_i_w = p('H', { 'P': cycle[3].P, 'S': cycle[1].S });
H_w = (H_i_w - cycle[1].H) / etaS + cycle[1].H;
qNoIHX = cycle[1].H - cycle[4].H;
wNoIHX = H_w - cycle[1].H;

# Evap COP without recuperator
noIHX_COP = qNoIHX / wNoIHX

# Improvement Factor $\frac{evap_{COP}}{noIHX_{COP}}$
improvementFactor = evap_COP / noIHX_COP

# Improvement with recuperator
print("$1 %", [(improvementFactor - 1) * 100], 3)

#Prepare plots
t_crit = p('Tcrit', {});
layout = {yaxis:{type:"log"}};
enthalpy = map(cycle, _(x) = number(x.H, 'J/kg'));
pressure = map(cycle, _(x) = number(x.P, 'Pa'));
temperatures = concat(((evap.T to K) - 5 K) : 3 K: t_crit, [t_crit]);
liquidP = map(temperatures, _(t)=number(p('P',  {"T|liquid":t, Q:0%}),'Pa'));
liquidH = map(temperatures, _(t)=number(p('H',  {"T|liquid":t, Q:0%}),'J/kg'));
gasP = map(temperatures, _(t)=number(p('P',  {"T|gas":t, Q:100%}),'Pa'));
gasH = map(temperatures, _(t)=number(p('H',  {"T|gas":t, Q:100%}),'J/kg'));

plot([
  {
    x: concat(enthalpy, [enthalpy[1]]),
    y: concat(pressure, [pressure[1]]),
    name:'cycle'
  },{
    x: liquidH, y:liquidP, name:'liquid'
  },{
    x: gasH, y:gasP, name:'gas'
  }],
  layout
)`,
  VaporCompressionCycle:String.raw`# # Vapor Compression Cycle

# ## Fluid input
fluid = 'R134a'
mDot  = 1 kg/minute

# ## Components input
# Evaporator
evap  = {T: -20 degC, P_drop: 0 Pa, superHeating: 10 K}
# Condenser
cond  = {T:  40 degC, P_drop: 0 Pa, subCooling  : 10 K}
# Compressor
etaS  = 0.75

#Define an array of empty states as objects
c = [{},{},{},{}];

#Short function to get fluid properties
p(DesiredProperty, FluidState) = props(DesiredProperty, fluid, FluidState);
  
#Define low and high pressure
pLow  = p('P', {'T|gas': evap.T, Q: 100%});
pHigh = p('P', {'T|liquid': cond.T, Q: 0%  });

t_crit = p('Tcrit', {});

#4 to 1 Evaporation
c[1].P = pLow;
c[1].T = evap.T+ evap.superHeating;
c[1].D = p('D', {'T|gas':c[1].T, P:c[1].P});
c[1].H = p('H', {'T|gas':c[1].T, P:c[1].P});
c[1].S = p('S', {'T|gas':c[1].T, P:c[1].P});

#1 to 2 Compression of vapor
c[2].P = pHigh + cond.P_drop;
H_i    = p('H',{P:c[2].P, S:c[1].S});
c[2].H = (H_i-c[1].H)/etaS + c[1].H;
c[2].T = p('T', c[2]);
c[2].D = p('D', c[2]);
c[2].S = p('S', c[2]);

#2 to 3 Condensation
c[3].P = pHigh;
c[3].T = cond.T-cond.subCooling;
c[3].D = p('D', {'T|liquid':c[3].T, P:c[3].P});
c[3].H = p('H', {'T|liquid':c[3].T, P:c[3].P});
c[3].S = p('S', {'T|liquid':c[3].T, P:c[3].P});

#3 to 4 Expansion
c[4].H = c[3].H;
c[4].P = c[1].P + evap.P_drop;
c[4].T = p('T', c[4]);
c[4].D = p('D', c[4]);
c[4].S = p('S', c[4]);

#Work, Energy and Performance
W_comp   = mDot*(c[2].H - c[1].H);
Q_h      = mDot*(c[2].H - c[3].H);
Q_c      = mDot*(c[1].H - c[4].H);

evap_COP = Q_c/W_comp;
cond_COP = Q_h/W_comp;

# ## Work and Energy

print('Compressor power   : $1 \t$2\t$3', W_comp to [W, BTU/h, TR], 4)
print('Condenser heat out : $1 \t$2\t$3', Q_h    to [W, BTU/h, TR], 4)
print('Evaporator heat in : $1 \t$2\t$3', Q_c    to [W, BTU/h, TR], 4)

print('COP(cooling)       : $1', [evap_COP], 3)
print('COP(heating)       : $1', [cond_COP], 3)
  
layout = {yaxis:{type:"log"}};
enthalpy = map(c, _(x) = number(x.H, 'J/kg'));
pressure = map(c, _(x) = number(x.P, 'Pa'));
temperatures = concat(((evap.T to K) - 5 K) : 3 K: t_crit, [t_crit]);
liquidP = map(temperatures, _(t)=number(p('P',  {"T|liquid":t, Q:0%}),'Pa'));
liquidH = map(temperatures, _(t)=number(p('H',  {"T|liquid":t, Q:0%}),'J/kg'));
gasP = map(temperatures, _(t)=number(p('P',  {"T|gas":t, Q:100%}),'Pa'));
gasH = map(temperatures, _(t)=number(p('H',  {"T|gas":t, Q:100%}),'J/kg'));


plot([
  {
    x: concat(enthalpy, [enthalpy[1]]),
    y: concat(pressure, [pressure[1]]),
    name:'cycle'
  },{
    x: liquidH, y:liquidP, name:'liquid'
  },{
    x: gasH, y:gasP, name:'gas'
  }],
  layout
)`,
  odeSolver: String.raw`# # Rocket Trajectory Optimization
# 
# > **reference:** [mathjs](https://mathjs.org/examples/browser/rocket_trajectory_optimization.html)
# Define initial values
G = gravitationConstant # Gravitational constant
mbody = 5.9724e24 kg    # Mass of Earth
mu = G * mbody          # Standard gravitational parameter
g0 = gravity            # Standard gravity: used for calculating propellant consumption (dmdt)
r0 = 6371 km            # Mean radius of Earth
t0 = 0 s                # Simulation start
dt = 0.5 s              # Simulation timestep
t_stage1 = 149.5 s      # Simulation duration
isp_sea = 282 s         # Specific impulse (at sea level)
isp_vac = 311 s         # Specific impulse (in vacuum)
gamma0 = 89.99970 deg   # Initial pitch angle (90 deg is vertical)
v0 = 0.9 m/s          # Initial velocity (must be non-zero because ODE is ill-conditioned)
phi0 = 0 deg            # Initial orbital reference angle
m1 = 433100 kg          # First stage mass
m2 = 111500 kg          # Second stage mass
m3 = 1700 kg            # Third stage / fairing mass
mp = 5000 kg            # Payload mass
m0 = m1+m2+m3+mp        # Initial mass of rocket
dm = 2750 kg/s          # Mass flow rate
A = (3.66 m)^2 * pi     # Area of the rocket
dragCoef = 0.2          # Drag coefficient
method = "euler"        # [euler, rk2, ralston, rk4]

# Define the equations of motion. We just thrust into current direction of motion, e.g. making a gravity turn.
gravity(r) = mu / r.^2
angVel(r, v, gamma) = v/r * cos(gamma) * rad                          # Angular velocity of rocket around moon
density(r) = 1.2250 kg/m^3 * exp(-g0 * (r - r0) / (83246.8 m^2/s^2))  # Assume constant temperature
drag(r, v) = 1/2 * density(r) .* v.^2 * A * dragCoef

# pressure ~ density for constant temperature
isp(r) = isp_vac + (isp_sea - isp_vac) * density(r)/density(r0)
thrust(r) = g0 * isp(r) * dm

# It is important to maintain the same argument order for each of these functions.
drdt(v, gamma) = v sin(gamma)
dvdt(r, v, m, gamma) = - gravity(r) * sin(gamma) + (thrust(r) - drag(r, v)) / m
dmdt() = - dm
dphidt(r, v, gamma) = angVel(r, v, gamma)
dgammadt(r, v, gamma) = angVel(r, v, gamma) - gravity(r) * cos(gamma) / v * rad
dydt(t, y) = [
  drdt(y[2], y[5]),
  dvdt(y[1], y[2], y[3], y[5]),
  dmdt(),
  dphidt(y[1], y[2], y[5]),
  dgammadt(y[1], y[2], y[5])
]

# Remember to maintain the same variable order in the call to ndsolve.
x = [r0, v0, m0, phi0, gamma0]
result_stage1 = solveODE(dydt, [t0, t_stage1, dt], x, method)

# Reset initial conditions for interstage flight
dm = 0 kg/s
t_interstage = t_stage1 + 10 s
x = flatten(result_stage1.y[end,:])
x[3] = m2+m3+mp   # New mass after stage seperation
result_interstage = solveODE(dydt, [t_stage1, t_interstage, dt], x, method)

# Reset initial conditions for stage 2 flight
dm = 270.8 kg/s
isp_vac = 348 s
t_stage2 = t_interstage + 350 s
x = flatten(result_interstage.y[end,:])
result_stage2 = solveODE(dydt, [t_interstage, t_stage2, dt], x, method)

# Reset initial conditions for unpowered flight
dm = 0 kg / s
t_unpowered1 = t_stage2 + 900 s
dt = 10 s
x = flatten(result_stage2.y[end,:])
result_unpowered1 = solveODE(dydt, [t_stage2, t_unpowered1, dt], x, method)

# Reset initial conditions for final orbit insertion
dm = 270.8 kg / s
t_insertion = t_unpowered1 + 39 s
dt = 0.5 s
x = flatten(result_unpowered1.y[end,:])
result_insertion = solveODE(dydt, [t_unpowered1, t_insertion, dt], x, method)

# Reset initial conditions for unpowered flight
dm = 0 kg / s
t_unpowered2 = t_insertion + 250 s
dt = 10 s
x = flatten(result_insertion.y[end,:])
result_unpowered2 = solveODE(dydt, [t_insertion, t_unpowered2, dt], x, method)`,
quadraticFormula: String.raw`# # Quadratic Formula
# 
# In algebra, a quadratic equation is any equation that can be rearranged in standard form as
# 
# $$ ax^{2}+bx+c=0 $$
# 
# The quadratic formula is
# 
# $$ x=\frac {-b \pm \sqrt {b^{2}-4ac}}{2a} $$

a = 1;
b = 5;
c = 3;
x = (-b + [1,-1] sqrt(b^2-4 a c)) / (2 a);
print('With a = $a, b=$b, and c=$c', {a:a, b:b, c:c})
print('x has two solutions $0 and $1', x, 4) 

# ## Proof

proof = a x.^2 + b x + c;
print('Using x = $1 we get $2', [x[1], proof[1]], 4)
print('Using x = $1 we get $2', [x[2], proof[2]], 4)`,
simplePlot:String.raw`# Plot

x=0:pi/8: 4*pi;

plot([
  {x:x, y:sin(x), name:"sin"},
  {x:x, y:atan(x), name:"atan"}
])`,
plot3D:String.raw`# 3d plot

data = [
    {
        type: "isosurface",
        x: [0,0,0,0,1,1,1,1],
        y: [0,1,0,1,0,1,0,1],
        z: [1,1,0,0,1,1,0,0],
        value: 1:8,
        isomin: 2,
        isomax: 6,
        colorscale: "Reds"
    }
]

plot(data)`,
statPlot:String.raw`# Statistical plots

y0 = random([50]);
y1 = random([50])+1;

trace1 = {
  y: y0,
  type: 'box',
  name:'y0'
};

trace2 = {
  y: y1,
  type: 'box',
  name: 'y1'
};

data = [trace1, trace2];

plot(data)`,
lorenz:String.raw`# # Lorenz attractor

# Define the functions
# $$
# {\displaystyle {\begin{aligned}{\frac {\mathrm {d} x}{\mathrm {d} t}}&=\sigma (y-x),\\[6pt]{\frac {\mathrm {d} y}{\mathrm {d} t}}&=x(\rho -z)-y,\\[6pt]{\frac {\mathrm {d} z}{\mathrm {d} t}}&=xy-\beta z.\end{aligned}}}
# $$

#| u is [x, y, z]
sigma = 10;
beta = 2.7;
rho = 28;

lorenz(t, u) = 
  [
    sigma * (u[2] - u[1]),
    u[1] * (rho - u[3]) - u[2],
    u[1] * u[2] - beta * u[3]
  ];

sol = solveODE(lorenz, [0, 100], [1, 1, 1]);

diff = diff(sol.t);
color = concat([diff[1]], diff, 1);

plot(
 [{
    x: flatten(sol.y[:,1]),
    y: flatten(sol.y[:,2]),
    z: flatten(sol.y[:,3]),
    line:{color:color, colorscale:"Jet"},
    type: "scatter3d",
    mode: "lines"
}])
`
}

// To get a new examples use editor.state.doc.toString().replace(/\r?\n/g,'\n').split('\n')

export function insertExampleFunc(ID) {
  return Array.isArray(mathExamples[ID]) ? mathExamples[ID].join("\n") : mathExamples[ID];
}
