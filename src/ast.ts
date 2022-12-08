import {Token} from './token';

export interface Node {
    tokenLiteral(): string
}

export abstract class Statement implements Node {
    protected constructor(public readonly token: Token) {
    }

    tokenLiteral(): string {
        return this.token.literal
    }
}

export type Expression = Statement;

export class Program {
    constructor(public statements: Statement[]) {
    }

    toString(): string {
        return this.statements.join('')
    }
}

export abstract class StringValue extends Statement {
    constructor(token: Token, public value: string) {
        super(token);
    }

    toString(): string {
        return this.value
    }
}

export class Identifier extends StringValue {
}

export class StringLiteral extends StringValue {
}

export class LetStatement extends Statement {
    constructor(token: Token, public name: Identifier, public value: Expression | null) {
        super(token);
    }

    toString(): string {
        return `${this.tokenLiteral()} ${this.name} = ${this.value !== null ? this.value.toString() : ''}`
    }
}

export class ExpressionStatement extends Statement {
    constructor(token: Token, public expression: Expression | null) {
        super(token);
    }

    toString(): string {
        if (this.expression !== null) {
            return this.expression.toString()
        }
        return ''
    }

}

export class ReturnStatement extends Statement {
    constructor(token: Token, public returnValue: Expression | null) {
        super(token);
    }

    toString(): string {
        const returnString = this.returnValue !== null ? this.returnValue.toString() : ''
        return `${this.tokenLiteral()} ${returnString}`
    }
}

abstract class LiteralExpression<T> extends Statement {
    constructor(token: Token, public value: T) {
        super(token);
    }

    toString(): string {
        return this.token.literal
    }
}

export class IntegerLiteral extends LiteralExpression<number> {
}

export class BooleanLiteral extends LiteralExpression<boolean> {
}

export class PrefixExpression extends Statement {
    constructor(token: Token, public operator: string, public right: Expression | null) {
        super(token);
    }

    toString(): string {
        return `(${this.operator}${this.right})`
    }
}

export class InfixExpression extends Statement {
    constructor(token: Token, public left: Expression | null, public operator: string, public right: Expression | null) {
        super(token);
    }

    toString(): string {
        return `(${this.left} ${this.operator} ${this.right})`
    }
}

export type ExpressionList = Array<Expression | null> | null

export class CallExpression extends Statement {
    constructor(token: Token, public fun: Expression | null, public args: ExpressionList) {
        super(token);
    }

    toString(): string {
        return `${this.fun?.toString()}(${this.args?.join(', ')})`
    }
}

export class ArrayLiteral extends Statement {
    constructor(token: Token, public elements: ExpressionList) {
        super(token);
    }

    toString(): string {
        return `[${this.elements?.join(', ')}]`
    }

}

export class IndexExpression extends Statement {
    constructor(token: Token, public left: Expression | null, public index: Expression | null) {
        super(token);
    }

    toString(): string {
        return `(${this.left?.toString()}[${this.index?.toString()}])`
    }
}

export class BlockStatement extends Statement {
    constructor(token: Token, public statements: ExpressionList) {
        super(token);
    }

    toString(): string {
        if (this.statements === null) {
            return ''
        }
        return this.statements?.join('')
    }
}

export class IfExpression extends Statement {
    constructor(token: Token, public readonly condition: Expression | null, public readonly consequence: BlockStatement | null, public readonly alternative: BlockStatement | null) {
        super(token);
    }

    toString(): string {
        return `if ${this.condition} ${this.consequence} ${(this.alternative != null ? `else ${this.alternative}` : '')}`
    }
}

export class FunctionLiteral extends Statement {
    constructor(token: Token, public readonly parameters: Array<Identifier> | null, public readonly body: BlockStatement | null, public readonly name: string = '') {
        super(token);
    }

    toString(): string {
        return `${this.tokenLiteral()}${(this.name.length != 0 ? `<${this.name}>` : '')}(${this.parameters?.join('')}) ${this.body}`
    }
}

export class HashLiteral extends Statement {
    constructor(token: Token, public readonly pairs: Map<Expression, Expression>) {
        super(token);
    }
}