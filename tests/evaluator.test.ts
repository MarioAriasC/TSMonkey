import {MArray, MBoolean, MError, MFunction, MHash, MInteger, MObject, MString, typeDesc} from '../src/objects';
import {Lexer} from '../src/lexer';
import {Parser} from '../src/parser';
import {Environment, evaluate, FALSE, NULL, TRUE} from '../src/evaluator';
import {fail} from './utils';

class TestData<T> {
    constructor(public readonly input: string, public readonly expected: T) {
    }
}

function testEval(input: string): MObject | null {
    const lexer = new Lexer(input)
    const parser = new Parser(lexer)
    const program = parser.parseProgram()
    if (parser.errors().length != 0) {
        parser.errors().forEach(error => {
            console.log(error)
        })
    }
    return evaluate(program, Environment.newEnvironment())
}

function testNumber(evaluated: MObject | null, expected: number) {
    if (evaluated instanceof MInteger) {
        expect(evaluated.getValue()).toBe(expected)
    } else {
        fail(`object is not MInteger, got=${typeDesc(evaluated)}, (${evaluated})`)
    }
}

function testBoolean(evaluated: MObject | null, expected: boolean) {
    if (evaluated instanceof MBoolean) {
        expect(evaluated.getValue()).toBe(expected)
    } else {
        fail(`object is not MBoolean, got=${typeDesc(evaluated)}, (${evaluated})`)
    }
}

function testString(evaluated: MObject | null, expected: string) {
    if (evaluated instanceof MString) {
        expect(evaluated.getValue()).toBe(expected)
    } else {
        fail(`object is not MString, got=${typeDesc(evaluated)}, (${evaluated})`)
    }
}


function testInts(tests: Array<TestData<number>>) {
    tests.forEach(({input, expected}) => {
        const evaluated = testEval(input)
        testNumber(evaluated, expected)
    })
}


function testError(evaluated: MObject | null, expected: string) {
    if (evaluated instanceof MError) {
        expect(evaluated.message).toBe(expected)
    } else {
        fail(`object is not a MError, got=${typeDesc(evaluated)}`)
    }
}

describe('evaluator tests', () => {
    test('eval integer expressions', () => {
        testInts(
            [
                new TestData('5', 5),
                new TestData('10', 10),
                new TestData('-5', -5),
                new TestData('-10', -10),
                new TestData('5 + 5 + 5 + 5 - 10', 10),
                new TestData('2 * 2 * 2 * 2 * 2', 32),
                new TestData('-50 + 100 + -50', 0),
                new TestData('5 * 2 + 10', 20),
                new TestData('5 + 2 * 10', 25),
                new TestData('20 + 2 * -10', 0),
                new TestData('50 / 2 * 2 + 10', 60),
                new TestData('2 * (5 + 10)', 30),
                new TestData('3 * 3 * 3 + 10', 37),
                new TestData('3 * (3 * 3) + 10', 37),
                new TestData('(5 + 10 * 2 + 15 / 3) * 2 + -10', 50),
            ]
        )
    })
    test('eval boolean expression', () => {
        [
            new TestData('true', true),
            new TestData('false', false),
            new TestData('1 < 2', true),
            new TestData('1 > 2', false),
            new TestData('1 < 1', false),
            new TestData('1 > 1', false),
            new TestData('1 == 1', true),
            new TestData('1 != 1', false),
            new TestData('1 == 2', false),
            new TestData('1 != 2', true),
            new TestData('true == true', true),
            new TestData('false == false', true),
            new TestData('true == false', false),
            new TestData('true != false', true),
            new TestData('false != true', true),
            new TestData('(1 < 2) == true', true),
            new TestData('(1 < 2) == false', false),
            new TestData('(1 > 2) == true', false),
            new TestData('(1 > 2) == false', true),
        ].forEach(({input, expected}) => {
            const evaluated = testEval(input)
            testBoolean(evaluated, expected)
        })
    })
    test('bang operator', () => {
        [
            new TestData('!true', false),
            new TestData('!false', true),
            new TestData('!5', false),
            new TestData('!!true', true),
            new TestData('!!false', false),
            new TestData('!!5', true),
        ].forEach(({input, expected}) => {
            const evaluated = testEval(input)
            testBoolean(evaluated, expected)
        })
    })
    test('if else expression', () => {
        [
            new TestData('if (true) { 10 }', 10),
            new TestData('if (false) { 10 }', null),
            new TestData('if (1) { 10 }', 10),
            new TestData('if (1 < 2) { 10 }', 10),
            new TestData('if (1 > 2) { 10 }', null),
            new TestData('if (1 > 2) { 10 } else { 20 }', 20),
            new TestData('if (1 < 2) { 10 } else { 20 }', 10),
        ].forEach(({input, expected}) => {
            const evaluated = testEval(input)
            if (expected !== null) {
                testNumber(evaluated, expected)
            } else {
                expect(evaluated).toBe(NULL)
            }
        })
    })
    test('return statement', () => {
        testInts([
            new TestData('return 10;', 10),
            new TestData('return 10; 9;', 10),
            new TestData('return 2 * 5; 9;', 10),
            new TestData('9; return 2 * 5; 9;', 10),
            new TestData(
                `if (10 > 1) {
                            if (10 > 1) {
                              return 10;
                            }
                          
                            return 1;
                          }`, 10),
            new TestData(`let f = fn(x) {
                            return x;
                            x + 10;
                          };
                          f(10);`, 10),
            new TestData(`let f = fn(x) {
                             let result = x + 10;
                             return result;
                             return 10;
                          };
                          f(10);`, 20)
        ])
    })
    test('error handling', () => {
        [
            new TestData(
                '5 + true;',
                'type mismatch: MInteger + MBoolean',
            ),
            new TestData(
                '5 + true; 5;',
                'type mismatch: MInteger + MBoolean',
            ),
            new TestData(
                '-true',
                'unknown operator: -MBoolean',
            ),
            new TestData(
                'true + false;',
                'unknown operator: MBoolean + MBoolean',
            ),
            new TestData(
                'true + false + true + false;',
                'unknown operator: MBoolean + MBoolean',
            ),
            new TestData(
                '5; true + false; 5',
                'unknown operator: MBoolean + MBoolean',
            ),
            new TestData(
                'if (10 > 1) { true + false; }',
                'unknown operator: MBoolean + MBoolean',
            ),
            new TestData(
                `
                if (10 > 1) {
                  if (10 > 1) {
                    return true + false;
                  }
                
                  return 1;
                }`,
                'unknown operator: MBoolean + MBoolean',
            ),
            new TestData(
                'foobar',
                'identifier not found: foobar',
            ),
            new TestData(
                `"Hello" - "World"`,
                'unknown operator: MString - MString'
            ),
            new TestData(
                `{"name": "Monkey"}[fn(x) {x}];`,
                'unusable as a hash key: MFunction'
            )
        ].forEach(({input, expected}) => {
            //console.log(input)
            const evaluated = testEval(input)
            testError(evaluated, expected);
        })
    })
    test('let statement', () => {
        testInts([
            new TestData('let a = 5; a;', 5),
            new TestData('let a = 5 * 5; a;', 25),
            new TestData('let a = 5; let b = a; b;', 5),
            new TestData('let a = 5; let b = a; let c = a + b + 5; c;', 15),
        ])
    })
    test('function object', () => {
        const input = 'fn(x) { x + 2; };'
        const evaluated = testEval(input)
        if (evaluated instanceof MFunction) {
            expect(evaluated.parameters?.length).toBe(1)
            expect(evaluated.parameters?.at(0)?.toString()).toBe('x')
            expect(evaluated.body?.toString()).toBe('(x + 2)')
        }
    })
    test('function application', () => {
        testInts([
            new TestData('let identity = fn(x) { x; }; identity(5);', 5),
            new TestData('let identity = fn(x) { return x; }; identity(5);', 5),
            new TestData('let double = fn(x) { x * 2; }; double(5);', 10),
            new TestData('let add = fn(x, y) { x + y; }; add(5, 5);', 10),
            new TestData('let add = fn(x, y) { x + y; }; add(5 + 5, add(5, 5));', 20),
            new TestData('fn(x) { x; }(5)', 5),
        ])
    })
    test('enclosing environments', () => {
        const input = `let first = 10;
                  let second = 10;
                  let third = 10;
                  
                  let ourFunction = fn(first) {
                    let second = 20;
                  
                    first + second + third;
                  };
                  
                  ourFunction(20) + first + second;`
        testNumber(testEval(input), 70)
    })
    test('string literal', () => {
        const input = `"Hello World!"`
        testString(testEval(input), 'Hello World!')
    })
    test('string concatenation', () => {
        const input = `"Hello" + " " + "World!"`
        testString(testEval(input), 'Hello World!')
    })
    test('builtin functions', () => {
        [
            new TestData(`len("")`, 0),
            new TestData(`len("four")`, 4),
            new TestData(`len("hello world")`, 11),
            new TestData('len(1)', 'argument to \'len\' not supported, got MInteger'),
            new TestData(`len("one", "two")`, 'wrong number of arguments. got=2, want=1'),
            new TestData('len([1, 2, 3])', 3),
            new TestData('len([])', 0),
            new TestData('push([], 1)', [1]),
            new TestData('push(1, 1)', 'argument to \'push\' must be ARRAY, got MInteger'),
            new TestData('first([1, 2, 3])', 1),
            new TestData('first([])', null),
            new TestData('first(1)', 'argument to \'first\' must be ARRAY, got MInteger'),
            new TestData('last([1, 2, 3])', 3),
            new TestData('last([])', null),
            new TestData('last(1)', 'argument to \'last\' must be ARRAY, got MInteger'),
            new TestData('rest([1, 2, 3])', [2, 3]),
            new TestData('rest([])', null),
        ].forEach(({input, expected}) => {
            const evaluated = testEval(input)
            if (expected === null) {
                expect(evaluated).toBe(NULL)
            }
            if (expected instanceof Array<number>) {
                if (evaluated instanceof MArray) {
                    expected.forEach((element, i) => {
                        testNumber(evaluated.elements[i], element)
                    })
                } else {
                    fail(`object is not MArray, got=${typeDesc(evaluated)} (${evaluated})`)
                }
            }
            if (typeof expected === 'string') {
                testError(evaluated, expected)
            }
            if (typeof expected === 'number') {
                testNumber(evaluated, expected)
            }
        })
    })
    test('array literal', () => {
        const input = '[1, 2 * 2, 3 + 3]'
        const evaluated = testEval(input)
        const result = (evaluated as MArray)
        expect(result.elements.length).toBe(3)
        testNumber(result.elements[0], 1)
        testNumber(result.elements[1], 4)
        testNumber(result.elements[2], 6)
    })
    test('array index expression', () => {
        [
            new TestData(
                '[1, 2, 3][0]',
                1,
            ),
            new TestData(
                '[1, 2, 3][1]',
                2,
            ),
            new TestData(
                '[1, 2, 3][2]',
                3,
            ),
            new TestData(
                'let i = 0; [1][i];',
                1,
            ),
            new TestData(
                '[1, 2, 3][1 + 1];',
                3,
            ),
            new TestData(
                'let myArray = [1, 2, 3]; myArray[2];',
                3,
            ),
            new TestData(
                'let myArray = [1, 2, 3]; myArray[0] + myArray[1] + myArray[2];',
                6,
            ),
            new TestData(
                'let myArray = [1, 2, 3]; let i = myArray[0]; myArray[i]',
                2,
            ),
            new TestData(
                '[1, 2, 3][3]',
                null,
            ),
            new TestData(
                '[1, 2, 3][-1]',
                null,
            )
        ].forEach(({input, expected}) => {
            const evaluated = testEval(input)
            if (expected === null) {
                expect(evaluated).toBe(NULL)
            } else {
                testNumber(evaluated, expected)
            }
        })
    })
    test('hash literals', () => {
        const input = `let two = "two";
                	{
                		"one": 10 - 9,
                		two: 1 + 1,
                		"thr" + "ee": 6 / 2,
                		4: 4,
                		true: 5,
                		false: 6
                	}`
        const evaluated = testEval(input)
        if (evaluated instanceof MHash) {
            const expected = new Map<string, number>([
                [new MString('one').hashKey(), 1],
                [new MString('two').hashKey(), 2],
                [new MString('three').hashKey(), 3],
                [new MInteger(4).hashKey(), 4],
                [TRUE.hashKey(), 5],
                [FALSE.hashKey(), 6],
            ])
            expect(evaluated.pairs.size).toBe(expected.size)
            expected.forEach((expectedValue, expectedKey) => {
                const pair = evaluated.pairs.get(expectedKey)
                if (pair === undefined) {
                    fail(`no pair given key in pairs ${expectedKey}`)
                } else {
                    testNumber(pair.value, expectedValue)
                }

            })
        } else {
            fail(`obj is not MHash, got=${typeDesc(evaluated)} (${evaluated})`)
        }
    })
    test('hash index expressions', () => {
        [
            new TestData('{"foo": 5}["foo"]', 5),
            new TestData('{"foo": 5}["bar"]', null),
            new TestData('let key = "foo";{"foo": 5}[key]', 5),
            new TestData('{}["foo"]', null),
            new TestData('{5:5}[5]', 5),
            new TestData('{true:5}[true]', 5),
            new TestData('{false:5}[false]', 5),
        ].forEach(({input, expected}) => {
            const evaluated = testEval(input)
            if (expected === null) {
                expect(evaluated).toBe(NULL)
            } else {
                testNumber(evaluated, expected)
            }
        })
    })
    test('recursive fibonacci', () => {
        const input = `let fibonacci = fn(x) {
    if (x == 0) {
        return 0;
    } else {
        if (x == 1) {
            return 1;
        } else {
            fibonacci(x - 1) + fibonacci(x - 2);
        }
    }
};
    fibonacci(15);`
        const evaluated = testEval(input)
        testNumber(evaluated, 610)
    })

})