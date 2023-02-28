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
const querystring_1 = __importDefault(require("querystring"));
class Consulta {
    constructor(qrCodeURL) {
        this.axiosConfig = {
            method: 'get',
            params: {},
            timeout: 1000 * 60,
            url: 'http://www4.fazenda.rj.gov.br/consultaNFCe/QRCode',
        };
        this.code = '';
        const chaveNFe = qrCodeURL.searchParams.get('chNFe') ||
            qrCodeURL.searchParams.get('p') ||
            '';
        if (!chaveNFe.length) {
            throw new Error('Não foi possível detectar a chave do parâmetro');
        }
        this.axiosConfig.params.p = this.code = chaveNFe;
        this.axiosConfig.params.HML = false;
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield this.fetchToken();
            return this.fetchData(token.jsession, token.viewState)
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
        const objDataEmissao = moment_1.default.utc($('strong:nth-of-type(4)', scope)[0].next.data || '', format);
        const numero = $('strong:nth-of-type(2)', scope)[0].next.data || '';
        const serie = $('strong:nth-of-type(3)', scope)[0].next.data || '';
        const strTotal = $('#totalNota > #linhaTotal:nth-child(2) > span').html() ||
            '0';
        const strTributacao = $('#totalNota > #linhaTotal:nth-child(6) > span').html() ||
            '0';
        const dataEmissao = objDataEmissao.isValid()
            ? objDataEmissao.add(3, 'hours').toDate()
            : null;
        const total = Number(strTotal.split('.').join('').replace(',', '.'));
        const tributacao = Number(strTributacao.split('.').join('').replace(',', '.'));
        return {
            dataEmissao,
            numero,
            serie,
            total,
            tributacao,
            dataEntradaSaida: null,
            modelo: null,
        };
    }
    getEmitente() {
        var _a;
        const $ = this.html;
        const scope = '#conteudo > div:nth-child(2)';
        const nome = $('div:nth-child(1)', scope).html() || '';
        const razaoSocial = $('div:nth-child(1)', scope).html() || '';
        let cnpj = this.filter($('div:nth-child(2)', scope).html() || '');
        const endereco = ((_a = $('div:nth-child(3)', scope).html()) === null || _a === void 0 ? void 0 : _a.replace(/\t/g, '')) || '';
        cnpj = this.filter(cnpj.split(':')[1]);
        const aux = endereco.split(',');
        const rua = this.filter(`${aux[0]}, ${aux[1]}`);
        const bairro = this.filter(aux[3]);
        const estado = this.filter(aux[4]);
        const cidade = this.filter(aux[5]);
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
    filter(word) {
        return word
            .replace(/\t/g, '')
            .replace(/\n/g, '')
            .replace('&#xFFFD;', 'ó')
            .trim();
    }
    fetchToken() {
        return (0, axios_1.default)(this.axiosConfig)
            .then((res) => {
            const $ = cheerio.load(res.data);
            return {
                viewState: $('input[id="javax.faces.ViewState"]').val(),
                jsession: res.headers['set-cookie'][0].split('"')[1],
            };
        })
            .catch(() => {
            throw new Error('Não foi possível obter o token de acesso');
        });
    }
    fetchData(jsession, viewState) {
        const config = {
            method: 'post',
            url: `http://www4.fazenda.rj.gov.br/consultaNFCe/paginas/consultaQRCode.faces;jsessionid=${jsession}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: `JSESSIONID="${jsession}"; f5_cspm=1234;`,
            },
            data: querystring_1.default.stringify({
                formulario: 'formulario',
                'javax.faces.ViewState': viewState,
                btSubmitQRCode: 'btSubmitQRCode',
                p: this.code,
            }),
        };
        return (0, axios_1.default)(config)
            .then(res => res.data)
            .catch(() => {
            throw new Error('Não foi possível efetuar o download da NFE');
        });
    }
}
exports.default = Consulta;
