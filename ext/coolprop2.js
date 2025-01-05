import init from './coolprop.wasm?init'

let Module;

const initialize = async () => {
    Module = await init();
}

export const HApropsSI = async (...args) => {
    if (!Module) await initialize();
    return Module.HApropsSI(...args);
};

export const PropsSI = async (...args) => {
    if (!Module) await initialize();
    return Module.PropsSI(...args);
};

// Initialize the module immediately
initialize();