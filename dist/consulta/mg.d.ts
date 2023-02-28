import nfeDados from '../nfe-dados';
export default class Consulta {
    private axiosConfig;
    private html;
    constructor(qrCodeURL: URL);
    get(): Promise<nfeDados>;
    private getCabecalho;
    private getEmitente;
    private getProdutos;
    private fetchData;
}
