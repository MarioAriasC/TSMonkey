import {Lexer} from '../src/lexer';
import {
    ArrayLiteral,
    BooleanLiteral, CallExpression,
    Expression, ExpressionStatement, FunctionLiteral, HashLiteral,
    Identifier, IfExpression, IndexExpression, InfixExpression,
    IntegerLiteral,
    LetStatement, PrefixExpression,
    Program,
    ReturnStatement,
    Statement, StringLiteral, StringValue
} from '../src/ast';
import {Pair, Triple} from '../src/utils';
import {Parser} from '../src/parser';

function fail(error: string) {
    throw new Error(error)
}

function createProgram(input: string): Program {
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();

    function checkParserErrors(parser: Parser) {
        const errors = parser.errors();
        if (errors.length > 0) {
            fail(`parser has ${errors.length} errors: \n${errors.join(' \n')}`)
        }
    }

    checkParserErrors(parser);
    return program;
}

function countStatements(i: number, program: Program) {
    const size = program.statements.length
    expect(size).toBe(i)
}

function testLetStatement(statement: Statement, expectedIdentifier: string) {
    expect(statement.tokenLiteral()).toBe('let')
    if (statement instanceof LetStatement) {
        expect(statement.name.value).toBe(expectedIdentifier)
        expect(statement.name.tokenLiteral()).toBe(expectedIdentifier)
    } else {
        fail(`value is not LetStatement. got=${statement}`)
    }
}

function testNumberLiteral(expression: Expression | null | undefined, l: number) {
    checkIntegerLiteral(expression, (literal) => {
        expect(literal.value).toBe(l)
        expect(literal.tokenLiteral()).toBe(l.toString())
    })
}


function testBooleanLiteral(expression: Expression | null | undefined, expectedValue: boolean) {
    if (expression instanceof BooleanLiteral) {
        expect(expression.value).toBe(expectedValue)
        expect(expression.tokenLiteral()).toBe(expectedValue.toString())
    } else {
        fail(`value is not BooleanLiteral. got=${expression}`)
    }
}

function testIdentifier(expression: Expression | null | undefined, expectedValue: string) {
    checkIdentifier(expression, (identifier) => {
        expect(identifier.value).toBe(expectedValue)
        expect(identifier.tokenLiteral()).toBe(expectedValue)
    })
}

function checkIdentifier(expression: Expression | null | undefined, body: (exp: Identifier) => void) {
    if (expression instanceof Identifier) {
        body(expression)
    } else {
        fail(`value is not Identifier. got=${typeof expression}`)
    }
}

function checkIntegerLiteral(expression: Expression | null | undefined, body: (exp: IntegerLiteral) => void) {
    if (expression instanceof IntegerLiteral) {
        body(expression)
    } else {
        fail(`value is not IntegerLiteral. got=${typeof expression}`)
    }
}

function checkExpressionStatement(expression: Expression | null | undefined, body: (exp: ExpressionStatement) => void) {
    if (expression instanceof ExpressionStatement) {
        body(expression)
    } else {
        fail(`value is not ExpressionStatement. got=${typeof expression}`)
    }
}

function checkFunctionLiteral(expression: Expression | null, body: (exp: FunctionLiteral) => void) {
    if (expression instanceof FunctionLiteral) {
        body(expression)
    } else {
        fail(`value is not FunctionLiteral. got=${typeof expression}`)
    }
}

function checkIfExpression(expression: Expression | null, body: (exp: IfExpression) => void) {
    if (expression instanceof IfExpression) {
        body(expression)
    } else {
        fail(`value is not IfExpression. got=${typeof expression}`)
    }
}

function checkStringLiteral(expression: Expression | null, body: (exp: StringLiteral) => void) {
    if (expression instanceof StringValue) {
        body(expression)
    } else {
        fail(`value is not StringLiteral. got=${typeof expression}`)
    }
}

function testLiteralExpression<T>(expression: Expression | null | undefined, expectedValue: T) {
    switch (typeof expectedValue) {
        case 'number':
            testNumberLiteral(expression, expectedValue as number)
            break;
        case 'boolean':
            testBooleanLiteral(expression, expectedValue as boolean)
            break;
        case 'string':
            testIdentifier(expression, expectedValue as string)
            break;
        default:
            fail(`type of value not handled. got=${typeof expectedValue}`)
    }
}

function testInfixExpression<T>(expression: Expression | null | undefined, leftValue: T, operator: string, rightValue: T) {
    if (expression instanceof InfixExpression) {
        testLiteralExpression(expression.left, leftValue)
        expect(expression.operator).toBe(operator)
        testLiteralExpression(expression.right, rightValue)
    } else {
        fail(`value is not InfixExpression. got=${expression}`)
    }
}

describe('parser tests', () => {
    test('let statements', () => {
        [
            new Triple('let x = 5;', 'x', 5),
            new Triple('let y = true;', 'y', true),
            new Triple('let foobar = y;', 'foobar', 'y'),
        ].forEach(({first: input, second: expectedIdentifier, third: expectedValue}) => {
            const program = createProgram(input)
            countStatements(1, program)
            const statement = program.statements[0]
            testLetStatement(statement, expectedIdentifier)
            testLiteralExpression((statement as LetStatement).value, expectedValue)
        })
    });
    test('return statements', () => {
        [
            new Pair('return 5;', 5),
            new Pair('return true;', true),
            new Pair('return foobar;', 'foobar'),
        ].forEach(({first: input, second: expectedValue}) => {
            const program = createProgram(input)
            countStatements(1, program)
            const statement = program.statements[0]
            if (statement instanceof ReturnStatement) {
                expect(statement.tokenLiteral()).toBe('return');
                testLiteralExpression(statement.returnValue, expectedValue)
            } else {
                fail(`value is not ReturnStatement. got=${statement}`)
            }
        })
    });
    test('identifier expressions', () => {
        const input = 'foobar;'
        const program = createProgram(input);
        countStatements(1, program);
        checkExpressionStatement(program.statements[0], (statement) => {
            checkIdentifier(statement.expression, (identifier) => {
                expect(identifier.tokenLiteral()).toBe('foobar')
            })
        })
    });
    test('integer literal', () => {
        const input = '5;'
        const program = createProgram(input);
        countStatements(1, program)
        checkExpressionStatement(program.statements[0], (statement) => {
            testNumberLiteral(statement.expression, 5)
        })
    });
    test('parsing prefix expressions', () => {
        [
            new Triple('!5;', '!', 5),
            new Triple('-15;', '-', 15),
            new Triple('!true;', '!', true),
            new Triple('!false;', '!', false),
        ].forEach(({first: input, second: operator, third: value}) => {
            const program = createProgram(input);
            countStatements(1, program)
            checkExpressionStatement(program.statements[0], (statement) => {
                const expression = statement.expression;
                if (expression instanceof PrefixExpression) {
                    expect(expression.operator).toBe(operator)
                    testLiteralExpression(expression.right, value)
                } else {
                    fail(`value is not PrefixExpression. got=${statement}`)
                }
            })
        })
    });
    test('parsing infix expressions', () => {
        class TestData<T> {
            constructor(public input: string, public leftValue: T, public operator: string, public rightValue: T) {
            }
        }

        [
            new TestData('5 + 5;', 5, '+', 5),
            new TestData('5 - 5;', 5, '-', 5),
            new TestData('5 * 5;', 5, '*', 5),
            new TestData('5 / 5;', 5, '/', 5),
            new TestData('5 > 5;', 5, '>', 5),
            new TestData('5 < 5;', 5, '<', 5),
            new TestData('5 == 5;', 5, '==', 5),
            new TestData('5 != 5;', 5, '!=', 5),
            new TestData('true == true', true, '==', true),
            new TestData('true != false', true, '!=', false),
            new TestData('false == false', false, '==', false),
        ].forEach(({input, leftValue, operator, rightValue}) => {
            const program = createProgram(input);
            countStatements(1, program);
            checkExpressionStatement(program.statements[0], (statement) => {
                testInfixExpression(statement.expression, leftValue, operator, rightValue)
            })
        })
    });
    test('operator precedence', () => {
        [
            ['-a * b', '((-a) * b)'],
            ['!-a', '(!(-a))'],
            ['a + b + c', '((a + b) + c)'],
            ['a + b - c', '((a + b) - c)'],
            ['a * b * c', '((a * b) * c)'],
            ['a * b / c', '((a * b) / c)'],
            ['a + b / c', '(a + (b / c))'],
            ['a + b * c + d / e - f', '(((a + (b * c)) + (d / e)) - f)'],
            ['3 + 4; -5 * 5', '(3 + 4)((-5) * 5)'],
            ['5 > 4 == 3 < 4', '((5 > 4) == (3 < 4))'],
            ['5 < 4 != 3 > 4', '((5 < 4) != (3 > 4))'],
            ['3 + 4 * 5 == 3 * 1 + 4 * 5', '((3 + (4 * 5)) == ((3 * 1) + (4 * 5)))'],
            ['true', 'true'],
            ['false', 'false'],
            ['3 > 5 == false', '((3 > 5) == false)'],
            ['3 < 5 == true', '((3 < 5) == true)'],
            ['1 + (2 + 3) + 4', '((1 + (2 + 3)) + 4)'],
            ['(5 + 5) * 2', '((5 + 5) * 2)'],
            ['2 / (5 + 5)', '(2 / (5 + 5))'],
            ['(5 + 5) * 2 * (5 + 5)', '(((5 + 5) * 2) * (5 + 5))'],
            ['-(5 + 5)', '(-(5 + 5))'],
            ['!(true == true)', '(!(true == true))'],
            ['a + add(b * c) + d', '((a + add((b * c))) + d)'],
            ['add(a, b, 1, 2 * 3, 4 + 5, add(6, 7 * 8))', 'add(a, b, 1, (2 * 3), (4 + 5), add(6, (7 * 8)))'],
            ['add(a + b + c * d / f + g)', 'add((((a + b) + ((c * d) / f)) + g))'],
            ['a * [1, 2, 3, 4][b * c] * d', '((a * ([1, 2, 3, 4][(b * c)])) * d)'],
            ['add(a * b[2], b[1], 2 * [1, 2][1])', 'add((a * (b[2])), (b[1]), (2 * ([1, 2][1])))'],
        ].forEach(([input, expected]) => {
            const program = createProgram(input)
            expect(program.toString()).toBe(expected)
        })
    })
    test('boolean expression', () => {
        [
            new Pair('true', true),
            new Pair('false', false),

        ].forEach(({first: input, second: expectedBoolean}) => {
            const program = createProgram(input)
            countStatements(1, program)
            checkExpressionStatement(program.statements[0], (statement) => {
                if (statement.expression instanceof BooleanLiteral) {
                    expect(statement.expression.value).toBe(expectedBoolean)
                } else {
                    fail(`value is not BooleanLiteral. got=${statement}`)
                }
            })
        })
    })
    test('if expression', () => {
        const input = 'if (x < y) {x}'
        const program = createProgram(input);
        countStatements(1, program);
        checkExpressionStatement(program.statements[0], (statement) => {
            checkIfExpression(statement.expression, (exp) => {
                testInfixExpression(exp.condition, 'x', '<', 'y')
                expect(exp.consequence?.statements?.length).toBe(1)
                const statement = exp.consequence?.statements?.at(0)
                if (statement !== undefined) {
                    checkExpressionStatement(statement, (consequence) => {
                        testIdentifier(consequence.expression, 'x')
                    })
                }
            })
        })
    })
    test('if else expression', () => {
        const input = 'if (x < y) { x } else { y }'
        const program = createProgram(input)

        countStatements(1, program)
        checkExpressionStatement(program.statements[0], (statement) => {
            checkIfExpression(statement.expression, (exp) => {
                testInfixExpression(exp.condition, 'x', '<', 'y')
                expect(exp.consequence?.statements?.length).toBe(1)
                checkExpressionStatement(exp.consequence?.statements?.at(0), (consequence) => {
                    testIdentifier(consequence.expression, 'x')
                })
                expect(exp.alternative?.statements?.length).toBe(1)
                checkExpressionStatement(exp.alternative?.statements?.at(0), (alternative) => {
                    testIdentifier(alternative.expression, 'y')
                })
            })
        })
    })
    test('function literal parsing', () => {
        const input = 'fn(x, y) { x + y;}'
        const program = createProgram(input)
        countStatements(1, program)

        checkExpressionStatement(program.statements?.at(0), (statement) => {
            checkFunctionLiteral(statement.expression, (fun) => {
                testLiteralExpression(fun.parameters?.at(0), 'x')
                testLiteralExpression(fun.parameters?.at(1), 'y')
                expect(fun.body?.statements?.length).toBe(1)
                checkExpressionStatement(fun.body?.statements?.at(0), (body) => {
                    testInfixExpression(body.expression, 'x', '+', 'y')
                })
            })
        })
    })
    test('function parameter parsing', () => {
        [
            new Pair('fn() {}', []),
            new Pair('fn(x) {}', ['x']),
            new Pair('fn(x, y, z) {}', ['x', 'y', 'z'])
        ].forEach(({first: input, second: expectedParams}) => {
            const program = createProgram(input)
            checkExpressionStatement(program.statements?.at(0), (statement) => {
                checkFunctionLiteral(statement.expression, (fun) => {
                    expect(fun.parameters?.length).toBe(expectedParams.length)
                    expectedParams.forEach((param, i) => {
                        testLiteralExpression(fun.parameters?.at(i), param)
                    })
                })

            })
        })
    })
    test('call expression parsing', () => {
        const input = 'add(1, 2 * 3, 4+5)'
        const program = createProgram(input)
        countStatements(1, program)
        checkExpressionStatement(program.statements?.at(0), (statement) => {
            const exp = statement.expression;
            if (exp instanceof CallExpression) {
                testIdentifier(exp.fun, 'add')
                const args = exp.args
                expect(args?.length).toBe(3)
                testLiteralExpression(args?.at(0), 1)
                testInfixExpression(args?.at(1), 2, '*', 3)
                testInfixExpression(args?.at(2), 4, '+', 5)
            } else {
                fail(`value is not CallExpression, got=${typeof exp}`)
            }
        })
    })
    test('string literal expression', () => {
        const input = '"hello world";'
        const program = createProgram(input)
        countStatements(1, program)
        checkExpressionStatement(program.statements?.at(0), (statement) => {
            checkStringLiteral(statement.expression, (expression) => {
                expect(expression.value).toBe('hello world')
            })
        })
    })
    test('parsing array literal', () => {
        const input = '[1, 2 * 2, 3 + 3]'
        const program = createProgram(input)
        checkExpressionStatement(program.statements?.at(0), (statement) => {
            const expression = statement.expression
            if (expression instanceof ArrayLiteral) {
                testNumberLiteral(expression.elements?.at(0), 1)
                testInfixExpression(expression.elements?.at(1), 2, '*', 2)
                testInfixExpression(expression.elements?.at(2), 3, '+', 3)
            } else {
                fail(`value is not ArrayLiteral, got=${typeof expression}`)
            }
        })
    })
    test('parsing index expression', () => {
        const input = 'myArray[1 + 1]'
        const program = createProgram(input)
        checkExpressionStatement(program.statements?.at(0), (statement) => {
            const expression = statement.expression
            if (expression instanceof IndexExpression) {
                testIdentifier(expression.left, 'myArray')
            } else {
                fail(`value is not IndexExpression, got=${typeof expression}`)
            }
        })
    })
    test('hash literal string keys', () => {
        const input = `{"one": 1, "two": 2, "three": 3}`
        const program = createProgram(input)
        checkExpressionStatement(program.statements?.at(0), (statement) => {
            const expression = statement.expression
            if (expression instanceof HashLiteral) {
                expect(expression.pairs.size).toBe(3)
                const expected = new Map([
                    ['one', 1],
                    ['two', 2],
                    ['three', 3],
                ])
                expression.pairs.forEach((value, key) => {
                    checkStringLiteral(key, (literal) => {
                        const expectedValue = expected.get(literal.toString())
                        testLiteralExpression(value, expectedValue)
                    })
                })
            } else {
                fail(`value is not HashLiteral, got=${typeof expression}`)
            }
        })
    })
})