import {Lexer} from './lexer';
import {
    ArrayLiteral,
    BlockStatement,
    BooleanLiteral,
    CallExpression,
    Expression,
    ExpressionStatement,
    FunctionLiteral, HashLiteral,
    Identifier,
    IfExpression,
    IndexExpression,
    InfixExpression,
    IntegerLiteral,
    LetStatement,
    PrefixExpression,
    Program,
    ReturnStatement,
    Statement,
    StringLiteral
} from './ast';
import {Token, TokenType} from './token';

enum Precedence {
    LOWEST, EQUALS, LESS_GREATER, SUM, PRODUCT, PREFIX, CALL, INDEX
}

type PrefixParser = () => Expression | null
type InfixParser = (exp: Expression | null) => Expression | null

export class Parser {
    private parseIntegerLiteral: PrefixParser = () => {
        const token = this.curToken;
        const value = parseInt(token.literal)
        if (isNaN(value)) {
            this._errors.push(`could not parse ${token.literal} as integer`)
            return null
        }
        return new IntegerLiteral(token, value)
    }

    private parseBooleanLiteral: PrefixParser = () => {
        return new BooleanLiteral(this.curToken, this.curTokenIs(TokenType.TRUE))
    }

    private parseIdentifier: PrefixParser = () => {
        return new Identifier(this.curToken, this.curToken.literal)
    }


    private parsePrefixExpression: PrefixParser = () => {
        const token = this.curToken
        const operator = token.literal
        this.nextToken()
        const right = this.parseExpression(Precedence.PREFIX)
        return new PrefixExpression(token, operator, right)
    }

    private parseGroupExpression: PrefixParser = () => {
        this.nextToken();
        const exp = this.parseExpression(Precedence.LOWEST);
        if (!this.expectPeek(TokenType.RPAREN)) {
            return null
        }
        return exp;
    }

    private parseArrayLiteral: PrefixParser = () => {
        const token = this.curToken
        return new ArrayLiteral(token, this.parseExpressionList(TokenType.RBRACKET))
    }

    private parseIfExpression: PrefixParser = () => {
        const token = this.curToken

        if (!this.expectPeek(TokenType.LPAREN)) {
            return null
        }

        this.nextToken()

        const condition = this.parseExpression(Precedence.LOWEST)
        if (!this.expectPeek(TokenType.RPAREN)) {
            return null
        }

        if (!this.expectPeek(TokenType.LBRACE)) {
            return null;
        }

        const consequence = this.parseBlockStatement()

        let alternative: BlockStatement | null = null
        if (this.peekTokenIs(TokenType.ELSE)) {
            this.nextToken()
            if (!this.expectPeek(TokenType.LBRACE)) {
                return null
            }
            alternative = this.parseBlockStatement()
        }
        return new IfExpression(token, condition, consequence, alternative)
    }

    private parseFunctionLiteral: PrefixParser = () => {
        const token = this.curToken;
        if (!this.expectPeek(TokenType.LPAREN)) {
            return null
        }
        const parameters = this.parseFunctionParameters()
        if (!this.expectPeek(TokenType.LBRACE)) {
            return null
        }
        const body = this.parseBlockStatement()
        return new FunctionLiteral(token, parameters, body)
    }

    private parseStringLiteral: PrefixParser = () => {
        return new StringLiteral(this.curToken, this.curToken.literal)
    }

    private parseHashLiteral: PrefixParser = () => {
        const token = this.curToken
        const pairs = new Map<Expression, Expression>()
        while (!this.peekTokenIs(TokenType.RBRACE)) {
            this.nextToken()
            const key = this.parseExpression(Precedence.LOWEST)
            if (!this.expectPeek(TokenType.COLON)) {
                return null
            }
            this.nextToken()
            const value = this.parseExpression(Precedence.LOWEST)
            if (key != null && value != null) {
                pairs.set(key, value)
            } else {
                throw new Error(`key:${key} or value:${value} are null`)
            }
            if (!this.peekTokenIs(TokenType.RBRACE) && !this.expectPeek(TokenType.COMMA)) {
                return null
            }
        }
        return !this.expectPeek(TokenType.RBRACE) ? null : new HashLiteral(token, pairs)
    }

    private parseInfixExpression: InfixParser = (left) => {
        const token = this.curToken;
        const operator = token.literal;
        const precedence = this.curPrecedence()
        this.nextToken()
        const right = this.parseExpression(precedence)
        return new InfixExpression(token, left, operator, right)
    }

    private parseCallExpression: InfixParser = (expression) => {
        const token = this.curToken;
        const args = this.parseExpressionList(TokenType.RPAREN)
        return new CallExpression(token, expression, args)
    }

    private parseIndexExpression: InfixParser = (left) => {
        const token = this.curToken;
        this.nextToken()
        const index = this.parseExpression(Precedence.LOWEST)
        if (!this.expectPeek(TokenType.RBRACKET)) {
            return null;
        }
        return new IndexExpression(token, left, index)
    }

    private _errors = new Array<string>()
    private curToken = new Token(TokenType.ILLEGAL, '')
    private peekToken = new Token(TokenType.ILLEGAL, '')
    private prefixParsers: Map<TokenType, PrefixParser> = new Map(
        [
            [TokenType.INT, this.parseIntegerLiteral],
            [TokenType.TRUE, this.parseBooleanLiteral],
            [TokenType.FALSE, this.parseBooleanLiteral],
            [TokenType.IDENT, this.parseIdentifier],
            [TokenType.BANG, this.parsePrefixExpression],
            [TokenType.MINUS, this.parsePrefixExpression],
            [TokenType.LPAREN, this.parseGroupExpression],
            [TokenType.LBRACKET, this.parseArrayLiteral],
            [TokenType.IF, this.parseIfExpression],
            [TokenType.FUNCTION, this.parseFunctionLiteral],
            [TokenType.STRING, this.parseStringLiteral],
            [TokenType.LBRACE, this.parseHashLiteral],
        ]
    );
    private infixParsers: Map<TokenType, InfixParser> = new Map(
        [
            [TokenType.PLUS, this.parseInfixExpression],
            [TokenType.MINUS, this.parseInfixExpression],
            [TokenType.SLASH, this.parseInfixExpression],
            [TokenType.ASTERISK, this.parseInfixExpression],
            [TokenType.EQ, this.parseInfixExpression],
            [TokenType.NOT_EQ, this.parseInfixExpression],
            [TokenType.LT, this.parseInfixExpression],
            [TokenType.GT, this.parseInfixExpression],
            [TokenType.LPAREN, this.parseCallExpression],
            [TokenType.LBRACKET, this.parseIndexExpression]
        ]
    );
    private precedences = new Map(
        [[TokenType.EQ, Precedence.EQUALS],
            [TokenType.NOT_EQ, Precedence.EQUALS],
            [TokenType.LT, Precedence.LESS_GREATER],
            [TokenType.GT, Precedence.LESS_GREATER],
            [TokenType.PLUS, Precedence.SUM],
            [TokenType.MINUS, Precedence.SUM],
            [TokenType.SLASH, Precedence.PRODUCT],
            [TokenType.ASTERISK, Precedence.PRODUCT],
            [TokenType.LPAREN, Precedence.CALL],
            [TokenType.LBRACKET, Precedence.INDEX]],
    )

    constructor(private lexer: Lexer) {
        this.nextToken();
        this.nextToken();
    }

    parseProgram(): Program {
        const statements = new Array<Statement>()
        while (this.curToken.tokenType !== TokenType.EOF) {
            const statement = this.parseStatement();
            if (statement !== null) {
                statements.push(statement)
            }
            this.nextToken()
        }
        return new Program(statements)
    }

    errors(): string[] {
        return this._errors;
    }

    private nextToken() {
        this.curToken = this.peekToken;
        this.peekToken = this.lexer.nextToken()
    }

    private parseStatement(): Statement | null {
        switch (this.curToken?.tokenType) {
            case TokenType.LET:
                return this.parseLetStatement()
            case TokenType.RETURN:
                return this.parseReturnStatement()
            default:
                return this.parseExpressionStatement()
        }
    }

    private parseLetStatement(): Statement | null {
        const token = this.curToken;
        if (!this.expectPeek(TokenType.IDENT)) {
            return null
        }
        const name = new Identifier(this.curToken, this.curToken?.literal)

        if (!this.expectPeek(TokenType.ASSIGN)) {
            return null
        }

        this.nextToken()

        const value = this.parseExpression(Precedence.LOWEST)

        if (this.peekTokenIs(TokenType.SEMICOLON)) {
            this.nextToken()
        }
        return new LetStatement(token, name, value)
    }

    private expectPeek(tokenType: TokenType) {
        if (this.peekTokenIs(tokenType)) {
            this.nextToken();
            return true
        }
        this.peekError(tokenType)
        return false
    }

    private peekTokenIs(tokenType: TokenType) {
        return this.peekToken?.tokenType == tokenType;
    }

    private peekError(tokenType: TokenType) {
        this._errors.push(`Expected next token to be ${tokenType}, got ${this.peekToken?.tokenType} instead`)
    }

    private parseExpression(precedence: Precedence): Expression | null {
        const prefix = this.prefixParsers.get(this.curToken.tokenType)
        if (prefix === undefined) {
            this.noPrefixParserError(this.curToken.tokenType);
            return null
        }
        let left = prefix()

        while (!this.peekTokenIs(TokenType.SEMICOLON) && (precedence < this.peekPrecedence())) {
            const infix = this.infixParsers.get(this.peekToken.tokenType)
            if (infix === undefined) {
                return left
            }
            this.nextToken()
            left = infix(left)
        }
        return left
    }

    private noPrefixParserError(tokenType: TokenType) {
        this._errors.push(`No prefix parser for ${tokenType} function`)
    }

    private peekPrecedence() {
        return this.findPrecedence(this.peekToken?.tokenType);
    }

    private findPrecedence(tokenType: TokenType): Precedence {
        const pre = this.precedences.get(tokenType)
        if (pre === undefined) {
            return Precedence.LOWEST
        }
        return pre
    }

    private parseExpressionStatement(): Statement {
        const token = this.curToken
        const expression = this.parseExpression(Precedence.LOWEST)
        if (this.peekTokenIs(TokenType.SEMICOLON)) {
            this.nextToken()
        }
        return new ExpressionStatement(token, expression)
    }

    private parseReturnStatement(): Statement {
        const token = this.curToken;
        this.nextToken();
        const returnValue = this.parseExpression(Precedence.LOWEST)
        while (this.peekTokenIs(TokenType.SEMICOLON)) {
            this.nextToken()
        }
        return new ReturnStatement(token, returnValue)
    }

    private curTokenIs(tokenType: TokenType) {
        return this.curToken.tokenType === tokenType
    }

    private curPrecedence(): Precedence {
        return this.findPrecedence(this.curToken.tokenType)
    }

    private parseExpressionList(end: TokenType): Array<Expression | null> | null {
        const args = new Array<Expression | null>()
        if (this.peekTokenIs(end)) {
            this.nextToken()
            return args
        }

        this.nextToken()
        args.push(this.parseExpression(Precedence.LOWEST))

        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken()
            this.nextToken()
            args.push(this.parseExpression(Precedence.LOWEST))
        }

        if (!this.expectPeek(end)) {
            return null
        }
        return args
    }

    private parseBlockStatement(): BlockStatement {
        const token = this.curToken
        const statements = new Array<Statement | null>()
        this.nextToken()
        while (!this.curTokenIs(TokenType.RBRACE) && !this.curTokenIs(TokenType.EOF)) {
            const statement = this.parseStatement()
            if (statement !== null) {
                statements.push(statement)
            }
            this.nextToken()
        }
        return new BlockStatement(token, statements)
    }

    private parseFunctionParameters(): Array<Identifier> | null {
        const parameters = Array<Identifier>()
        if (this.peekTokenIs(TokenType.RPAREN)) {
            this.nextToken()
            return parameters
        }
        this.nextToken()
        const token = this.curToken
        parameters.push(new Identifier(token, token.literal))

        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken()
            this.nextToken()
            const innerToken = this.curToken
            parameters.push(new Identifier(innerToken, innerToken.literal))
        }

        if (!this.expectPeek(TokenType.RPAREN)) {
            return null
        }

        return parameters

    }
}