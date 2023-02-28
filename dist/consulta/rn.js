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
            timeout: 1000 * 60 * 2,
            url: 'http://nfce.set.rn.gov.br/portalDFE/NFCe/mDadosNFCe.aspx',
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
        var _a;
        const $ = this.html;
        const format = 'DD/MM/YYYY HH:mm:ssZ';
        const scope = '#divConteudoDanfe';
        const objDataEmissaoStr = ((_a = $('#lblDataEmissao', scope).html()) === null || _a === void 0 ? void 0 : _a.trim()) || '';
        const objDataEmissao = moment_1.default.utc(objDataEmissaoStr.substr(-19), format);
        const modelo = '';
        const numeroSerie = $('#lblNumeroSerie', scope).html() || '';
        const regex = /([0-9]{2,10})|([0-9]{2,10})/g;
        const numeroRegex = regex.exec(numeroSerie);
        regex.lastIndex += 1;
        const serieRegex = regex.exec(numeroSerie);
        const numero = (numeroRegex ? numeroRegex[0] : '') || '';
        const serie = (serieRegex ? serieRegex[0] : '') || '';
        const strTotal = $('#lblValorPago', scope)
            .html() || '0';
        const dataEmissao = objDataEmissao.isValid()
            ? objDataEmissao.add(3, 'hours').toDate()
            : null;
        const total = Number(strTotal.split('.').join('').replace(',', '.'));
        return { dataEmissao, modelo, numero, serie, total, tributacao: null, dataEntradaSaida: null };
    }
    getEmitente() {
        const $ = this.html;
        const scope = '#divConteudoDanfe > .bloco:nth-of-type(2) > table > tbody';
        let nome = $('tr:nth-of-type(3) > td > span', scope).html() || '';
        const razaoSocial = $('tr:nth-of-type(2) > td > span', scope)
            .html() || '';
        let cnpj = $('tr:nth-of-type(4) > td > span', scope).html() || '';
        const posicaoInicialCnpj = 6;
        const posicaoInicialRazaoSocial = razaoSocial.indexOf(':') + 2;
        if (!/^\d{2}.\d{3}.\d{3}\/\d{4}-\d{2}$/s.test(cnpj.substr(posicaoInicialCnpj))) {
            cnpj = nome;
            nome = `NOME FANTASIA: ${razaoSocial.substr(posicaoInicialRazaoSocial)}`;
        }
        const posicaoInicialNome = nome.indexOf(':') + 2;
        return {
            nome: nome.substr(posicaoInicialNome),
            razaoSocial: razaoSocial.substr(posicaoInicialRazaoSocial),
            cnpj: cnpj.substr(posicaoInicialCnpj),
            estado: 'RN',
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
        let count = 1;
        while (true) {
            count += 1;
            scope = `#tbItensList > tbody > tr:nth-child(${count + 0})`;
            const descricao = $('td:nth-child(3) > span', scope).html();
            const quantidade = $('td:nth-child(4) > span', scope).html();
            const unidade = $('td:nth-child(5) > span', scope).html();
            const strPreco = $('td:nth-child(7) > span', scope).html() || '0';
            const preco = strPreco.split('.').join('').replace(',', '.');
            if (descricao === null)
                break;
            lista.push({
                descricao,
                quantidade,
                unidade,
                preco,
                codigo: null,
                NCM: null,
                eanComercial: null,
            });
        }
        return lista.map((produto) => {
            const descricao = produto.descricao.split('\n')[0];
            const quantidade = Number(produto.quantidade.replace('.', '').replace(',', '.'));
            const unidade = produto.unidade;
            const preco = Number(produto.preco.split('.').join().replace(',', '.'));
            return { descricao, quantidade, unidade, preco, codigo: null, NCM: null, eanComercial: null };
        });
    }
    fetchData() {
        return (0, axios_1.default)(this.axiosConfig)
            .then(res => res.data)
            .catch(() => { throw new Error('Não foi possível efetuar o download da NFE'); });
    }
}
exports.default = Consulta;
