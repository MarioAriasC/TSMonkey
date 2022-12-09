# TSMonkey
An implementation of the [Monkey Language](https://monkeylang.org/) on TypeScript running on [Bun](https://bun.sh/)
                                                                                                                   
TSMonkey has many sibling implementations

* Kotlin: [monkey.kt](https://github.com/MarioAriasC/monkey.kt)
* Crystal: [Monyet](https://github.com/MarioAriasC/monyet)
* Scala 3: [Langur](https://github.com/MarioAriasC/langur)
* Ruby 3: [Pepa](https://github.com/MarioAriasC/pepa)
* Python 3.10 [Bruno](https://github.com/MarioAriasC/bruno)
* Lua [Julieta](https://github.com/MarioAriasC/julieta)

## Status

The book ([Writing An Interpreter In Go](https://interpreterbook.com/)) is fully implemented. Bruno will not have a
compiler implementation

## Commands

### Prerequisites

Bun installed and running in your machine. You can test it by running the command:

```shell
bun --version
```

```
0.3.0
```

| Command                | Description                                        |
|------------------------|----------------------------------------------------|
| `bun install`          | Install all the packages using bun                 |
| `bun jest`             | Run tests                                          |
| `bun run benchmark.ts` | Run the classic monkey benchmark (`fibonacci(35)`) |
| `bun run index.ts`     | Run the TSMonkey REPL                              |