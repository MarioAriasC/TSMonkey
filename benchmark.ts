import {MObject} from './src/objects';
import {Program} from './src/ast';
import {Parser} from './src/parser';
import {Lexer} from './src/lexer';
import {Environment, evaluate} from './src/evaluator';

export function measure(body: () => MObject) {
    // const start = new Date().getMilliseconds()
    const result = body()
    // const end = new Date().getMilliseconds() - start
    console.log(result.inspect())
}

function parse(input: string): Program {
    return new Parser(new Lexer(input)).parseProgram()
}

const env = Environment.newEnvironment()
measure(() => {
    return evaluate(parse(`let fibonacci = fn(x) {    	
        if (x < 2) {
        	return x;
        } else {
        	fibonacci(x - 1) + fibonacci(x - 2);
        }
    };
    fibonacci(35);`), env)!!
})