
const cryp_access = require('crypto');
const algorithm = 'aes-256-ctr';

class ui5PassworDef {
    private _secretKey: string;
    private _iv: Buffer;
    constructor() {
        this._secretKey = process.env.E2E_PW_PASSWORD ? process.env.E2E_PW_PASSWORD : "NONE";
        this._iv = Buffer.from(process.env.E2E_PW_SEED ? process.env.E2E_PW_SEED : "NONE", 'hex');
    }

    decrypt(hash: string): string {
        const decipher = cryp_access.createDecipheriv(algorithm, this._secretKey, this._iv);
        const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash, 'hex')), decipher.final()]);
        return decrpyted.toString();
    }

    encrypt(text: string): string {
        const cipher = cryp_access.createCipheriv(algorithm, this._secretKey, this._iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return encrypted.toString('hex');
    }
}

export let ui5Password = new ui5PassworDef();