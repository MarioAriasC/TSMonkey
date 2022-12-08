import {BlockStatement, Identifier} from './ast';
import {Environment} from './evaluator';

export interface MObject {
    inspect(): string
}

export function typeDesc(mObject: MObject | null): string {
    if (mObject == null) {
        return 'null'
    } else {
        return mObject.constructor.name
    }
}

type Value = string | number | boolean

export abstract class MValue<T> implements MObject {
    protected constructor(protected readonly value: Value) {
    }


    abstract getValue(): T

    inspect(): string {
        return this.value.toString();
    }

    hashKey(): string {
        return this.toString()
    }

}

export class MInteger extends MValue<number> {
    constructor(value: number) {
        super(value);
    }

    toString(): string {
        return `MInteger(value=${this.value})`
    }

    getValue(): number {
        return this.value as number;
    }
}

export class MBoolean extends MValue<boolean> {
    constructor(value: boolean) {
        super(value);
    }

    toString(): string {
        return `MBoolean(value=${this.value})`
    }

    getValue(): boolean {
        return this.value as boolean;
    }
}

export class MString extends MValue<string> {
    constructor(value: string) {
        super(value);
    }

    toString(): string {
        return `MString(value=${this.value})`
    }

    getValue(): string {
        return this.value as string;
    }
}

export class MReturnValue implements MObject {
    constructor(public readonly value: MObject) {
    }

    inspect(): string {
        return this.value.inspect();
    }
}

export class MError implements MObject {
    constructor(public readonly message: string) {
    }

    inspect(): string {
        return `ERROR: ${this.message}`;
    }

    toString(): string {
        return `MError(message=${this.message})`
    }

}

class MNull implements MObject {
    inspect(): string {
        return 'null';
    }

}

export const M_NULL = new MNull()

export class MFunction implements MObject {

    constructor(public readonly parameters: Array<Identifier> | null, public readonly body: BlockStatement | null, public readonly env: Environment) {
    }

    inspect(): string {
        return `fn(${this.parameters?.join(', ')}) {\n\t${this.body}\n}`;
    }

}

export class MArray implements MObject {
    constructor(public readonly elements: Array<MObject | null>) {
    }

    inspect(): string {
        return `[${this.elements.join(', ')}]`;
    }
}

export class HashPair {
    constructor(public readonly key: MObject, public readonly value: MObject) {
    }
}

export class MHash implements MObject {
    constructor(public readonly pairs: Map<String, HashPair>) {
    }

    inspect(): string {
        const values = []
        for (const value of this.pairs.values()) {
            values.push(`${value.key.inspect()}: ${value.value.inspect()}`)
        }

        return `{${values.join(', ')}}`
    }

}

type BuiltinFunction = (args: Array<MObject | null>) => MObject | null

export class MBuiltinFunction implements MObject {

    constructor(public readonly fn: BuiltinFunction) {
    }

    inspect(): string {
        return 'builtin function';
    }

}

function argSizeCheck(expectedSize: number, args: Array<MObject | null>, body: BuiltinFunction): MObject | null {
    const length = args.length
    if (length !== expectedSize) {
        return new MError(`wrong number of arguments. got=${length}, want=${expectedSize}`)
    }
    return body(args)
}

function arrayCheck(builtinName: string, args: Array<MObject | null>, body: (array: MArray, n: number) => MObject | null): MObject | null {
    const first = args[0]
    if (first instanceof MArray) {
        return body(first, first.elements.length)
    }
    return new MError(`argument to '${builtinName}' must be ARRAY, got ${typeDesc(first)}`)
}

const PUSH = 'push'
const FIRST = 'first'
const LAST = 'last'
const REST = 'rest'
export const builtins = new Map<string, MBuiltinFunction>([
        ['len', new MBuiltinFunction((args) => {
            return argSizeCheck(1, args, (it) => {
                const arg = it[0]
                if (arg instanceof MString) {
                    return new MInteger(arg.getValue().length)
                }
                if (arg instanceof MArray) {
                    return new MInteger(arg.elements.length)
                }
                return new MError(`argument to 'len' not supported, got ${typeDesc(arg)}`)
            })
        })],
        [PUSH, new MBuiltinFunction((args) => {
            return argSizeCheck(2, args, (it) => {
                return arrayCheck(PUSH, it, (array) => {
                    const elements = array.elements
                    elements.push(args[1])
                    return new MArray(elements)
                })
            })
        })],
        [FIRST, new MBuiltinFunction((args) => {
            return argSizeCheck(1, args, (it) => {
                return arrayCheck(FIRST, it, (array, length) => {
                    if (length > 0) {
                        return array.elements[0]
                    } else {
                        return M_NULL
                    }
                })
            })
        })],
        [LAST, new MBuiltinFunction((args) => {
            return argSizeCheck(1, args, (it) => {
                return arrayCheck(LAST, it, (array, length) => {
                    if (length > 0) {
                        return array.elements[length - 1]
                    } else {
                        return M_NULL
                    }
                })
            })
        })],
        [REST, new MBuiltinFunction((args) => {
            return argSizeCheck(1, args, (it) => {
                return arrayCheck(REST, it, (array, length) => {
                    if (length > 0) {
                        return new MArray(array.elements.slice(1))
                    }
                    return M_NULL
                })
            })
        })]
    ]
)
