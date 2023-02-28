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
            url: 'http://www.sefaz.rs.gov.br/ASP/AAE_ROOT/NFE/SAT-WEB-NFE-COM_2.asp',
        };
        let chaveNFe = qrCodeURL.searchParams.get('chNFe')
            || qrCodeURL.searchParams.get('p')
            || '';
        chaveNFe = chaveNFe.split('|')[0];
        if (!chaveNFe.length)
            throw new Error('Não foi possível detectar a chave do parâmetro');
        this.axiosConfig.params.chaveNFe = chaveNFe;
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
        const scope = '#NFe > fieldset:nth-child(1) > table > tbody > tr';
        const objDataEmissao = moment_1.default.utc($('td:nth-child(4) > span', scope).html() || '', format);
        const objDataEntradaSaida = moment_1.default.utc($('td:nth-child(5) > span', scope).html() || '', format);
        const modelo = $('td:nth-child(1) > span', scope).html() || '';
        const numero = $('td:nth-child(3) > span', scope).html() || '';
        const serie = $('td:nth-child(2) > span', scope).html() || '';
        const strTotal = $('td:nth-child(6) > span', scope).html() || '0';
        const dataEmissao = objDataEmissao.isValid()
            ? objDataEmissao.toDate()
            : null;
        const dataEntradaSaida = objDataEntradaSaida.isValid()
            ? objDataEntradaSaida.toDate()
            : null;
        const total = Number(strTotal.split('.').join('').replace(',', '.'));
        return { dataEmissao, dataEntradaSaida, modelo, numero, serie, total, tributacao: null };
    }
    getEmitente() {
        const $ = this.html;
        const scope = '#Emitente > fieldset > table > tbody';
        const nome = $('tr.col-2 > td:nth-child(2) > span', scope).html() || '';
        const razaoSocial = $('tr.col-2 > td:nth-child(1) > span', scope).html() || '';
        const cnpj = $('tr:nth-child(2) > td:nth-child(1) > span', scope).html() || '';
        let rua = $('tr:nth-child(2) > td:nth-child(2) > span', scope).html() || '';
        const bairro = $('tr:nth-child(3) > td:nth-child(1) > span', scope).html() || '';
        const strCep = $('tr:nth-child(3) > td:nth-child(2) > span', scope).html() || '';
        const strCidade = $('tr:nth-child(4) > td:nth-child(1) > span', scope).html() || '';
        const telefone = $('tr:nth-child(4) > td:nth-child(2) > span', scope).html() || '';
        const estado = $('tr:nth-child(5) > td:nth-child(1) > span', scope).html() || '';
        rua = rua.split('\n').join().split('&#xFFFD;').join();
        while (rua.length !== rua.split('  ').join(' ').length) {
            rua = rua.split('  ').join(' ');
        }
        while (rua.length !== rua.split(',,').join(',').length) {
            rua = rua.split(',,').join(',');
        }
        rua = rua.replace(/,\s*$/, '');
        const cep = Number(strCep.trim().replace('-', '')) || null;
        const cidade = strCidade.split('-')[1].trim();
        const ibge = Number(strCidade.split('-')[0].trim());
        return { nome, razaoSocial, cnpj, rua, bairro, cep, cidade, telefone, estado, ibge };
    }
    getProdutos() {
        const $ = this.html;
        let scope1;
        let scope2;
        const lista = [];
        let count = 0;
        while (true) {
            count += 2;
            scope1 = `#Prod > fieldset > div > table:nth-child(${count + 0}) > tbody > tr`;
            scope2 = `#Prod > fieldset > div > table:nth-child(${count + 1}) > tbody > tr > td`;
            const descricao = $('td.fixo-prod-serv-descricao > span', scope1).html();
            const quantidade = $('td.fixo-prod-serv-qtd > span', scope1).html();
            const unidade = $('td.fixo-prod-serv-uc > span', scope1).html();
            const preco = $('td.fixo-prod-serv-vb > span', scope1).html();
            const selectorCodigo = 'table:nth-child(1) > tbody > tr.col-4 > td:nth-child(1) > span';
            const codigo = $(selectorCodigo, scope2).html();
            const selectorNCM = 'table:nth-child(1) > tbody > tr.col-4 > td:nth-child(2) > span';
            const NCM = $(selectorNCM, scope2).html();
            const selectorEANComercial = 'table:nth-child(3) > tbody > tr.col-3 > td:nth-child(1) > span';
            const eanComercial = $(selectorEANComercial, scope2).html();
            if (descricao === null)
                break;
            lista.push({ descricao, quantidade, unidade, preco, codigo, NCM, eanComercial });
        }
        return lista.map((produto) => {
            const descricao = produto.descricao.split('&amp;').join('');
            const quantidade = Number(produto.quantidade.split('.').join().replace(',', '.'));
            const unidade = produto.unidade.trim();
            const preco = Number(produto.preco.split('.').join().replace(',', '.'));
            const codigo = Number(produto.codigo.trim()) || null;
            const NCM = Number(produto.NCM.trim()) || null;
            const eanComercial = Number(produto.eanComercial.trim()) || null;
            return { descricao, quantidade, unidade, preco, codigo, NCM, eanComercial };
        });
    }
    fetchData() {
        return (0, axios_1.default)(this.axiosConfig)
            .then(res => res.data)
            .catch(() => { throw new Error('Não foi possível efetuar o download da NFE'); });
    }
}
exports.default = Consulta;
