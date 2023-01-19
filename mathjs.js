"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var MatlabHighlightRules = function() {

var keywords = (
        "to|in|and|not|or|xor|mod"
    );

    var builtinConstants = (
        // Universal constants
        "speedOfLight|gravitationConstant|planckConstant|reducedPlanckConstant" +
        
        // Electromagnetic constants
        "magneticConstant|electricConstant|vacuumImpedance|coulomb|elementaryCharge|bohrMagneton|conductanceQuantum|inverseConductanceQuantum|magneticFluxQuantum|nuclearMagneton|klitzing" +
        
        //Atomic and nuclear constants
        "bohrRadius|classicalElectronRadius|electronMass|fermiCoupling|fineStructure|hartreeEnergy|protonMass|deuteronMass|neutronMass|quantumOfCirculation|rydberg|thomsonCrossSection|weakMixingAngle|efimovFactor" +
        
        //Physico-chemical constants
        "atomicMass|avogadro|boltzmann|faraday|firstRadiation|loschmidt|gasConstant|molarPlanckConstant|molarVolume|sackurTetrode|secondRadiation|stefanBoltzmann|wienDisplacement" +
        //Adopted Values
        "molarMass|molarMassC12|gravity|atm" +
        //Natural Units
        "planckLength|planckMass|planckTime|planckCharge|planckTemperature"
    );

    var builtinFunctions = ("compile|evaluate|help|parser|derivative|leafCount|lsolve|lsolveAll|lup|lusolve|qr|rationalize|resolve|simplify|simplifyConstant|simplifyCore|slu|symbolicEqual|usolve|usolveAll|abs|add|cbrt|ceil|cube|divide|dotDivide|dotMultiply|dotPow|exp|expm1|fix|floor|gcd|hypot|invmod|lcm|log|log10|log1p|log2|mod|multiply|norm|nthRoot|nthRoots|pow|round|sign|sqrt|square|subtract|unaryMinus|unaryPlus|xgcd|bitAnd|bitNot|bitOr|bitXor|leftShift|rightArithShift|rightLogShift|bellNumbers|catalan|composition|stirlingS2|arg|conj|im|re|distance|intersect|and|not|or|xor|apply|column|concat|count|cross|ctranspose|det|diag|diff|dot|eigs|expm|fft|filter|flatten|forEach|getMatrixDataType|identity|ifft|inv|kron|map|matrixFromColumns|matrixFromFunction|matrixFromRows|ones|partitionSelect|pinv|range|reshape|resize|rotate|rotationMatrix|row|size|sort|sqrtm|squeeze|subset|trace|transpose|zeros|combinations|combinationsWithRep|factorial|gamma|kldivergence|lgamma|multinomial|permutations|pickRandom|random|randomInt|compare|compareNatural|compareText|deepEqual|equal|equalText|larger|largerEq|smaller|smallerEq|unequal|setCartesian|setDifference|setDistinct|setIntersect|setIsSubset|setMultiplicity|setPowerset|setSize|setSymDifference|setUnion|erf|cumsum|mad|max|mean|median|min|mode|prod|quantileSeq|std|sum|variance|bin|format|hex|oct|print|acos|acosh|acot|acoth|acsc|acsch|asec|asech|asin|asinh|atan|atan2|atanh|cos|cosh|cot|coth|csc|csch|sec|sech|sin|sinh|tan|tanh|to|clone|hasNumericValue|isInteger|isNaN|isNegative|isNumeric|isPositive|isPrime|isZero|numeric|typeOf|props|phase|HAprops"
    );
    
    var keywordMapper = this.createKeywordMapper({
        "support.function": builtinFunctions,
        "keyword": keywords,
        "constant.language": builtinConstants
    }, "identifier", true);

    this.$rules = {
        // allowQstring
        start: [{ 
            token : "string",
            regex : "'",
            stateName : "qstring",
            next  : [{
                token : "constant.language.escape",
                regex : "''"
            }, {
                token : "string",
                regex : "'|$",
                next  : "start"
            }, {
                defaultToken: "string"
            }]
        }, {
            token : "text",
            regex : "\\s+"
        }, {
            regex: "",
            next: "noQstring"
        }],        
        noQstring : [{
            regex: "^\\s*#{\\s*$",
            token: "comment.start",
            push: "blockComment"
        }, {
            token : "comment",
            regex : "#[^\r\n]*"
        }, {
            token : "string",
            regex : '"',
            stateName : "qqstring",
            next  : [{
                token : "constant.language.escape",
                regex : /\\./
            }, {
                token : "string",
                regex : "\\\\$",
                next  : "qqstring"
            }, {
                token : "string",
                regex : '"|$',
                next  : "start"
            }, {
                defaultToken: "string"
            }]
        }, {
            token : "constant.numeric", // float
            regex : "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
        }, {
            token : keywordMapper,
            regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
        }, {
            token : "keyword.operator",
            regex : "\\+|\\-|\\/|\\/\\/|<@>|@>|<@|&|\\^|~|<|>|<=|=>|==|!=|<>|=",
            next: "start"
        }, {
            token : "punctuation.operator",
            regex : "\\?|\\:|\\,|\\;|\\.",
            next: "start"
        }, {
            token : "paren.lparen",
            regex : "[({\\[]",
            next: "start"
        }, {
            token : "paren.rparen",
            regex : "[\\]})]"
        }, {
            token : "text",
            regex : "\\s+"
        }, {
            token : "text",
            regex : "$",
            next  : "start"
        }],
        blockComment: [{
            regex: "^\\s*#{\\s*$",
            token: "comment.start",
            push: "blockComment"
        }, {
            regex: "^\\s*#}\\s*$",
            token: "comment.end",
            next: "pop"
        }, {
            defaultToken: "comment"
        }]
    };
    
    this.normalizeRules();
};

oop.inherits(MatlabHighlightRules, TextHighlightRules);

exports.MatlabHighlightRules = MatlabHighlightRules;