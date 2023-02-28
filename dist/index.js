"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const consulta_1 = __importDefault(require("./consulta"));
module.exports = class ConsultaNFE {
    constructor(url) {
        this.uf = '';
        this.consulta = consulta_1.default;
        this.qrCodeURL = new URL(url);
        this.detectUF();
        this.consulta = new this.consulta[this.uf](this.qrCodeURL);
    }
    get() {
        return this.consulta.get();
    }
    detectUF() {
        const lstHostSefaz = {
            'www.sefaz.rs.gov.br': 'rs',
            'nfce.fazenda.mg.gov.br': 'mg',
            'portalsped.fazenda.mg.gov.br': 'mg',
            'nfce.sefaz.ce.gov.br': 'ce',
            'nfce.set.rn.gov.br': 'rn',
            'sistemas.sefaz.am.gov.br': 'am',
            'www4.fazenda.rj.gov.br': 'rj',
        };
        this.uf = lstHostSefaz[this.qrCodeURL.host.trim().toLowerCase()] || '';
        if (!this.uf.length)
            throw new Error('Não foi possível detectar a UF');
    }
};
