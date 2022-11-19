export enum TokenType {
    ILLEGAL = 'ILLEGAL',
    EOF = 'EOF',
    ASSIGN = '=',
    EQ = '==',
    NOT_EQ = '!=',
    IDENT = 'IDENT',
    INT = 'INT',
    PLUS = '+',
    COMMA = ',',
    SEMICOLON = ';',
    COLON = ':',
    MINUS = '-',
    BANG = '!',
    SLASH = '/',
    ASTERISK = '*',
    LT = '<',
    GT = '>',
    LPAREN = '(',
    RPAREN = ')',
    LBRACE = '{',
    RBRACE = '}',
    LBRACKET = '[',
    RBRACKET = ']',
    FUNCTION = 'FUNCTION',
    LET = 'LET',
    TRUE = 'TRUE',
    FALSE = 'FALSE',
    IF = 'IF',
    ELSE = 'ELSE',
    RETURN = 'RETURN',
    STRING = 'STRING',
}

const KEYWORDS = {
    'fn': TokenType.FUNCTION,
    'let': TokenType.LET,
    'true': TokenType.TRUE,
    'false': TokenType.FALSE,
    'if': TokenType.IF,
    'else': TokenType.ELSE,
    'return': TokenType.RETURN,
}

export function lookupIdent(value: string): TokenType {
    const tokenType = KEYWORDS[value]
    if (tokenType === undefined) {
        return TokenType.IDENT
    }
    return tokenType;
}

export class Token {
    constructor(public tokenType: TokenType, public literal: string) {
    }

    toString(): string {
        return `Token(tokenType = ${this.tokenType}, literal = "${this.literal}")`
    }
}