async function gerarDashboard() {
    const dados = coletarDadosTabela();
    if (!dados || dados.length === 0) return;
    
    const periodo = extrairPeriodo();
    let feriados = [];
    
    if (periodo) {
        const ano = parseDataBR(periodo.inicio).getFullYear();
        feriados = await buscarFeriados(ano);
    } else {
        feriados = await buscarFeriados(new Date().getFullYear());
    }

    criarDashboardContainer();
    
    const chkFeriados = document.getElementById("ps-feriados-check");
    chkFeriados.checked = localStorage.getItem("psConsiderarFeriados") === "true";
    chkFeriados.addEventListener("change", () => {
        localStorage.setItem("psConsiderarFeriados", chkFeriados.checked);
    });
    
    const porDia = agruparPorDia(dados);
    const porProjeto = agruparPorProjeto(dados);
    const totalSegundos = calcularTotal(dados);
    
    document.getElementById("ps-total").innerText = segundosParaHHMMSS(totalSegundos);
    
    gerarListaSemanal(dados);
    gerarTabelaFeriados(periodo, feriados);
    configurarFinanceiro(totalSegundos, periodo, feriados);
    configurarMetasEGraficos(dados, porDia, porProjeto, periodo, totalSegundos, feriados);
}

function configurarFinanceiro(totalSegundos, periodo, feriados) {
    const inputRate = document.getElementById("ps-rate-input");
    const earningsDisplay = document.getElementById("ps-earnings");
    const projecaoDisplay = document.getElementById("ps-projecao-val");
    const projecaoMediaDisplay = document.getElementById("ps-projecao-media");
    const toggleBtn = document.getElementById("ps-toggle-eye");
    const chkFeriados = document.getElementById("ps-feriados-check");
    let isHidden = true;
    
    inputRate.value = localStorage.getItem("psHourlyRate") || "";

    function atualizarValor() {
        const considerar = chkFeriados.checked;
        const feriadosAtivos = considerar ? [] : feriados;
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
            const diasUteisTotais = getDiasUteis(inicio, fim, feriadosAtivos);

            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            
            let limitDate = hoje > fim ? fim : (hoje < inicio ? inicio : hoje);
            let diasUteisPassados = getDiasUteis(inicio, limitDate, feriadosAtivos);

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
    chkFeriados.addEventListener("change", atualizarValor);
    atualizarValor();
}

function configurarMetasEGraficos(dados, porDia, porProjeto, periodo, totalSegundos, feriados) {
    const inputMeta = document.getElementById("ps-goal-input");
    const chkFeriados = document.getElementById("ps-feriados-check");
    inputMeta.value = localStorage.getItem("psDailyGoal") || "8.8";
    
    function atualizarGraficosEMetas() {
        const metaDiaria = parseFloat(inputMeta.value.replace(',', '.')) || 8.8;
        localStorage.setItem("psDailyGoal", inputMeta.value);
        
        const considerar = chkFeriados.checked;
        const feriadosAtivos = considerar ? [] : feriados;

        const metaAtingida = totalSegundos / 3600;
        let ritmo = 0, saldo = 0, metaTotal = 0;

        if (periodo) {
            const inicio = parseDataBR(periodo.inicio);
            const fim = parseDataBR(periodo.fim);
            
            const realStats = calcularEstatisticasPeriodo(inicio, fim, feriados);
            const activeStats = calcularEstatisticasPeriodo(inicio, fim, feriadosAtivos);
            
            const diasUteisTotais = activeStats.diasUteis;
            metaTotal = diasUteisTotais * metaDiaria;

            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            
            let limitDate = hoje > fim ? fim : (hoje < inicio ? inicio : hoje);
            const diasUteisPassados = getDiasUteis(inicio, limitDate, feriadosAtivos);
            const diasUteisRestantes = diasUteisTotais - diasUteisPassados;
            
            const diasPassadosTotais = Math.floor((limitDate - inicio) / (1000 * 60 * 60 * 24)) + 1;
            const mediaDia = diasPassadosTotais > 0 ? (metaAtingida / diasPassadosTotais).toFixed(2) : "0.00";
            const mediaDiaUtil = diasUteisPassados > 0 ? (metaAtingida / diasUteisPassados).toFixed(2) : "0.00";

            const statsHtml = `
                <div style="display:flex; justify-content:space-between;"><span>Dias no Período:</span> <span>${realStats.totalDias}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Fins de Semana:</span> <span>${realStats.finsDeSemana}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Feriados:</span> <span>${realStats.diasFeriado}</span></div>
                <div style="display:flex; justify-content:space-between; color:#fff; font-weight:bold; margin-top:4px;"><span>Dias Úteis (Meta):</span> <span>${activeStats.diasUteis}</span></div>
                <div style="display:flex; justify-content:space-between; margin-top:6px; border-top: 1px solid #4b5563; padding-top: 6px;"><span>Média p/ Dia:</span> <span>${mediaDia}h</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Média p/ Dia Útil:</span> <span style="color:#10b981;">${mediaDiaUtil}h</span></div>
            `;
            document.getElementById("ps-period-stats").innerHTML = statsHtml;

            saldo = metaAtingida - (diasUteisPassados * metaDiaria);

            if (diasUteisRestantes > 0) {
                ritmo = Math.max(0, (metaTotal - metaAtingida) / diasUteisRestantes);
            } else if (diasUteisRestantes === 0 && metaAtingida < metaTotal) {
                ritmo = metaTotal - metaAtingida;
            }
        } else {
            document.getElementById("ps-period-stats").innerHTML = `<div style="text-align:center;">Filtre um período</div>`;
        }

        const saldoEl = document.getElementById("ps-saldo-val");
        const ritmoEl = document.getElementById("ps-ritmo-val");
        
        if (periodo) {
            saldoEl.innerText = (saldo >= 0 ? "+" : "") + saldo.toFixed(2) + "h";
            saldoEl.style.color = saldo >= 0 ? "#84cc16" : "#f43f5e";
            
            if (ritmo === 0 && metaAtingida >= metaTotal) {
                ritmoEl.innerText = "Meta Atingida!";
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
        gerarGraficoDias(porDiaCompleto, metaDiaria, feriados, considerar);
        gerarGraficoProjetos(porProjeto);
        if (periodo) gerarGraficoVelocimetro(metaAtingida, metaTotal);
    }

    inputMeta.addEventListener("input", atualizarGraficosEMetas);
    chkFeriados.addEventListener("change", atualizarGraficosEMetas);
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

function gerarGraficoDias(dados, metaDiaria, feriados = [], considerarFeriados = false) {
    const feriadosMap = {};
    feriados.forEach(f => {
        const [y, m, d] = f.date.split('-');
        feriadosMap[`${d}/${m}/${y}`] = f.name;
    });

    const labels = Object.keys(dados).map(d => formatarDiaLabel(d));
    const valores = Object.values(dados).map(v => (v / 3600).toFixed(2));
    
    const cores = valores.map((v, i) => {
        const dataStr = Object.keys(dados)[i];
        const isWeekend = labels[i].includes("Dom") || labels[i].includes("Sáb");
        const isFeriado = feriadosMap[dataStr] !== undefined;
        
        if (isFeriado && !considerarFeriados) return "#a855f7";
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

    const holidayEmojiPlugin = {
        id: 'holidayEmoji',
        afterDatasetsDraw: function(chart) {
            const ctx = chart.ctx;
            const meta = chart.getDatasetMeta(0);
            const dataKeys = Object.keys(dados);
            
            meta.data.forEach((bar, index) => {
                const dataStr = dataKeys[index];
                if (feriadosMap[dataStr]) {
                    ctx.save();
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('🏖️', bar.x, bar.y - 4);
                    ctx.restore();
                }
            });
        }
    };

    window.myBarChart = new Chart(ctx, {
        type: "bar",
        plugins: [horizontalLinePlugin, holidayEmojiPlugin],
        data: { 
            labels: labels, 
            datasets: [{ label: "Horas", data: valores, backgroundColor: cores, borderRadius: 4 }] 
        },
        options: { 
            layout: {
                padding: { top: 20 }
            },
            metaDiaria: metaDiaria, 
            responsive: true, maintainAspectRatio: false, 
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const dataStr = Object.keys(dados)[context.dataIndex];
                            if (feriadosMap[dataStr]) {
                                return 'Feriado: ' + feriadosMap[dataStr];
                            }
                            return null;
                        }
                    }
                }
            }, 
            scales: { 
                y: { beginAtZero: true, grid: { color: "#374151" }, ticks: { color: "#9ca3af" } }, 
                x: { 
                    grid: { display: false }, 
                    ticks: { color: "#9ca3af", autoSkip: false, maxRotation: 45, minRotation: 45 } 
                } 
            } 
        }
    });
}

function gerarTabelaFeriados(periodo, feriados) {
    const container = document.getElementById("ps-holidays-list");
    if (!container) return;

    if (!periodo) {
        container.innerHTML = "<div style='color: #6b7280; text-align: center; padding: 10px 0;'>Filtre um período</div>";
        return;
    }

    const start = parseDataBR(periodo.inicio);
    const end = parseDataBR(periodo.fim);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    const feriadosNoPeriodo = feriados.filter(f => {
        const [y, m, d] = f.date.split('-');
        const fDate = new Date(y, m - 1, d);
        return fDate >= start && fDate <= end;
    });

    if (feriadosNoPeriodo.length === 0) {
        container.innerHTML = "<div style='color: #6b7280; text-align: center; padding: 10px 0;'>Nenhum feriado no período</div>";
        return;
    }

    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<thead><tr style="border-bottom: 1px solid #4b5563; color: #9ca3af; text-align: left;">';
    html += '<th style="padding: 8px 4px; font-weight: normal;">Data</th>';
    html += '<th style="padding: 8px 4px; font-weight: normal;">Feriado</th>';
    html += '</tr></thead><tbody>';

    feriadosNoPeriodo.forEach(f => {
        const [y, m, d] = f.date.split('-');
        const dataFmt = `${d}/${m}/${y}`;
        html += `<tr style="border-bottom: 1px solid #374151; color: #d1d5db;">`;
        html += `<td style="padding: 8px 4px; white-space: nowrap;">${dataFmt}</td>`;
        html += `<td style="padding: 8px 4px;">${f.name}</td>`;
        html += `</tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
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
            plugins: { legend: { display: false } }
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
                backgroundColor: ['#84cc16', '#adb1a71f'], 
                borderWidth: 0 
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '80%', 
            rotation: -90, 
            circumference: 180, 
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

function sincronizarAnexosContinuamente() {
    setInterval(() => {
        const botaoImprimir = document.querySelector('a[href*="addRep_0"], a[title*="Imprimir resumo"], button[title*="Imprimir resumo"]');
        
        if (botaoImprimir) {
            const linksAnexos = [];
            const tagsA = document.querySelectorAll('a[href*="docrep.do"]'); 
            
            tagsA.forEach(a => {
                const url = a.href;
                const nomeExibicao = a.innerText.toLowerCase();
                if (url.match(/\.(jpeg|jpg|png|gif)/i) || nomeExibicao.match(/\.(jpeg|jpg|png|gif)/i)) {
                    linksAnexos.push(url);
                }
            });

            if (linksAnexos.length > 0) {
                const linksUnicos = [...new Set(linksAnexos)];
                localStorage.setItem('ps_anexos_impressao', JSON.stringify(linksUnicos));
            } else {
                localStorage.removeItem('ps_anexos_impressao');
            }
        }
    }, 1500);
}

function montarAnexosNaImpressao() {
    const anexosJson = localStorage.getItem('ps_anexos_impressao');
    if (!anexosJson) return;

    const anexos = JSON.parse(anexosJson);
    if (anexos.length === 0) return;

    if (document.querySelector('.ps-print-injected')) return;

    const style = document.createElement('style');
    style.innerHTML = `
        .ps-print-page { page-break-before: always; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; max-width: 800px; margin: 40px auto; background: white; }
        .ps-print-img-box { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed #999; padding: 10px; height: 350px; background: #fff; }
        .ps-print-img-box img { max-width: 100%; max-height: 90%; object-fit: contain; }
        .ps-img-title { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin-top: 8px; text-align: center; word-break: break-all; }
        @media print { .ps-print-page { gap: 10mm; height: 270mm; max-width: 100%; margin: 0; padding-top: 10mm;} .ps-print-img-box { height: 100%; max-height: 125mm; border-color: #ccc; } }
    `;
    document.head.appendChild(style);

    let isFirstPage = true;
    anexos.forEach((url, i) => {
        if (i % 4 === 0) {
            const pageDiv = document.createElement('div');
            pageDiv.className = isFirstPage ? 'ps-print-page ps-print-injected' : 'ps-print-page';
            isFirstPage = false;
            document.body.appendChild(pageDiv);
        }
        
        const containers = document.querySelectorAll('.ps-print-page');
        const lastPage = containers[containers.length - 1];

        const box = document.createElement('div');
        box.className = 'ps-print-img-box';
        const img = document.createElement('img');
        img.src = url;
        
        const matchNome = url.match(/nome=([^&]+)/);
        const nomeArquivo = matchNome ? decodeURIComponent(matchNome[1]) : "Anexo";
        const titulo = document.createElement('div');
        titulo.className = 'ps-img-title';
        titulo.innerText = nomeArquivo;

        box.appendChild(img);
        box.appendChild(titulo);
        lastPage.appendChild(box);
    });
}

function iniciarExtensao() {
    const urlAtual = window.location.href;
    const titulo = document.title || "";
    const vaiImprimirSozinho = document.querySelector('body[onload*="print"]') !== null;

    const isTelaRelatorioFinal = urlAtual.includes('state=Exprel') || titulo.includes('Resumo de Despesas') || vaiImprimirSozinho;
    const isTelaFiltros = urlAtual.includes('ReportController') && !isTelaRelatorioFinal;

    if (isTelaRelatorioFinal) {
        montarAnexosNaImpressao();
    } else if (!isTelaFiltros) {
        if (typeof esperarTabela === "function") {
            esperarTabela();
        }
        sincronizarAnexosContinuamente();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarExtensao);
} else {
    iniciarExtensao();
}