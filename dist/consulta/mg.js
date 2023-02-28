"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const moment_1 = __importDefault(require("moment"));
class Consulta {
    constructor(qrCodeURL) {
        this.axiosConfig = {
            method: 'get',
            params: {},
            timeout: 1000 * 60,
            url: 'http://nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml',
        };
        const chaveNFe = qrCodeURL.searchParams.get('chNFe')
            || qrCodeURL.searchParams.get('p')
            || '';
        if (!chaveNFe.length)
            throw new Error('Não foi possível detectar a chave do parâmetro');
        this.axiosConfig.params.p = chaveNFe;
        this.axiosConfig.params.HML = false;
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetchData()
                .then(cheerio.load)
                .then((html) => {
                this.html = html;
                return {
                    cabecalho: this.getCabecalho(),
                    emitente: this.getEmitente(),
                    produtos: this.getProdutos(),
                };
            });
        });
    }
    getCabecalho() {
        const $ = this.html;
        const format = 'DD/MM/YYYY HH:mm:ssZ';
        const scope = '#collapse4';
        const objDataEmissaoStr = $('table:nth-of-type(3) > tbody > tr > td:nth-child(4)', scope)
            .html();
        const objDataEmissao = moment_1.default.utc(objDataEmissaoStr || '', format);
        const modelo = $('table:nth-of-type(3) > tbody > tr > td:nth-child(1)', scope).html() || '';
        const numero = $('table:nth-of-type(3) > tbody > tr > td:nth-child(3)', scope).html() || '';
        const serie = $('table:nth-of-type(3) > tbody > tr > td:nth-child(2)', scope).html() || '';
        const strTotal = $('table:nth-of-type(4) > tbody > tr > td:nth-child(1)', scope)
            .html() || '0';
        const dataEmissao = objDataEmissao.isValid()
            ? objDataEmissao.add(3, 'hours').toDate()
            : null;
        const total = Number(strTotal.split(' ')[1].split('.').join('').replace(',', '.'));
        return { dataEmissao, modelo, numero, serie, total, tributacao: null, dataEntradaSaida: null };
    }
    getEmitente() {
        const $ = this.html;
        const scope = '#collapse4';
        const nome = $('table:nth-of-type(1) > tbody > tr > td:nth-child(1)', scope).html() || '';
        const razaoSocial = $('table:nth-of-type(1) > tbody > tr > td:nth-child(1)', scope)
            .html() || '';
        const cnpj = $('table:nth-of-type(1) > tbody > tr > td:nth-child(2)', scope).html() || '';
        const estado = $('table:nth-of-type(1) > tbody > tr > td:nth-child(4)', scope).html() || '';
        return {
            nome,
            razaoSocial,
            cnpj,
            estado,
            rua: null,
            bairro: null,
            cep: null,
            cidade: null,
            telefone: null,
            ibge: null,
        };
    }
    getProdutos() {
        const $ = this.html;
        let scope;
        const lista = [];
        let count = 0;
        while (true) {
            count += 1;
            scope = `#myTable > tr:nth-child(${count + 0})`;
            const descricao = $('td:nth-child(1) > h7', scope).html();
            let quantidade = $('td:nth-child(2)', scope).html();
            const unidade = $('td:nth-child(3)', scope).html();
            const preco = $('td:nth-child(4)', scope).html();
            let quantidadeN;
            const selectorCodigo = 'td:nth-child(1)';
            let codigo = $(selectorCodigo, scope).html();
            if (codigo) {
                codigo = codigo.split(': ')[1].replace(')', '');
            }
            if (quantidade) {
                const quantidadeArr = quantidade.split(' ');
                quantidade = quantidadeArr[quantidadeArr.length - 1].replace(')', '');
                quantidadeN = parseFloat(quantidade);
            }
            if (descricao === null)
                break;
            lista.push({ descricao, quantidadeN, unidade, preco, codigo, NCM: null, eanComercial: null });
        }
        return lista.map((produto) => {
            const descricao = produto.descricao.split('\n')[0];
            const quantidade = Number(produto.quantidadeN);
            const unidade = produto.unidade.split(' ')[1];
            const preco = Number(produto.preco.split(' ')[4].split('.').join().replace(',', '.'));
            const codigo = Number(produto.codigo) || null;
            return { descricao, quantidade, unidade, preco, codigo, NCM: null, eanComercial: null };
        });
    }
    fetchData() {
        return (0, axios_1.default)(this.axiosConfig)
            .then(res => res.data)
            .catch(() => { throw new Error('Não foi possível efetuar o download da NFE'); });
    }
}
exports.default = Consulta;
