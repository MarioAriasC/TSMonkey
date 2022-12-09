import {Lexer} from './src/lexer';
import {Parser} from './src/parser';
import {Environment, evaluate} from './src/evaluator';

const env = Environment.newEnvironment()
console.log('Hello, this is the TSMonkey programming language')
console.log('>>')
for await (const line of console) {
    const lexer = new Lexer(line)
    const parser = new Parser(lexer)
    const program = parser.parseProgram()
    if (parser.errors().length > 0) {
        console.log('Woops! we ran into some monkey business here')
        console.log(' parser errors:')
        parser.errors().forEach((error) => {
            console.log(`\t${error}`)
        })
    }
    const output = evaluate(program, env)
    if (output !== null) {
        console.log(output.inspect())
    }
}