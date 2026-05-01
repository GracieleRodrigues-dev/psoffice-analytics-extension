function extrairPeriodo() {
    const table = document.getElementById("tableReport");
    if (table) {
        const match = table.innerText.match(/de\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/i);
        if (match) return { inicio: match[1], fim: match[2] };
    }
    
    const inputs = document.querySelectorAll("input[type='text']");
    for (let input of inputs) {
        const m = input.value.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
        if (m) return { inicio: m[1], fim: m[2] };
    }
    return null;
}

function coletarDadosTabela() {
    const rows = document.querySelectorAll("#tableReport tbody tr");
    const dados = [];
    const regexData = /^\d{2}\/\d{2}\/\d{4}$/;
    
    rows.forEach(row => {
        if (!row.classList.contains("DataTD") && !row.classList.contains("AltDataTD")) return;
        const cols = Array.from(row.querySelectorAll("td"));
        const textos = cols.map(td => td.innerText.trim());
        
        let startIndex = -1;
        if (regexData.test(textos[0])) startIndex = 0;
        else if (regexData.test(textos[1])) startIndex = 1;
        
        if (startIndex !== -1) {
            const dataStr = textos[startIndex];
            const projetoStr = textos[startIndex + 1];
            const horasStr = textos[startIndex + 4];
            const horasDecimais = parseHoras(horasStr);
            
            if (projetoStr && horasDecimais > 0) {
                dados.push({ data: dataStr, projeto: projetoStr, segundos: horasParaSegundos(horasDecimais) });
            }
        }
    });
    return dados;
}