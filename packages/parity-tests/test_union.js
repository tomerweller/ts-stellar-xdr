import StellarBase from '@stellar/stellar-base-comp';

// Create a compat union
const union = StellarBase.TransactionEnvelope.v1({ tx: {}, signatures: [] });
console.log('union:', union);
console.log('union instanceof Object:', union instanceof Object);
console.log('union.arm():', union.arm());
console.log('union.switch():', union.switch());
try { console.log('union.v1():', union.v1()); } catch (e) { console.log('union.v1() error:', e.message); }
console.log('"Tx" in union:', 'Tx' in union);
console.log('"v1" in union:', 'v1' in union);
console.log('Object.keys(union):', Object.keys(union));
console.log('Object.getOwnPropertyNames(union):', Object.getOwnPropertyNames(union));
