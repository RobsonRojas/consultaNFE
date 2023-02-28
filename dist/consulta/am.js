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
            responseType: 'document',
            params: {},
            timeout: 1000 * 60,
            url: 'https://sistemas.sefaz.am.gov.br/nfceweb/consultarNFCe.jsp',
        };
        const chaveNFe = qrCodeURL.searchParams.get('p') || '';
        if (chaveNFe === '')
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
        const info = this.getInfo();
        const objDataEmissao = moment_1.default.utc(info.data_emissao || '', format);
        const modelo = '';
        const numero = info.numero || '';
        const serie = info.serie || '';
        const total = info.valor_a_pagar || 0;
        const dataEmissao = objDataEmissao.isValid()
            ? objDataEmissao.add(4, 'hours').toDate()
            : null;
        return { dataEmissao, modelo, numero, serie, total, tributacao: null, dataEntradaSaida: null };
    }
    getInfo() {
        var _a;
        const $ = this.html;
        const totalNota = ((_a = $('#totalNota').text().trim()) === null || _a === void 0 ? void 0 : _a.split('\n\n\n')) || [];
        const aux = [];
        totalNota.forEach((element) => {
            element.trim().toLowerCase().split(':').filter((e) => {
                let str = '';
                if (!(e.includes('forma de pagamento') || e.includes('valor pago r$'))) {
                    str = e;
                }
                if (e.includes('cartão de crédito') || e.includes('dinheiro') || e.includes('troco')) {
                    str = e.replace('cartão de crédito', 'cartão de crédito:')
                        .replace('troco', 'troco:')
                        .replace('dinheiro', 'dinheiro:');
                }
                if (str !== '') {
                    str.split(':').forEach((e2) => {
                        const newAux = e2.trim().replace(/[ ]/g, '_')
                            .replace(/[/\n /\t]/g, '')
                            .replace('.', '')
                            .replace('_r$', '')
                            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                            .replace(',', '');
                        aux.push(newAux);
                    });
                }
            });
        });
        const data = [];
        for (let a = 0; a < aux.length; a += 2) {
            data[aux[a]] = aux[a].includes('qtd')
                ? parseInt(aux[a + 1], 10)
                : parseInt(aux[a + 1], 10) / 100;
        }
        const info = $('#infos').text();
        const startNumero = info.indexOf('Número:');
        const startSerie = info.indexOf('Série:');
        const startEmissao = info.indexOf('Emissão:');
        data.numero = info.substring(startNumero, startSerie).trim().replace(/\D/g, '');
        data.serie = info.substring(startSerie, startEmissao).trim().replace(/\D/g, '');
        const infoData = $('#infos').find('li').not('strong').text();
        const start = infoData.indexOf('Emissão:') + 'Emissão:'.length;
        const end = infoData.substring(start).indexOf('-');
        const dataStr = infoData.substring(start, start + end).trim();
        data.data_emissao = dataStr;
        const chave = $('.chave').text();
        data.chave = chave;
        return data;
    }
    getEmitente() {
        var _a;
        const $ = this.html;
        const nome = $('#u20').html() || '';
        const razaoSocial = $('#u20').html() || '';
        const cnpj = ((_a = $('.text', '#conteudo').html()) === null || _a === void 0 ? void 0 : _a.trim().replace(/[/\n /\t]/g, '')) || '';
        const end = $('.text', '#conteudo').next().text().split(',') || [];
        return {
            nome,
            razaoSocial,
            cnpj: cnpj.toString().replace(/[/\n /\t]/g, ''),
            estado: 'AM',
            rua: end[0].replace(/[/\n /\t]/g, '') || '',
            numero: end[1].replace(/[/\n /\t]/g, '') || '',
            bairro: end[3].replace(/[/\n /\t]/g, '') || '',
            cep: parseInt(end[3] ? end[3].replace(/\D/g, '') : '', 10) || null,
            cidade: end[4].replace(/[/\n /\t]/g, '') || '',
            telefone: null,
            ibge: null,
        };
    }
    getProdutos() {
        var _a, _b;
        const $ = this.html;
        const index = this.getInfo().qtd_total_de_itens;
        const lista = [];
        const MIL = 1000;
        for (let a = 1; a <= index; a++) {
            const descricao = ((_a = $('.txtTit', `#item_${a}`).html()) === null || _a === void 0 ? void 0 : _a.trim()) || '';
            let quantidadeStr = ($('.Rqtd', `#item_${a}`).text().trim().replace(/\D/g, ''));
            const unidade = $('.RUN', `#item_${a}`).text().split(':')[1].trim();
            const precoStr = $('.RvlUnit', `#item_${a}`).text().trim().replace(/\t/g, '').replace(/\n/g, '').replace(' ', '').replace('Vl.Unit.:', '');
            const codigo = Number($('.RCod', `#item_${a}`).text().split(':')[1].replace(' ', '').replace(')', '').trim());
            const valorStr = ((_b = $('.valor', `#item_${a}`).html()) === null || _b === void 0 ? void 0 : _b.trim().replace(/\t/g, '').replace(/\n/g, '').replace(' ', '')) || '';
            quantidadeStr = unidade.includes('UN')
                ? quantidadeStr
                : quantidadeStr.concat('0'.repeat(4 - quantidadeStr.length));
            const preco = Number(precoStr.replace(',', '.'));
            const valorTotal = Number(valorStr.replace(',', '.')) || null;
            const quantidade = unidade.includes('UN')
                ? Number(quantidadeStr)
                : Number(quantidadeStr) / MIL;
            lista.push({
                descricao,
                quantidade,
                unidade,
                preco,
                codigo,
                NCM: null,
                eanComercial: null,
                valor_total: valorTotal,
            });
        }
        return lista;
    }
    fetchData() {
        return (0, axios_1.default)(this.axiosConfig)
            .then((res) => {
            return res.data.replace(/id=\"Item \+ /g, 'id="item_');
        })
            .catch(() => { throw new Error('Não foi possível efetuar o download da NFE'); });
    }
}
exports.default = Consulta;
