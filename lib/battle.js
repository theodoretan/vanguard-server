var exports = {};

// normal attack (returns target2's hp)
exports.calculateDmg = function(target1, target2) {
	return Math.round(target1.attack * target1.attack / (target1.attack * target2.defence));
};

// sp atk (no def)
exports.calculateSpDmg = function(target1, target2) {
	return Math.round(target1.spAttack * target1.spAttack / (target1.spAttack * target2.defence));
};

// normal atk, with def
exports.calculateDefDmg = function(target1, target2) {
	return Math.round(target1.attack * target1.attack / (target1.attack * target2.defence*2));
};

// sp atk, with def
exports.calculateSpDefDmg = function(target1, target2) {
	return Math.round(target1.spAttack * target1.spAttack / (target1.spAttack * target2.defence * 2));
};


// p1 and p2 are array of characters
// exports.calculateSpeed = function(p1, p2) {
	// sort by speed
	// return order
// };

module.exports = exports;
