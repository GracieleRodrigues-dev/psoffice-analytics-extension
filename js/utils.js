async function buscarFeriados(ano) {
    const cacheKey = `feriados_${ano}`;
    const cache = localStorage.getItem(cacheKey);
    if (cache) return JSON.parse(cache);

    try {
        const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
        const data = await response.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (error) {
        return [];
    }
}

function parseHoras(valor) {
    if (!valor || valor === "" || valor === "-") return 0;
    if (valor.includes(":")) {
        const [h, m] = valor.split(":").map(Number);
        return parseFloat(h) + (parseFloat(m) / 60);
    }
    return parseFloat(valor.replace(",", "."));
}

function horasParaSegundos(h) {
    return Math.round(h * 3600);
}

function segundosParaHHMMSS(seg) {
    if (isNaN(seg) || seg < 0) return "00:00:00";
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatarDiaLabel(dataStr) {
    if (!dataStr) return "";
    const [dia, mes, ano] = dataStr.split("/");
    const data = new Date(ano, mes - 1, dia);
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return `${diasSemana[data.getDay()]} ${dia}`;
}

function getWeekRange(dateStr) {
    if (!dateStr) return "";
    const [d, m, y] = dateStr.split("/");
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    return `${fmt(start)} - ${fmt(end)}`;
}

function parseDataBR(dataStr) {
    const [d, m, y] = dataStr.split("/");
    return new Date(y, m - 1, d);
}

function calcularEstatisticasPeriodo(startDate, endDate, feriados = []) {
    let totalDias = 0;
    let finsDeSemana = 0;
    let diasFeriado = 0;
    let diasUteis = 0;
    
    if (!startDate || !endDate) return { totalDias, finsDeSemana, diasFeriado, diasUteis };

    let curDate = new Date(startDate.getTime());
    curDate.setHours(0,0,0,0);
    const end = new Date(endDate.getTime());
    end.setHours(0,0,0,0);
    
    const feriadosDatas = feriados.map(f => {
        const [y, m, d] = f.date.split('-');
        return `${d}/${m}/${y}`;
    });

    while (curDate <= end) {
        totalDias++;
        const dayOfWeek = curDate.getDay();
        const dataStr = `${String(curDate.getDate()).padStart(2, '0')}/${String(curDate.getMonth() + 1).padStart(2, '0')}/${curDate.getFullYear()}`;
        
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isFeriado = feriadosDatas.includes(dataStr);

        if (isWeekend) {
            finsDeSemana++;
        } else if (isFeriado) {
            diasFeriado++; 
        }
        
        if (!isWeekend && !isFeriado) {
            diasUteis++;
        }

        curDate.setDate(curDate.getDate() + 1);
    }
    
    return { totalDias, finsDeSemana, diasFeriado, diasUteis };
}

function getDiasUteis(startDate, endDate, feriados = []) {
    return calcularEstatisticasPeriodo(startDate, endDate, feriados).diasUteis;
}