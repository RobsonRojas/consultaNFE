import nfeDados from '../nfe-dados';
export default class Consulta {
    private axiosConfig;
    private html;
    private code;
    constructor(qrCodeURL: URL);
    get(): Promise<nfeDados>;
    private getCabecalho;
    private getEmitente;
    private getProdutos;
    private filter;
    private fetchToken;
    private fetchData;
}
