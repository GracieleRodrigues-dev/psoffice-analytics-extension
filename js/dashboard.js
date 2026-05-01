function agruparPorDia(dados) {
    const mapa = {};
    dados.forEach(d => {
        if (!mapa[d.data]) mapa[d.data] = 0;
        mapa[d.data] += d.segundos;
    });
    return mapa;
}

function agruparPorProjeto(dados) {
    const mapa = {};
    dados.forEach(d => {
        if (!mapa[d.projeto]) mapa[d.projeto] = 0;
        mapa[d.projeto] += d.segundos;
    });
    return mapa;
}

function calcularTotal(dados) {
    return dados.reduce((acc, d) => acc + d.segundos, 0);
}

function criarDashboardContainer() {
    let container = document.getElementById("ps-dashboard-wrapper");
    if (container) container.remove();
    
    container = document.createElement("div");
    container.id = "ps-dashboard-wrapper";
    container.innerHTML = `
        <div id="ps-dashboard">
            <div class="ps-cards">
                <div class="ps-card">
                    <span>TOTAL DE HORAS</span>
                    <h2 id="ps-total">00:00:00</h2>
                </div>
                <div class="ps-card ps-card-finance">
                    <div class="ps-finance-header">
                        <span>VALOR / HORA (R$)</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="password" id="ps-rate-input" class="ps-input-box" placeholder="0.00">
                            <button id="ps-toggle-eye" title="Mostrar/Ocultar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                        </div>
                    </div>
                    <div class="ps-finance-body">
                        <h2 id="ps-earnings">R$ --------</h2>
                    </div>
                </div>
                <div class="ps-card ps-card-finance">
                    <div class="ps-finance-header">
                        <span style="color: #10b981;">PROJEÇÃO DE GANHOS</span>
                    </div>
                    <div class="ps-finance-body">
                        <h2 id="ps-projecao-val" style="color: #10b981;">R$ --------</h2>
                    </div>
                    <span id="ps-projecao-media" style="font-size: 11px; color: #9ca3af; text-transform: uppercase; margin-top: 5px;">MÉDIA: --h / DIA ÚTIL</span>
                </div>
                <div class="ps-card ps-card-finance">
                    <div class="ps-finance-header">
                        <span>META DIÁRIA (H)</span>
                        <input type="number" id="ps-goal-input" class="ps-input-box" placeholder="8.8" step="0.1">
                    </div>
                    <div class="ps-finance-body" style="align-items: flex-end;">
                        <label style="font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 5px; cursor: pointer; margin-top: 10px;">
                            <input type="checkbox" id="ps-feriados-check"> Considerar Feriado como Dia Útil
                        </label>
                    </div>
                </div>
                <div class="ps-card">
                    <span>SALDO DE HORAS</span>
                    <h2 id="ps-saldo-val">--</h2>
                    <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Baseado nos dias passados</span>
                </div>
            </div>
            <div class="ps-grid">
                <div class="ps-chart ps-chart-bar">
                    <canvas id="chartDias"></canvas>
                </div>
                <div class="ps-chart ps-chart-pie">
                    <div class="ps-pie-container">
                        <canvas id="chartProjetos"></canvas>
                    </div>
                    <div id="ps-legend" class="ps-legend-container"></div>
                </div>
                <div class="ps-chart ps-chart-gauge">
                    <div style="text-align:center; font-weight:bold; color:#9ca3af; margin-bottom:15px; font-size:13px; letter-spacing: 1px;">PROGRESSO DA META</div>
                    <div style="position:relative; height:140px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding-bottom:10px;">
                        <canvas id="chartMeta" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1;"></canvas>
                        <div id="ps-gauge-info" style="text-align:center; z-index:10;">
                            <h2 id="ps-meta-pct" style="font-size: 32px; margin:0; color:#fff; line-height: 1;">0%</h2>
                            <div style="font-size:12px; color:#9ca3af; margin-top:2px;" id="ps-meta-total-text">0h / 0h</div>
                        </div>
                    </div>
                    <div id="ps-period-stats" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #4b5563; font-size: 11px; color: #9ca3af; display: flex; flex-direction: column; gap: 4px; text-align: left;">
                    </div>
                    <div style="text-align:center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #4b5563;">
                        <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase;">Ritmo P/ Bater a Meta:</span>
                        <h3 id="ps-ritmo-val" style="margin: 5px 0 0 0; font-size: 18px; color: #3b82f6;">--</h3>
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 20px; align-items: flex-start;">
                <div id="ps-weekly-container" class="ps-weekly-container" style="flex: 2; min-width: 300px; margin-top: 0;"></div>
                <div id="ps-holidays-container" style="flex: 1; min-width: 300px; background: #2a303c; border-radius: 8px; padding: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                    <h3 style="margin: 0 0 15px 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Feriados no Período</h3>
                    <div id="ps-holidays-list" style="font-size: 13px;"></div>
                </div>
            </div>
        </div>
    `;
    
    const tabela = document.querySelector("#tableReport");
    if (tabela && tabela.parentNode) {
        tabela.parentNode.insertBefore(container, tabela);
    }
}