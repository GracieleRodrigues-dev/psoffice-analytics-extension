function gerarDashboard() {
    const dados = coletarDadosTabela();
    if (!dados || dados.length === 0) return;

    const periodo = extrairPeriodo();
    criarDashboardContainer();

    const porDia = agruparPorDia(dados);
    const porProjeto = agruparPorProjeto(dados);
    const totalSegundos = calcularTotal(dados);

    document.getElementById("ps-total").innerText = segundosParaHHMMSS(totalSegundos);

    gerarListaSemanal(dados);
    configurarFinanceiro(totalSegundos, periodo);
    configurarMetasEGraficos(dados, porDia, porProjeto, periodo, totalSegundos);
}

function configurarFinanceiro(totalSegundos, periodo) {
    const inputRate = document.getElementById("ps-rate-input");
    const earningsDisplay = document.getElementById("ps-earnings");
    const projecaoDisplay = document.getElementById("ps-projecao-val");
    const projecaoMediaDisplay = document.getElementById("ps-projecao-media");
    const toggleBtn = document.getElementById("ps-toggle-eye");
    let isHidden = true; 
    
    inputRate.value = localStorage.getItem("psHourlyRate") || "";

    function atualizarValor() {
        let rate = parseFloat(inputRate.value.replace(',', '.')) || 0;
        localStorage.setItem("psHourlyRate", inputRate.value); 
        
        const totalHoras = totalSegundos / 3600;
        const totalDinheiro = totalHoras * rate;

        let projecaoDinheiro = 0;
        let hasPeriodoValido = false;
        let mediaFormatada = "0.00";

        if (periodo) {
            const inicio = parseDataBR(periodo.inicio);
            const fim = parseDataBR(periodo.fim);
            const diasUteisTotais = getDiasUteis(inicio, fim);

            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            
            let limitDate = hoje > fim ? fim : (hoje < inicio ? inicio : hoje);
            let diasUteisPassados = getDiasUteis(inicio, limitDate);

            if (diasUteisPassados === 0 && diasUteisTotais > 0) diasUteisPassados = 1;

            if (diasUteisTotais > 0 && diasUteisPassados > 0) {
                const mediaHorasPorDia = totalHoras / diasUteisPassados;
                mediaFormatada = mediaHorasPorDia.toFixed(2);
                const projecaoHoras = mediaHorasPorDia * diasUteisTotais;
                projecaoDinheiro = projecaoHoras * rate;
                hasPeriodoValido = true;
            }
        }
        
        if (isHidden) {
            earningsDisplay.innerText = "R$ --------";
            if (projecaoDisplay) projecaoDisplay.innerText = "R$ --------";
            if (projecaoMediaDisplay) projecaoMediaDisplay.innerText = `MÉDIA: --h / DIA ÚTIL`;
            inputRate.type = "password";
            toggleBtn.style.opacity = "0.5";
        } else {
            earningsDisplay.innerText = totalDinheiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            if (projecaoDisplay) {
                if (hasPeriodoValido) {
                    projecaoDisplay.innerText = projecaoDinheiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    projecaoMediaDisplay.innerText = `MÉDIA: ${mediaFormatada}h / DIA ÚTIL`;
                } else {
                    projecaoDisplay.innerText = "Filtre Período";
                    projecaoMediaDisplay.innerText = "MÉDIA: --h / DIA ÚTIL";
                }
            }
            inputRate.type = "text";
            toggleBtn.style.opacity = "1";
        }
    }
    inputRate.addEventListener("input", atualizarValor);
    toggleBtn.addEventListener("click", () => { isHidden = !isHidden; atualizarValor(); });
    atualizarValor();
}

function configurarMetasEGraficos(dados, porDia, porProjeto, periodo, totalSegundos) {
    const inputMeta = document.getElementById("ps-goal-input");
    inputMeta.value = localStorage.getItem("psDailyGoal") || "8.8";

    function atualizarGraficosEMetas() {
        const metaDiaria = parseFloat(inputMeta.value.replace(',', '.')) || 8.8;
        localStorage.setItem("psDailyGoal", inputMeta.value);

        const metaAtingida = totalSegundos / 3600;
        let ritmo = 0, saldo = 0, metaTotal = 0;

        if (periodo) {
            const inicio = parseDataBR(periodo.inicio);
            const fim = parseDataBR(periodo.fim);
            const diasUteisTotais = getDiasUteis(inicio, fim);
            
            metaTotal = diasUteisTotais * metaDiaria;

            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            
            let limitDate = hoje > fim ? fim : (hoje < inicio ? inicio : hoje);
            const diasUteisPassados = getDiasUteis(inicio, limitDate);
            const diasUteisRestantes = diasUteisTotais - diasUteisPassados;

            saldo = metaAtingida - (diasUteisPassados * metaDiaria);

            if (diasUteisRestantes > 0) {
                ritmo = Math.max(0, (metaTotal - metaAtingida) / diasUteisRestantes);
            } else if (diasUteisRestantes === 0 && metaAtingida < metaTotal) {
                ritmo = metaTotal - metaAtingida;
            }
        }

        const saldoEl = document.getElementById("ps-saldo-val");
        const ritmoEl = document.getElementById("ps-ritmo-val");
        
        if (periodo) {
            saldoEl.innerText = (saldo >= 0 ? "+" : "") + saldo.toFixed(2) + "h";
            saldoEl.style.color = saldo >= 0 ? "#84cc16" : "#f43f5e";
            
            if (ritmo === 0 && metaAtingida >= metaTotal) {
                ritmoEl.innerText = "Meta Atingida! 🎉";
                ritmoEl.style.color = "#84cc16";
            } else {
                ritmoEl.innerText = ritmo.toFixed(2) + "h / dia";
                ritmoEl.style.color = "#3b82f6";
            }
            
            document.getElementById("ps-meta-pct").innerText = metaTotal > 0 ? Math.round((metaAtingida / metaTotal) * 100) + "%" : "0%";
            document.getElementById("ps-meta-total-text").innerText = `${metaAtingida.toFixed(1)}h / ${metaTotal.toFixed(1)}h`;
        } else {
            saldoEl.innerText = "Filtre um período";
            ritmoEl.innerText = "--";
        }

        const porDiaCompleto = preencherDiasVazios(porDia, periodo);

        gerarGraficoDias(porDiaCompleto, metaDiaria);
        gerarGraficoProjetos(porProjeto);
        if (periodo) gerarGraficoVelocimetro(metaAtingida, metaTotal);
    }

    inputMeta.addEventListener("input", atualizarGraficosEMetas);
    atualizarGraficosEMetas(); 
}

function preencherDiasVazios(dadosPorDia, periodo) {
    let start, end;
    if (periodo) {
        start = parseDataBR(periodo.inicio);
        end = parseDataBR(periodo.fim);
    } else {
        const datasStr = Object.keys(dadosPorDia);
        if (datasStr.length === 0) return {};
        const datas = datasStr.map(d => parseDataBR(d));
        start = new Date(Math.min(...datas));
        end = new Date(Math.max(...datas));
    }

    start.setDate(start.getDate() - start.getDay());
    end.setDate(end.getDate() + (6 - end.getDay()));

    const diasCompletos = {};
    let atual = new Date(start);

    while (atual <= end) {
        const dataStr = `${String(atual.getDate()).padStart(2, '0')}/${String(atual.getMonth() + 1).padStart(2, '0')}/${atual.getFullYear()}`;
        diasCompletos[dataStr] = dadosPorDia[dataStr] || 0;
        atual.setDate(atual.getDate() + 1);
    }
    return diasCompletos;
}

function gerarGraficoDias(dados, metaDiaria) {
    const labels = Object.keys(dados).map(d => formatarDiaLabel(d));
    const valores = Object.values(dados).map(v => (v / 3600).toFixed(2));
    
    const cores = valores.map((v, i) => {
        const isWeekend = labels[i].includes("Dom") || labels[i].includes("Sáb");
        if (v == 0) return "#374151"; 
        if (isWeekend) return "#3b82f6"; 
        return v >= metaDiaria ? "#84cc16" : "#f43f5e"; 
    });

    const ctx = document.getElementById("chartDias");
    if (window.myBarChart) window.myBarChart.destroy();
    
    const horizontalLinePlugin = {
        id: 'horizontalLine',
        beforeDraw: function(chart) {
            const yValue = chart.options.metaDiaria;
            if (!yValue) return;
            const context = chart.ctx;
            const yAxis = chart.scales.y; 
            const xAxis = chart.scales.x; 
            if (!yAxis || !xAxis) return;
            
            const yPixel = yAxis.getPixelForValue(yValue);
            
            context.save();
            context.beginPath();
            context.moveTo(xAxis.left, yPixel);
            context.lineTo(xAxis.right, yPixel);
            context.lineWidth = 2;
            context.strokeStyle = '#f59e0b';
            context.setLineDash([5, 5]);
            context.stroke();
            context.restore();
        }
    };

    window.myBarChart = new Chart(ctx, {
        type: "bar",
        plugins: [horizontalLinePlugin],
        data: { 
            labels: labels, 
            datasets: [{ label: "Horas", data: valores, backgroundColor: cores, borderRadius: 4 }] 
        },
        options: { 
            metaDiaria: metaDiaria, 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { 
                y: { beginAtZero: true, grid: { color: "#374151" }, ticks: { color: "#9ca3af" } }, 
                x: { 
                    grid: { display: false }, 
                    ticks: { 
                        color: "#9ca3af", 
                        autoSkip: false, 
                        maxRotation: 45, 
                        minRotation: 45
                    } 
                } 
            } 
        }
    });
}

function gerarGraficoProjetos(dados) {
    const ctx = document.getElementById("chartProjetos");
    if (window.myPieChart) window.myPieChart.destroy();
    const labels = Object.keys(dados);
    const valores = Object.values(dados).map(v => (v / 3600).toFixed(2));
    const cores = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316'];
    
    window.myPieChart = new Chart(ctx, {
        type: "doughnut",
        data: { labels: labels, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 0 }] },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            cutout: '70%', 
            plugins: { legend: { display: false } } // Sintaxe Moderna V3 que esconde a legenda duplicada
        }
    });

    const legendContainer = document.getElementById("ps-legend");
    legendContainer.innerHTML = "";
    labels.forEach((label, index) => {
        const color = cores[index % cores.length];
        const horas = (dados[label] / 3600).toFixed(2);
        const item = document.createElement("div");
        item.className = "ps-legend-item";
        item.innerHTML = `<div class="ps-legend-color" style="background-color: ${color}"></div><div class="ps-legend-label" title="${label}">${label}</div><div class="ps-legend-value">${horas}h</div>`;
        legendContainer.appendChild(item);
    });
}

function gerarGraficoVelocimetro(atingido, total) {
    const ctx = document.getElementById("chartMeta");
    if (window.myGaugeChart) window.myGaugeChart.destroy();
    
    const restante = Math.max(0, total - atingido);
    const capAtingido = atingido > total ? total : atingido; 

    window.myGaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Concluído', 'Restante'],
            datasets: [{ 
                data: [capAtingido, restante], 
                backgroundColor: ['#84cc16', '#374151'], // Volta a ser verde para combinar com o tema
                borderWidth: 0 
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '80%', 
            rotation: -90, // Sintaxe Moderna V3 para Meio Círculo
            circumference: 180, // Sintaxe Moderna V3 para Meio Círculo
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}

function gerarListaSemanal(dados) {
    const semanas = {};
    dados.forEach(d => {
        const weekStr = getWeekRange(d.data);
        if (!semanas[weekStr]) semanas[weekStr] = { total: 0, projetos: {} };
        semanas[weekStr].total += d.segundos;
        if (!semanas[weekStr].projetos[d.projeto]) semanas[weekStr].projetos[d.projeto] = 0;
        semanas[weekStr].projetos[d.projeto] += d.segundos;
    });

    const container = document.getElementById("ps-weekly-container");
    if (!container) return;
    container.innerHTML = "";

    const semanasOrdenadas = Object.keys(semanas).sort((a, b) => {
        const [diaA, mesA, anoA] = a.split(" - ")[0].split("/");
        const [diaB, mesB, anoB] = b.split(" - ")[0].split("/");
        return new Date(anoB, mesB-1, diaB) - new Date(anoA, mesA-1, diaA);
    });

    const dotColors = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e', '#14b8a6'];
    let colorIndex = 0; const projectColors = {};

    semanasOrdenadas.forEach((week, idx) => {
        const weekData = semanas[week];
        const details = document.createElement("details");
        details.className = "ps-week-details";
        if (idx === 0) details.open = true;

        const summary = document.createElement("summary");
        summary.className = "ps-week-summary";
        summary.innerHTML = `
            <div class="ps-week-title"><span class="ps-arrow">▶</span><span class="ps-week-number">${semanasOrdenadas.length - idx}</span><span>${week}</span></div>
            <div class="ps-week-duration">${segundosParaHHMMSS(weekData.total)}</div>
        `;
        details.appendChild(summary);

        const projetos = Object.keys(weekData.projetos).sort();
        projetos.forEach(proj => {
            if (!projectColors[proj]) projectColors[proj] = dotColors[colorIndex++ % dotColors.length];
            const projItem = document.createElement("div");
            projItem.className = "ps-week-project";
            projItem.innerHTML = `<div class="ps-project-name"><div class="ps-dot" style="background-color: ${projectColors[proj]}"></div>${proj}</div><div class="ps-project-duration">${segundosParaHHMMSS(weekData.projetos[proj])}</div>`;
            details.appendChild(projItem);
        });
        container.appendChild(details);
    });
}

function esperarTabela() {
    const interval = setInterval(() => {
        const tabela = document.querySelector("#tableReport tbody");
        if (tabela) {
            clearInterval(interval);
            gerarDashboard();
        }
    }, 1000);
}
esperarTabela();