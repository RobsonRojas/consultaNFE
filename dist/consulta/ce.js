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
        var _a;
        this.axiosConfig = {
            method: 'post',
            params: {},
            timeout: 1000 * 60,
            url: 'http://nfce.sefaz.ce.gov.br/nfce/api/notasFiscal/qrcodev2/',
        };
        const chaveNFe = ((_a = qrCodeURL.searchParams.get('p')) === null || _a === void 0 ? void 0 : _a.split('|')) || [];
        if (!chaveNFe.length)
            throw new Error('Não foi possível detectar a chave do parâmetro');
        this.axiosConfig.data = {
            chave_acesso: chaveNFe[0],
            versao_qrcode: chaveNFe[1],
            tipo_ambiente: chaveNFe[2],
            identificador_csc: chaveNFe[3],
            codigo_hash: chaveNFe[4],
        };
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
        const scope = '#infos > div:nth-child(1) > ul > li';
        const objDataEmissao = moment_1.default.utc($('strong:nth-of-type(5)', scope)[0].next.data || '', format);
        const numero = $('strong:nth-of-type(3)', scope)[0].next.data || '';
        const serie = $('strong:nth-of-type(4)', scope)[0].next.data || '';
        const strTotal = $('#totalNota > #linhaTotal:nth-child(2) > span').html() ||
            '0';
        const dataEmissao = objDataEmissao.isValid()
            ? objDataEmissao.add(3, 'hours').toDate()
            : null;
        const total = Number(strTotal.split('.').join('').replace(',', '.'));
        return {
            dataEmissao,
            numero,
            serie,
            total,
            tributacao: null,
            dataEntradaSaida: null,
            modelo: null,
        };
    }
    getEmitente() {
        const $ = this.html;
        const scope = '#conteudo > div:nth-child(2)';
        const nome = $('div:nth-child(1)', scope).html() || '';
        const razaoSocial = $('div:nth-child(1)', scope).html() || '';
        let cnpj = $('div:nth-child(2)', scope).html() || '';
        const endereco = $('div:nth-child(3)', scope).html() || '';
        cnpj = cnpj.split(':')[1];
        const aux = endereco.split(',');
        const rua = `${aux[0]}, ${aux[1]}`;
        const bairro = aux[3];
        const estado = aux[4];
        const cidade = aux[5];
        return {
            nome,
            razaoSocial,
            cnpj,
            rua,
            bairro,
            cidade,
            estado,
            telefone: null,
            cep: null,
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
            scope = `#conteudo > table > tbody > tr:nth-of-type(${count}) > td`;
            const descricao = $('span:nth-of-type(1)', scope).html();
            if (descricao === null)
                break;
            const codigo = $('span:nth-of-type(2)', scope).text();
            const quantidade = $('span:nth-of-type(3) > strong', scope)[0]
                .next.data;
            const unidade = $('span:nth-of-type(4) > strong', scope)[0]
                .next.data;
            const preco = $('span:nth-of-type(5) > strong', scope)[0].next
                .data;
            lista.push({
                descricao,
                quantidade,
                unidade,
                preco,
                codigo,
                NCM: null,
                eanComercial: null,
            });
        }
        return lista.map((produto) => {
            const descricao = produto.descricao
                .split('&amp;')
                .join('');
            const quantidade = Number(produto.quantidade
                .split('.')
                .join()
                .replace(',', '.'));
            const unidade = produto.unidade.trim();
            const preco = Number(produto.preco.split('.').join().replace(',', '.'));
            const codigo = Number(produto.codigo
                .split(':')[1]
                .split(')')[0]
                .trim()) || null;
            return {
                descricao,
                quantidade,
                unidade,
                preco,
                codigo,
                NCM: null,
                eanComercial: null,
            };
        });
    }
    fetchData() {
        return (0, axios_1.default)(this.axiosConfig)
            .then(res => res.data.xml)
            .catch(() => {
            throw new Error('Não foi possível efetuar o download da NFE');
        });
    }
}
exports.default = Consulta;
