import {MBoolean, MInteger, MString, MValue} from '../src/objects';

describe('object tests', () => {
    test('map and keys', () => {
        const hash = new Map<string, number>(
            [
                [new MInteger(1).hashKey(), 1],
                [new MBoolean(true).hashKey(), 1],
                [new MString('true').hashKey(), 1]
            ]
        )

        expect(hash.get(new MInteger(1).toString())).toBe(1)
        expect(hash.get(new MBoolean(true).toString())).toBe(1)
        expect(hash.get(new MString('true').toString())).toBe(1)
    })

})