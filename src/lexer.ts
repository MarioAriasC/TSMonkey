import {lookupIdent, Token, TokenType} from './token';

const ZERO = '';
const WHITE_SPACES = [' ', '\t', '\n', '\r']
const DIGIT_EXPRESSION = /^\d$/;

function isDigit(ch: string): boolean {
    return DIGIT_EXPRESSION.test(ch);
}

export class Lexer {

    constructor(private input: string) {
        this.readChar();
    }

    private position = 0;
    private readPosition = 0;
    private ch = ZERO;


    private readChar() {
        this.ch = this.peakChar();
        this.position = this.readPosition;
        this.readPosition++;
    }

    private peakChar(): string {
        if (this.readPosition >= this.input.length) {
            return ZERO
        }
        return this.input[this.readPosition]
    }

    private token(tokenType: TokenType): Token {
        return new Token(tokenType, this.ch)
    }

    private endsWithEqual(oneChar: TokenType, twoChars: TokenType, duplicateChars = true): Token {
        if (this.peakChar() == '=') {
            const currentChar = this.ch;
            this.readChar();
            const value = duplicateChars ? `${currentChar}${currentChar}` : `${currentChar}${this.ch}`
            return new Token(twoChars, value)

        }
        return this.token(oneChar)
    }

    nextToken(): Token {
        this.skipWhitespace();
        let token: Token | null = null;
        switch (this.ch) {
            case '=':
                token = this.endsWithEqual(TokenType.ASSIGN, TokenType.EQ)
                break;
            case '!':
                token = this.endsWithEqual(TokenType.BANG, TokenType.NOT_EQ, false)
                break;
            case ';':
                token = this.token(TokenType.SEMICOLON);
                break;
            case ':' :
                token = this.token(TokenType.COLON);
                break;
            case ',' :
                token = this.token(TokenType.COMMA);
                break;
            case '(' :
                token = this.token(TokenType.LPAREN);
                break;
            case ')' :
                token = this.token(TokenType.RPAREN);
                break;
            case '{' :
                token = this.token(TokenType.LBRACE);
                break;
            case '}' :
                token = this.token(TokenType.RBRACE);
                break;
            case '[' :
                token = this.token(TokenType.LBRACKET);
                break;
            case ']' :
                token = this.token(TokenType.RBRACKET);
                break;
            case '+' :
                token = this.token(TokenType.PLUS);
                break;
            case '-' :
                token = this.token(TokenType.MINUS);
                break;
            case '*' :
                token = this.token(TokenType.ASTERISK);
                break;
            case '/' :
                token = this.token(TokenType.SLASH);
                break;
            case '<' :
                token = this.token(TokenType.LT);
                break;
            case '>' :
                token = this.token(TokenType.GT);
                break;
            case '"':
                token = new Token(TokenType.STRING, this.readString());
                break;
            case ZERO:
                token = new Token(TokenType.EOF, '');
                break;
            default:
                if (this.isIdentifier(this.ch)) {
                    const identifier = this.readIdentifier();
                    return new Token(lookupIdent(identifier), identifier)
                }
                if (isDigit(this.ch)) {
                    return new Token(TokenType.INT, this.readNumber())
                }
                return new Token(TokenType.ILLEGAL, this.ch)
        }
        this.readChar();
        return token
    }


    private skipWhitespace() {
        while (WHITE_SPACES.includes(this.ch)) {
            this.readChar()
        }
    }

    private isIdentifier(value: string): boolean {
        return (value.toLowerCase() != value.toUpperCase()) || value == '_'
    }

    private readIdentifier(): string {
        return this.readValue(ch => this.isIdentifier(ch))
    }

    private readValue(predicate: (ch: string) => boolean) {
        const currentPosition = this.position;
        while (predicate(this.ch)) {
            this.readChar();
        }
        return this.input.substring(currentPosition, this.position)
    }

    private readNumber() {
        return this.readValue(ch => isDigit(ch));
    }

    private readString(): string {
        const start = this.position + 1;
        while (true) {
            this.readChar();
            if (this.ch == '"' || this.ch == ZERO) {
                break;
            }
        }
        return this.input.substring(start, this.position)
    }
}