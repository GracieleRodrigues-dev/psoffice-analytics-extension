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

function getDiasUteis(startDate, endDate) {
    let count = 0;
    let curDate = new Date(startDate.getTime());
    curDate.setHours(0,0,0,0);
    const end = new Date(endDate.getTime());
    end.setHours(0,0,0,0);
    
    while (curDate <= end) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}