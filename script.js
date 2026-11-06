// Configuração Fixa do Aluno
const CONFIG_ALUNO = {
  turma: "9B",
  numeroChamada: 40,
  apiUrl: "https://boletim-api.profbt.com.br"
};

// PIN mantido apenas em memória durante a sessão
let pinSessao = null;
let modoEdicao = false;

// Instâncias Globais dos Gráficos (Chart.js)
let graficoMedias = null;
let graficoEvolucao = null;
let graficoFaltas = null;

// Dados locais legados/fallback (preservados do projeto original)
const dadosLocaisFallback = [
  { disciplina: "Língua Portuguesa", tri1: 78, tri2: "8,2", tri3: 8.6, faltas: [2, 2, 1] },
  { disciplina: "Matemática", tri1: 55, tri2: "5,4", tri3: null, faltas: [3, 2, 2] },
  { disciplina: "Ciências", tri1: 84, tri2: 7.9, tri3: "8,3", faltas: [1, 1, 1] },
  { disciplina: "História", tri1: "7,1", tri2: 82, tri3: null, faltas: [1, 2, 1] },
  { disciplina: "Geografia", tri1: 69, tri2: "7,5", tri3: 7.8, faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 88, tri2: 8.4, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Arte", tri1: "9,2", tri2: 87, tri3: 9.0, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 96, tri2: "9,3", tri3: null, faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 91, tri2: 8.9, tri3: "9,4", faltas: [1, 1, 0] },
  { disciplina: "Educação Financeira", tri1: 76, tri2: "7,2", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Rec. Aprend. Matemática", tri1: 58, tri2: "5,9", tri3: 6.2, faltas: [2, 2, 1] },
  { disciplina: "Leitura Rec. Aprend. Lingua Portuguesa", tri1: 72, tri2: "7,6", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 49, tri2: 5.5, tri3: "5,8", faltas: [2, 2, 2] },
  { disciplina: "Literatura Arte e Movimento", tri1: "8,0", tri2: 84, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Práticas Experimentais", tri1: 64, tri2: "6,6", tri3: 7.0, faltas: [1, 1, 1] }
];

// Estado atual do boletim em exibição/edição
let dadosBoletimAtual = [];

// Função para normalizar notas legadas/antigas do projeto original
function normalizarNotaLegada(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (typeof valor === 'string') {
    valor = valor.replace(',', '.');
  }

  let numero = Number(valor);

  if (isNaN(numero)) {
    return null;
  }

  if (numero >= 0 && numero <= 10) {
    return numero;
  }

  if (numero > 10 && numero <= 100) {
    return numero / 10;
  }

  return null;
}

// Função para formatar exibição da nota
function formatarNotaExibicao(notaNormalizada) {
  if (notaNormalizada === null || notaNormalizada === undefined) {
    return "—";
  }
  return Number(notaNormalizada).toFixed(1).replace('.', ',');
}

// Fazer Login na API
async function fazerLogin() {
  const inputPin = document.getElementById('input-pin');
  const msgLogin = document.getElementById('mensagem-login');
  const pinDigitado = inputPin.value.trim();

  if (!pinDigitado) {
    msgLogin.className = 'mensagem-status mensagem-erro';
    msgLogin.textContent = 'Por favor, digite o seu PIN.';
    return;
  }

  msgLogin.className = 'mensagem-status mensagem-info';
  msgLogin.textContent = 'Conectando...';

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinDigitado
      })
    });

    if (resposta.status === 401) {
      msgLogin.className = 'mensagem-status mensagem-erro';
      msgLogin.textContent = 'Turma, chamada ou PIN inválidos.';
      return;
    }

    if (resposta.status === 429) {
      msgLogin.className = 'mensagem-status mensagem-erro';
      msgLogin.textContent = 'Muitas tentativas. Aguarde um minuto e tente novamente.';
      return;
    }

    if (!resposta.ok) {
      msgLogin.className = 'mensagem-status mensagem-erro';
      msgLogin.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
      return;
    }

    const resultado = await resposta.json();

    // PIN válido: salvar em memória e limpar o campo imediatamente por segurança
    pinSessao = pinDigitado;
    inputPin.value = '';

    // Tratar dados recebidos ou usar fallback local
    if (resultado && resultado.dados && Array.isArray(resultado.dados.disciplinas) && resultado.dados.disciplinas.length > 0) {
      dadosBoletimAtual = resultado.dados.disciplinas.map(item => ({
        disciplina: item.disciplina,
        tri1: item.tri1,
        tri2: item.tri2,
        tri3: item.tri3,
        faltas: Array.isArray(item.faltas) ? [...item.faltas] : [0, 0, 0]
      }));
    } else {
      // Quando dados for null ou novo boletim: usar disciplinas fictícias locais existentes
      dadosBoletimAtual = JSON.parse(JSON.stringify(dadosLocaisFallback));
    }

    // Ocultar login e exibir boletim
    document.getElementById('area-login').style.display = 'none';
    document.getElementById('conteudo-boletim').style.display = 'block';

    construirBoletim();
  } catch (erro) {
    msgLogin.className = 'mensagem-status mensagem-erro';
    msgLogin.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
  }
}

// Renderização da tabela e dos cards de resumo
function construirBoletim() {
  const corpoTabela = document.getElementById('corpo-tabela');
  corpoTabela.innerHTML = '';

  let somaMedias = 0;
  let disciplinasComMedia = 0;
  let acumuladorFaltasGeral = 0;
  let qtdBomDesempenho = 0;
  let qtdAtencao = 0;

  dadosBoletimAtual.forEach((item, index) => {
    // Tratamento e normalização das notas
    const n1 = normalizarNotaLegada(item.tri1);
    const n2 = normalizarNotaLegada(item.tri2);
    const n3 = normalizarNotaLegada(item.tri3);

    // Faltas
    const faltasArray = Array.isArray(item.faltas) ? item.faltas : [0, 0, 0];
    const f1 = faltasArray[0] !== undefined ? faltasArray[0] : 0;
    const f2 = faltasArray[1] !== undefined ? faltasArray[1] : 0;
    const f3 = faltasArray[2] !== undefined ? faltasArray[2] : 0;
    const totalFaltasDisciplina = Number(f1) + Number(f2) + Number(f3);
    acumuladorFaltasGeral += totalFaltasDisciplina;

    // Cálculo da média
    const notasValidas = [n1, n2, n3].filter(n => n !== null && n !== undefined);
    let mediaDisciplina = null;
    let situacao = "Nota ainda não disponível";
    let classeSituacao = "situacao-indisponivel";

    if (notasValidas.length > 0) {
      const somaNotas = notasValidas.reduce((acc, val) => acc + val, 0);
      mediaDisciplina = somaNotas / notasValidas.length;
      somaMedias += mediaDisciplina;
      disciplinasComMedia++;

      if (mediaDisciplina >= 6.0) {
        situacao = "Bom desempenho";
        classeSituacao = "situacao-bom";
        qtdBomDesempenho++;
      } else {
        situacao = "Atenção";
        classeSituacao = "situacao-atencao";
        qtdAtencao++;
      }
    }

    const tr = document.createElement('tr');

    if (!modoEdicao) {
      // MODO VISUALIZAÇÃO
      // Uso de textContent / elementos seguros contra XSS
      const tdDisciplina = document.createElement('td');
      tdDisciplina.textContent = item.disciplina;

      const tdN1 = document.createElement('td');
      tdN1.textContent = formatarNotaExibicao(n1);

      const tdN2 = document.createElement('td');
      tdN2.textContent = formatarNotaExibicao(n2);

      const tdN3 = document.createElement('td');
      tdN3.textContent = formatarNotaExibicao(n3);

      const tdMedia = document.createElement('td');
      const strongMedia = document.createElement('strong');
      strongMedia.textContent = formatarNotaExibicao(mediaDisciplina);
      tdMedia.appendChild(strongMedia);

      const tdFaltas = document.createElement('td');
      tdFaltas.textContent = totalFaltasDisciplina;

      const tdSituacao = document.createElement('td');
      tdSituacao.className = classeSituacao;
      tdSituacao.textContent = situacao;

      tr.appendChild(tdDisciplina);
      tr.appendChild(tdN1);
      tr.appendChild(tdN2);
      tr.appendChild(tdN3);
      tr.appendChild(tdMedia);
      tr.appendChild(tdFaltas);
      tr.appendChild(tdSituacao);
    } else {
      // MODO EDIÇÃO
      const v1 = n1 !== null ? String(n1).replace('.', ',') : '';
      const v2 = n2 !== null ? String(n2).replace('.', ',') : '';
      const v3 = n3 !== null ? String(n3).replace('.', ',') : '';

      tr.innerHTML = `
        <td></td>
        <td><input type="text" class="input-edicao input-nota" data-index="${index}" data-tri="1" value="${v1}"></td>
        <td><input type="text" class="input-edicao input-nota" data-index="${index}" data-tri="2" value="${v2}"></td>
        <td><input type="text" class="input-edicao input-nota" data-index="${index}" data-tri="3" value="${v3}"></td>
        <td><strong>${formatarNotaExibicao(mediaDisciplina)}</strong></td>
        <td>
          <div class="grupo-faltas-edicao">
            <input type="text" class="input-edicao input-falta" data-index="${index}" data-tri="1" value="${f1}">
            <span>/</span>
            <input type="text" class="input-edicao input-falta" data-index="${index}" data-tri="2" value="${f2}">
            <span>/</span>
            <input type="text" class="input-edicao input-falta" data-index="${index}" data-tri="3" value="${f3}">
          </div>
        </td>
        <td class="${classeSituacao}">${situacao}</td>
      `;
      tr.cells[0].textContent = item.disciplina;
    }

    corpoTabela.appendChild(tr);
  });

  // Atualizar os Cards de Resumo
  const mediaGeralFinal = disciplinasComMedia > 0 ? (somaMedias / disciplinasComMedia).toFixed(1).replace('.', ',') : "—";
  document.getElementById('media-geral').textContent = mediaGeralFinal;
  document.getElementById('total-faltas').textContent = acumuladorFaltasGeral;
  document.getElementById('qtd-bom').textContent = qtdBomDesempenho;
  document.getElementById('qtd-atencao').textContent = qtdAtencao;

  // Atualizar a camada de gráficos sem alterar dados em memória
  atualizarGraficos();
}

// Alternar entre modo visualização e modo edição
function alternarEdicao() {
  modoEdicao = !modoEdicao;
  const btnAlternar = document.getElementById('btn-alternar-edicao');
  const btnSalvar = document.getElementById('btn-salvar');
  const msgSalvar = document.getElementById('mensagem-salvar');

  msgSalvar.textContent = '';

  if (modoEdicao) {
    btnAlternar.textContent = 'Cancelar edição';
    btnSalvar.style.display = 'inline-block';
  } else {
    btnAlternar.textContent = 'Alterar dados';
    btnSalvar.style.display = 'none';
  }

  construirBoletim();
}

// Validação estrita da nota digitada pelo aluno
function validarENormalizarNotaDigitada(strValor) {
  if (strValor === null || strValor === undefined) {
    return { valido: true, valor: null };
  }

  const texto = String(strValor).trim();

  if (texto === "") {
    return { valido: true, valor: null };
  }

  // Aceitar apenas formato numérico decimal válido com ponto ou vírgula
  const formatoValido = /^\d+([.,]\d+)?$/;
  if (!formatoValido.test(texto)) {
    return { valido: false, valor: null };
  }

  const num = Number(texto.replace(',', '.'));

  if (isNaN(num) || num < 0 || num > 10) {
    return { valido: false, valor: null };
  }

  return { valido: true, valor: num };
}

// Validação estrita das faltas digitadas pelo aluno
function validarENormalizarFaltaDigitada(strValor) {
  if (strValor === null || strValor === undefined) {
    return { valido: false, valor: null };
  }

  const texto = String(strValor).trim();

  if (texto === "") {
    return { valido: false, valor: null };
  }

  // Aceitar apenas inteiros maiores ou iguais a zero
  const formatoInteiro = /^\d+$/;
  if (!formatoInteiro.test(texto)) {
    return { valido: false, valor: null };
  }

  const num = Number(texto);

  if (isNaN(num) || num < 0) {
    return { valido: false, valor: null };
  }

  return { valido: true, valor: num };
}

// Salvar Dados na API
async function salvarDadosAPI() {
  const msgSalvar = document.getElementById('mensagem-salvar');
  msgSalvar.className = 'mensagem-status mensagem-info';
  msgSalvar.textContent = 'Salvando...';

  // Limpar estilos de erro anteriores
  const todosInputs = document.querySelectorAll('.input-edicao');
  todosInputs.forEach(inp => inp.classList.remove('invalido'));

  let houverErro = false;
  const novosDadosDisciplinas = JSON.parse(JSON.stringify(dadosBoletimAtual));

  // Validar todos os campos de notas
  const inputsNotas = document.querySelectorAll('.input-nota');
  inputsNotas.forEach(inp => {
    const idx = Number(inp.getAttribute('data-index'));
    const tri = inp.getAttribute('data-tri');
    const res = validarENormalizarNotaDigitada(inp.value);

    if (!res.valido) {
      inp.classList.add('invalido');
      houverErro = true;
    } else {
      if (tri === '1') novosDadosDisciplinas[idx].tri1 = res.valor;
      if (tri === '2') novosDadosDisciplinas[idx].tri2 = res.valor;
      if (tri === '3') novosDadosDisciplinas[idx].tri3 = res.valor;
    }
  });

  // Validar todos os campos de faltas
  const inputsFaltas = document.querySelectorAll('.input-falta');
  inputsFaltas.forEach(inp => {
    const idx = Number(inp.getAttribute('data-index'));
    const tri = Number(inp.getAttribute('data-tri')) - 1;
    const res = validarENormalizarFaltaDigitada(inp.value);

    if (!res.valido) {
      inp.classList.add('invalido');
      houverErro = true;
    } else {
      if (!Array.isArray(novosDadosDisciplinas[idx].faltas)) {
        novosDadosDisciplinas[idx].faltas = [0, 0, 0];
      }
      novosDadosDisciplinas[idx].faltas[tri] = res.valor;
    }
  });

  if (houverErro) {
    msgSalvar.className = 'mensagem-status mensagem-erro';
    msgSalvar.textContent = 'Verifique os campos destacados em vermelho antes de salvar.';
    return;
  }

  // Montar payload para salvar na API
  const payload = {
    turma: CONFIG_ALUNO.turma,
    numero_chamada: CONFIG_ALUNO.numeroChamada,
    pin: pinSessao,
    dados: {
      disciplinas: novosDadosDisciplinas
    }
  };

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
      msgSalvar.className = 'mensagem-status mensagem-erro';
      msgSalvar.textContent = 'Erro ao salvar os dados no servidor. Tente novamente.';
      return;
    }

    // Sucesso: atualizar dados locais, sair do modo de edição e atualizar a tela
    dadosBoletimAtual = novosDadosDisciplinas;
    modoEdicao = false;
    document.getElementById('btn-alternar-edicao').textContent = 'Alterar dados';
    document.getElementById('btn-salvar').style.display = 'none';

    msgSalvar.className = 'mensagem-status mensagem-sucesso';
    msgSalvar.textContent = 'Dados salvos com sucesso.';

    construirBoletim();
  } catch (erro) {
    msgSalvar.className = 'mensagem-status mensagem-erro';
    msgSalvar.textContent = 'Falha na conexão ao salvar. Tente novamente.';
  }
}

/* ==========================================================================
   FUNÇÕES EXCLUSIVAS DOS GRÁFICOS (CAMADA DE LEITURA)
   ========================================================================== */

// Gráfico 1: Média por Disciplina (Barras Horizontais)
function atualizarGraficoMedias() {
  const canvas = document.getElementById('graficoMediasDisciplinas');
  if (!canvas) return;

  if (graficoMedias) {
    graficoMedias.destroy();
  }

  const rótulos = [];
  const valoresMedias = [];

  dadosBoletimAtual.forEach(item => {
    rótulos.push(item.disciplina);
    const n1 = normalizarNotaLegada(item.tri1);
    const n2 = normalizarNotaLegada(item.tri2);
    const n3 = normalizarNotaLegada(item.tri3);

    const notasValidas = [n1, n2, n3].filter(n => n !== null && n !== undefined);
    if (notasValidas.length > 0) {
      const soma = notasValidas.reduce((acc, v) => acc + v, 0);
      valoresMedias.push(soma / notasValidas.length);
    } else {
      valoresMedias.push(null);
    }
  });

  const ctx = canvas.getContext('2d');
  graficoMedias = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rótulos,
      datasets: [{
        label: 'Média',
        data: valoresMedias,
        backgroundColor: 'rgba(102, 252, 241, 0.7)',
        borderColor: '#66fcf1',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              if (val === null || val === undefined) return ' Média: —';
              return ` Média: ${val.toFixed(1).replace('.', ',')}`;
            }
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 10,
          ticks: { color: '#c5c6c7' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        y: {
          ticks: { color: '#c5c6c7', font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

// Gráfico 2: Evolução da Média Geral (Linha)
function atualizarGraficoEvolucao() {
  const canvas = document.getElementById('graficoEvolucaoTrimestres');
  if (!canvas) return;

  if (graficoEvolucao) {
    graficoEvolucao.destroy();
  }

  const somas = [0, 0, 0];
  const contadores = [0, 0, 0];

  dadosBoletimAtual.forEach(item => {
    const n1 = normalizarNotaLegada(item.tri1);
    const n2 = normalizarNotaLegada(item.tri2);
    const n3 = normalizarNotaLegada(item.tri3);

    if (n1 !== null) { somas[0] += n1; contadores[0]++; }
    if (n2 !== null) { somas[1] += n2; contadores[1]++; }
    if (n3 !== null) { somas[2] += n3; contadores[2]++; }
  });

  const mediasTrimestrais = [
    contadores[0] > 0 ? (somas[0] / contadores[0]) : null,
    contadores[1] > 0 ? (somas[1] / contadores[1]) : null,
    contadores[2] > 0 ? (somas[2] / contadores[2]) : null
  ];

  const ctx = canvas.getContext('2d');
  graficoEvolucao = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['1º Tri', '2º Tri', '3º Tri'],
      datasets: [{
        label: 'Média Geral',
        data: mediasTrimestrais,
        borderColor: '#4eef90',
        backgroundColor: 'rgba(78, 239, 144, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 6,
        pointBackgroundColor: '#4eef90'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              if (val === null || val === undefined) return ' Média: —';
              return ` Média: ${val.toFixed(1).replace('.', ',')}`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: { color: '#c5c6c7' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        x: {
          ticks: { color: '#c5c6c7' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

// Gráfico 3: Faltas por Trimestre (Barras)
function atualizarGraficoFaltas() {
  const canvas = document.getElementById('graficoFaltasTrimestres');
  if (!canvas) return;

  if (graficoFaltas) {
    graficoFaltas.destroy();
  }

  let faltasTri1 = 0;
  let faltasTri2 = 0;
  let faltasTri3 = 0;

  dadosBoletimAtual.forEach(item => {
    const f = Array.isArray(item.faltas) ? item.faltas : [0, 0, 0];
    faltasTri1 += Number(f[0] || 0);
    faltasTri2 += Number(f[1] || 0);
    faltasTri3 += Number(f[2] || 0);
  });

  const totalFaltasInterno = faltasTri1 + faltasTri2 + faltasTri3;
  const LIMITE_REFERENCIA_INTERNA = 350;

  const cardFaltas = document.getElementById('card-faltas');
  const badgePerigo = document.getElementById('estadoFaltas');

  if (totalFaltasInterno >= LIMITE_REFERENCIA_INTERNA) {
    if (cardFaltas) cardFaltas.classList.add('card-perigo');
    if (badgePerigo) badgePerigo.style.display = 'inline-block';
  } else {
    if (cardFaltas) cardFaltas.classList.remove('card-perigo');
    if (badgePerigo) badgePerigo.style.display = 'none';
  }

  const ctx = canvas.getContext('2d');
  graficoFaltas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1º Tri', '2º Tri', '3º Tri'],
      datasets: [{
        label: 'Faltas',
        data: [faltasTri1, faltasTri2, faltasTri3],
        backgroundColor: 'rgba(255, 85, 85, 0.7)',
        borderColor: '#ff5555',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` Faltas: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#c5c6c7', precision: 0 },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        x: {
          ticks: { color: '#c5c6c7' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

// Atualização centralizada de todos os gráficos
function atualizarGraficos() {
  atualizarGraficoMedias();
  atualizarGraficoEvolucao();
  atualizarGraficoFaltas();
}