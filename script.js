// Dados fictícios padronizados do 9º Ano
const dadosBoletim = [
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

// Frequência fictícia/demonstrativa de 92% (será tratada de outra forma no futuro)

// Função para normalizar as notas para a escala de 0 a 10
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Converte vírgula para ponto se for texto
  if (typeof valor === 'string') {
    valor = valor.replace(',', '.');
  }

  let numero = Number(valor);

  if (isNaN(numero)) {
    return null;
  }

  // Regra: valores entre 0 e 10 permanecem iguais
  if (numero >= 0 && numero <= 10) {
    return numero;
  }

  // Regra: valores maiores que 10 e <= 100 dividem por 10
  if (numero > 10 && numero <= 100) {
    return numero / 10;
  }

  return null; // Valores fora das regras são inválidos
}

// Função para formatar exibição da nota
function formatarNotaExibicao(notaNormalizada) {
  if (notaNormalizada === null) {
    return "—";
  }
  return notaNormalizada.toFixed(1).replace('.', ',');
}

// Renderização e Cálculos do Boletim
function construirBoletim() {
  const corpoTabela = document.getElementById('corpo-tabela');
  corpoTabela.innerHTML = '';

  let somaMedias = 0;
  let disciplinasComMedia = 0;
  let acumuladorFaltasGeral = 0;
  let qtdBomDesempenho = 0;
  let qtdAtencao = 0;

  dadosBoletim.forEach(item => {
    // Normalizar notas dos três trimestres
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    // Somar faltas da disciplina
    const totalFaltasDisciplina = item.faltas.reduce((acc, f) => acc + f, 0);
    acumuladorFaltasGeral += totalFaltasDisciplina;

    // Calcular média apenas com notas disponíveis
    const notasValidas = [n1, n2, n3].filter(n => n !== null);
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

    // Criar a linha na tabela HTML
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.disciplina}</td>
      <td>${formatarNotaExibicao(n1)}</td>
      <td>${formatarNotaExibicao(n2)}</td>
      <td>${formatarNotaExibicao(n3)}</td>
      <td><strong>${formatarNotaExibicao(mediaDisciplina)}</strong></td>
      <td>${totalFaltasDisciplina}</td>
      <td class="${classeSituacao}">${situacao}</td>
    `;
    corpoTabela.appendChild(tr);
  });

  // Atualizar os Cards de Resumo no topo
  const mediaGeralFinal = disciplinasComMedia > 0 ? (somaMedias / disciplinasComMedia).toFixed(1).replace('.', ',') : "—";
  document.getElementById('media-geral').innerText = mediaGeralFinal;
  document.getElementById('total-faltas').innerText = acumuladorFaltasGeral;
  document.getElementById('qtd-bom').innerText = qtdBomDesempenho;
  document.getElementById('qtd-atencao').innerText = qtdAtencao;
}

// Executar ao carregar a página
construirBoletim();