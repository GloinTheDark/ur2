// Test script to verify path conversion
import { whitePathToBlackPath, FINKEL_PATH, MASTERS_PATH, BURGLERS_PATH } from './src/GamePaths';

console.log('=== Path Conversion Test ===\n');

// Test Finkel path
console.log('FINKEL PATH:');
console.log('White:', FINKEL_PATH.whitePath);
const finkelBlack = whitePathToBlackPath(FINKEL_PATH.whitePath);
console.log('Black (converted):', finkelBlack);
console.log('Expected black:   [20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 16, 24, 23]');
console.log('Matches expected:', JSON.stringify(finkelBlack) === JSON.stringify([20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 16, 24, 23]));
console.log('');

// Test Masters path
console.log('MASTERS PATH:');
console.log('White:', MASTERS_PATH.whitePath);
const mastersBlack = whitePathToBlackPath(MASTERS_PATH.whitePath);
console.log('Black (converted):', mastersBlack);
console.log('Expected black:    [20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 7, 8, 16, 24, 23]');
console.log('Matches expected:', JSON.stringify(mastersBlack) === JSON.stringify([20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 7, 8, 16, 24, 23]));
console.log('');

// Test Burglers path
console.log('BURGLERS PATH:');
console.log('White:', BURGLERS_PATH.whitePath);
const burglersBlack = whitePathToBlackPath(BURGLERS_PATH.whitePath);
console.log('Black (converted):', burglersBlack);
console.log('Expected black:    [20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 23, 24, 16, 8, 7, 15, 14, 13, 12, 11, 10, 9]');
console.log('Matches expected:', JSON.stringify(burglersBlack) === JSON.stringify([20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 23, 24, 16, 8, 7, 15, 14, 13, 12, 11, 10, 9]));

console.log('\n=== Conversion Rule Test ===');
console.log('Rule: add 16 to values < 9, subtract 16 from values > 16, keep 9-16 same');
console.log('Testing individual values:');
console.log('1 -> 17:', 1 + 16, '(expected: 17)');
console.log('4 -> 20:', 4 + 16, '(expected: 20)');
console.log('10 -> 10:', 10, '(expected: 10, no change)');
console.log('15 -> 15:', 15, '(expected: 15, no change)');
console.log('23 -> 7:', 23 - 16, '(expected: 7)');
console.log('24 -> 8:', 24 - 16, '(expected: 8)');
