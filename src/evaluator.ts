import {
    ArrayLiteral,
    BlockStatement,
    BooleanLiteral,
    CallExpression,
    ExpressionList,
    ExpressionStatement,
    FunctionLiteral,
    HashLiteral,
    Identifier,
    IfExpression,
    IndexExpression,
    InfixExpression,
    IntegerLiteral,
    LetStatement,
    Node,
    PrefixExpression,
    Program,
    ReturnStatement,
    StringLiteral
} from './ast';
import {
    builtins,
    HashPair,
    M_NULL,
    MArray,
    MBoolean, MBuiltinFunction,
    MError,
    MFunction,
    MHash,
    MInteger,
    MObject,
    MReturnValue,
    MString,
    MValue,
    typeDesc
} from './objects';

export class Environment {
    private constructor(private readonly store: Map<string, MObject>, private readonly outer: Environment | null) {
    }

    static newEnvironment(): Environment {
        return new Environment(new Map<string, MObject>(), null)
    }

    static newEnclosedEnvironment(outer: Environment): Environment {
        return new Environment(new Map<string, MObject>(), outer)
    }

    set(name: string, value: MObject) {
        this.store.set(name, value)
    }

    put(name: string, value: MObject): MObject {
        this.set(name, value)
        return value;
    }

    get(name: string): MObject | null {
        const obj = this.store.get(name)
        if (obj === undefined && this.outer !== null) {
            return this.outer.get(name)
        }
        if (obj !== undefined) {
            return obj
        }
        return null
    }
}

export const TRUE = new MBoolean(true)
export const FALSE = new MBoolean(false)
export const NULL = M_NULL

export function evaluate(program: Program, env: Environment): MObject | null {
    let result = null
    for (const statement of program.statements) {
        result = evaluateNode(statement, env)
        if (result instanceof MReturnValue) {
            return result.value
        }
        if (result instanceof MError) {
            return result
        }
    }
    return result;
}

function ifNotError(obj: MObject | null, body: (o: MObject) => MObject | null): MObject | null {
    if (obj != null) {
        if (obj instanceof MError) {
            return obj
        }
        return body(obj)
    }
    return obj
}

function isError(obj: MObject | null): boolean {
    if (obj !== null) {
        return obj instanceof MError
    }
    return false
}

function evalBangOperatorExpression(right: MObject): MObject {
    switch (right) {
        case TRUE:
            return FALSE;
        case FALSE:
            return TRUE;
        case NULL:
            return TRUE
        default:
            return FALSE
    }
}

function evalMinusPrefixOperatorExpression(right: MObject): MObject {
    if (right instanceof MInteger) {
        return new MInteger(-right.getValue())
    } else {
        return new MError(`unknown operator: -${typeDesc(right)}`)
    }
}

function toMonkey(bool: boolean) {
    return bool ? TRUE : FALSE
}

function evalIntegerInfixExpression(operator: string, left: MInteger, right: MInteger): MObject {

    switch (operator) {
        case '+':
            return new MInteger(left.getValue() + right.getValue())
        case '-':
            return new MInteger(left.getValue() - right.getValue())
        case '*':
            return new MInteger(left.getValue() * right.getValue())
        case '/':
            return new MInteger(left.getValue() / right.getValue())
        case '<':
            return toMonkey(left.getValue() < right.getValue())
        case '>':
            return toMonkey(left.getValue() > right.getValue())
        case '==':
            return toMonkey(left.getValue() === right.getValue())
        case '!=':
            return toMonkey(left.getValue() !== right.getValue())
        default:
            return new MError(`unknown operator: ${typeDesc(left)} ${operator} ${typeDesc(right)}`)
    }
}

function evalInfixExpression(operator: string, left: MObject, right: MObject): MObject {
    if (left instanceof MInteger && right instanceof MInteger) {
        return evalIntegerInfixExpression(operator, left, right)
    }
    if (operator === '==') {
        return toMonkey(left === right)
    }
    if (operator === '!=') {
        return toMonkey(left !== right)
    }
    if (typeDesc(left) != typeDesc(right)) {
        return new MError(`type mismatch: ${typeDesc(left)} ${operator} ${typeDesc(right)}`)
    }
    if ((left instanceof MString && right instanceof MString) && operator === '+') {
        return new MString(left.getValue() + right.getValue())
    }
    return new MError(`unknown operator: ${typeDesc(left)} ${operator} ${typeDesc(right)}`)

}

function evalBlockStatement(node: BlockStatement, env: Environment): MObject | null {
    let result = null
    if (node.statements !== null) {
        for (const statement of node.statements) {
            result = evaluateNode(statement, env)
            if (result !== null) {
                if (result instanceof MReturnValue || result instanceof MError) {
                    return result
                }
            }
        }
    }
    return result
}

function evalExpressions(args: ExpressionList, env: Environment): Array<MObject | null> {
    const evalList = []
    for (const argument of args!!) {
        const evaluated = evaluateNode(argument, env)
        if (isError(evaluated)) {
            return [evaluated]
        }
        evalList.push(evaluated)
    }
    return evalList
}

function extendFunctionEnv(fun: MFunction, args: Array<MObject | null>): Environment {
    const env = Environment.newEnclosedEnvironment(fun.env)
    fun.parameters?.forEach((identifier, i) => {
        env.set(identifier.value, (args[i])!!)
    })
    return env
}

function applyFunction(fun: MObject, args: Array<MObject | null>): MObject | null {
    if (fun instanceof MFunction) {
        const extendEnv = extendFunctionEnv(fun, args)
        const evaluated = evaluateNode(fun.body, extendEnv)
        if (evaluated instanceof MReturnValue) {
            return evaluated.value
        } else {
            return evaluated
        }
    }
    if (fun instanceof MBuiltinFunction) {
        const result = fun.fn(args)
        if (result === null) {
            return NULL
        }
        return result
    }
    return new MError(`not a function: ${typeDesc(fun)}`)
}

function evalArrayIndexExpression(array: MArray, index: MInteger) {
    const elements = array.elements
    const i = index.getValue()
    const max = elements.length - 1
    if (i < 0 || i > max) {
        return NULL
    }
    return elements[i]
}

function evalHashIndexExpression(hash: MHash, index: MObject | null): MObject {
    if (index instanceof MValue) {
        const pair = hash.pairs.get(index.hashKey())
        if (pair !== undefined) {
            return pair.value
        }
        return NULL
    }
    return new MError(`unusable as a hash key: ${typeDesc(index)}`)
}

function evaluateNode(node: Node | null, env: Environment): MObject | null {
    if (node instanceof Identifier) {
        const value = env.get(node.value)
        if (value === null) {
            const builtin = builtins.get(node.value)
            if (builtin !== undefined) {
                return builtin
            }
            return new MError(`identifier not found: ${node.value}`)
        }
        return value

    }
    if (node instanceof IntegerLiteral) {
        return new MInteger(node.value)
    }
    if (node instanceof InfixExpression) {
        return ifNotError(evaluateNode(node.left, env), (left) => {
            return ifNotError(evaluateNode(node.right, env), (right) => {
                return evalInfixExpression(node.operator, left, right)
            })
        })
    }
    if (node instanceof BlockStatement) {
        return evalBlockStatement(node, env)
    }
    if (node instanceof ExpressionStatement) {
        return evaluateNode(node.expression, env)
    }
    if (node instanceof IfExpression) {
        function isTruthy(condition: MObject): boolean {
            if (condition === NULL) {
                return false
            }
            if (condition === TRUE) {
                return true
            }
            return condition !== FALSE;

        }

        return ifNotError(evaluateNode(node.condition, env), (condition) => {
            if (isTruthy(condition)) {
                return evaluateNode(node.consequence, env)
            }
            if (node.alternative !== null) {
                return evalBlockStatement(node.alternative, env)
            }
            return NULL
        })
    }
    if (node instanceof CallExpression) {
        return ifNotError(evaluateNode(node.fun, env), (fun) => {
            const args = evalExpressions(node.args, env)
            if (args.length === 1 && isError(args[0])) {
                return args[0]
            }
            return applyFunction(fun, args)
        })
    }
    if (node instanceof ReturnStatement) {
        return ifNotError(evaluateNode(node.returnValue, env), (value) => {
            return new MReturnValue(value)
        })
    }
    if (node instanceof PrefixExpression) {
        return ifNotError(evaluateNode(node.right, env), (right) => {
            switch (node.operator) {
                case '!' :
                    return evalBangOperatorExpression(right)
                case '-' :
                    return evalMinusPrefixOperatorExpression(right)
                default:
                    return new MError(`Unknown operator: ${node.operator}${typeDesc(right)}`)
            }
        })
    }
    if (node instanceof BooleanLiteral) {
        return toMonkey(node.value)
    }
    if (node instanceof LetStatement) {
        return ifNotError(evaluateNode(node.value, env), (value) => {
            return env.put(node.name.value, value)
        })
    }
    if (node instanceof FunctionLiteral) {
        return new MFunction(node.parameters, node.body, env)
    }
    if (node instanceof StringLiteral) {
        return new MString(node.value)
    }
    if (node instanceof IndexExpression) {
        const left = evaluateNode(node.left, env)
        if (isError(left)) {
            return left
        }

        const index = evaluateNode(node.index, env)
        if (isError(index)) {
            return index
        }

        if (left instanceof MArray && index instanceof MInteger) {
            return evalArrayIndexExpression(left, index)
        }
        if (left instanceof MHash) {
            return evalHashIndexExpression(left, index)
        }
        return new MError(`index operator not supported: ${typeDesc(left)}`)
    }
    if (node instanceof HashLiteral) {
        const pairs = new Map<string, HashPair>()
        for (const [keyNode, valueNode] of node.pairs) {
            const key = evaluateNode(keyNode, env)
            if (isError(key)) {
                return key
            }
            if (key instanceof MValue) {
                const value = evaluateNode(valueNode, env)
                if (isError(value)) {
                    return value
                }
                pairs.set(key.hashKey(), new HashPair(key, value!!))
            } else {
                return new MError(`unusable as hash key: ${typeDesc(key)}`)
            }
        }
        return new MHash(pairs)
    }
    if (node instanceof ArrayLiteral) {
        const elements = evalExpressions(node.elements, env)
        if (elements.length == 1 && isError(elements[0])) {
            return elements[0]
        }
        return new MArray(elements)
    }
    throw new Error(`${node?.toString()} => ${node?.constructor.name}`)
}