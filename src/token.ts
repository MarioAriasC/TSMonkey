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

export function lookupIdent(value: string): TokenType {
    switch (value) {
        case 'fn':
            return TokenType.FUNCTION;
        case 'let':
            return TokenType.LET;
        case 'true':
            return TokenType.TRUE;
        case 'false':
            return TokenType.FALSE;
        case 'if':
            return TokenType.IF;
        case 'else':
            return TokenType.ELSE;
        case 'return':
            return TokenType.RETURN;
        default:
            return TokenType.IDENT
    }
}

export class Token {
    constructor(public tokenType: TokenType, public literal: string) {
    }

    toString(): string {
        return `Token(tokenType = ${this.tokenType}, literal = "${this.literal}")`
    }
}