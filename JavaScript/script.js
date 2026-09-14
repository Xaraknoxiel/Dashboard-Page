/* ==========================================================================
   GRÁFICOS EM SVG PURO — SEM BIBLIOTECAS EXTERNAS
   ==========================================================================
   Esta versão não usa Chart.js nem nenhum outro pacote de terceiros.
   Cada gráfico é desenhado "na mão": o JavaScript cria as tags <svg>,
   <rect>, <line>, <circle>, <path> e <text> diretamente no DOM.
   Vantagem: a página funciona 100% offline, sem depender de nenhum CDN.
   ========================================================================== */

/* Namespace exigido para criar elementos SVG via JavaScript
   (elementos SVG não podem ser criados com document.createElement comum) */
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Função auxiliar: cria um elemento SVG (ex: 'rect', 'line', 'text')
 * e já aplica um conjunto de atributos a ele.
 * @param {string} tag - nome da tag SVG, ex: 'circle', 'path'
 * @param {object} attrs - pares atributo/valor, ex: { cx: 10, cy: 20, r: 4 }
 * @returns {SVGElement}
 */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

/**
 * Formata um número no padrão brasileiro, ex: 13038 -> "13.038"
 */
function formatKm2(valor) {
  return valor.toLocaleString('pt-BR');
}

/**
 * Formata um número de forma abreviada para os eixos, ex: 13000 -> "13 mil"
 */
function formatMil(valor) {
  return (valor / 1000).toString().replace('.', ',') + ' mil';
}


/* ==========================================================================
   GRÁFICO 1 — EVOLUÇÃO ANUAL (linha + área preenchida)
   Dados oficiais do PRODES/INPE para a Amazônia Legal, em km² por ano-safra
   (cada "ano PRODES" cobre o período de 1º de agosto a 31 de julho seguinte).
   ========================================================================== */

// Os dois arrays abaixo estão na mesma ordem: anos[i] corresponde a valores[i]
const anos = ['2021', '2022', '2023', '2024', '2025'];
const valores = [13038, 11594, 9064, 6288, 5731]; // km² desmatados em cada ano

/**
 * Desenha um gráfico de linha com área preenchida dentro do elemento
 * cujo id é passado em containerId.
 */
function desenharGraficoLinha(containerId, labels, dados) {
  const container = document.getElementById(containerId);

  // Sistema de coordenadas interno do SVG (não muda com o tamanho da tela;
  // o CSS é que estica/encolhe o SVG inteiro para caber na div pai)
  const largura = 640;
  const altura = 300;
  // Espaço reservado nas bordas para caber os textos dos eixos
  const margem = { topo: 24, direita: 18, baixo: 34, esquerda: 46 };

  const larguraUtil = largura - margem.esquerda - margem.direita;
  const alturaUtil = altura - margem.topo - margem.baixo;

  // O valor máximo do eixo Y ganha 15% de folga para o gráfico não "bater no teto"
  const valorMax = Math.max(...dados) * 1.15;

  // Converte um índice de categoria (0, 1, 2...) em posição X no SVG
  const escalaX = (i) => margem.esquerda + (i / (labels.length - 1)) * larguraUtil;
  // Converte um valor de km² em posição Y no SVG (eixo Y cresce para cima, SVG para baixo)
  const escalaY = (v) => margem.topo + alturaUtil - (v / valorMax) * alturaUtil;

  // Cria o elemento <svg> raiz; viewBox define o sistema de coordenadas interno
  const svg = svgEl('svg', {
    viewBox: `0 0 ${largura} ${altura}`,
    width: '100%',
    height: '100%',
    preserveAspectRatio: 'none'
  });

  // ---- Linhas de grade horizontais + rótulos do eixo Y (0, 1/4, 1/2, 3/4, topo) ----
  const numLinhasGrade = 4;
  for (let i = 0; i <= numLinhasGrade; i++) {
    const valorGrade = (valorMax / numLinhasGrade) * i;
    const y = escalaY(valorGrade);

    svg.appendChild(svgEl('line', {
      x1: margem.esquerda, x2: largura - margem.direita,
      y1: y, y2: y,
      stroke: 'rgba(236,234,224,0.07)', 'stroke-width': 1
    }));

    svg.appendChild(svgEl('text', {
      x: margem.esquerda - 8, y: y + 4,
      'text-anchor': 'end',
      'font-size': 10, fill: '#93a692', 'font-family': "'IBM Plex Mono', monospace"
    })).textContent = formatMil(Math.round(valorGrade / 100) * 100);
  }

  // ---- Monta a lista de pontos (x, y) de cada ano ----
  const pontos = dados.map((v, i) => ({ x: escalaX(i), y: escalaY(v), valor: v }));

  // ---- Área preenchida abaixo da linha ----
  // Caminho: começa embaixo à esquerda, sobe até o 1º ponto, segue por todos
  // os pontos, desce no último ponto e fecha o caminho na base.
  const baseY = margem.topo + alturaUtil;
  let caminhoArea = `M ${pontos[0].x} ${baseY} `;
  pontos.forEach(p => { caminhoArea += `L ${p.x} ${p.y} `; });
  caminhoArea += `L ${pontos[pontos.length - 1].x} ${baseY} Z`;

  svg.appendChild(svgEl('path', {
    d: caminhoArea,
    fill: 'rgba(227,165,66,0.18)',
    stroke: 'none'
  }));

  // ---- Linha conectando os pontos ----
  const caminhoLinha = pontos.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`).join(' ');
  svg.appendChild(svgEl('path', {
    d: caminhoLinha,
    fill: 'none',
    stroke: '#e3a542',
    'stroke-width': 2.4,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  }));

  // ---- Pontos, valores e rótulos de ano ----
  pontos.forEach((p, i) => {
    // Círculo marcando o ponto de dado
    const circulo = svgEl('circle', {
      cx: p.x, cy: p.y, r: 5,
      fill: '#e3a542', stroke: '#0d1710', 'stroke-width': 2
    });
    // <title> cria uma dica (tooltip) nativa do navegador ao passar o mouse
    const dica = svgEl('title', {});
    dica.textContent = `${labels[i]}: ${formatKm2(p.valor)} km²`;
    circulo.appendChild(dica);
    svg.appendChild(circulo);

    // Valor em km² escrito acima do ponto
    svg.appendChild(svgEl('text', {
      x: p.x, y: p.y - 14,
      'text-anchor': 'middle',
      'font-size': 11, fill: '#eceae0', 'font-family': "'IBM Plex Mono', monospace"
    })).textContent = formatKm2(p.valor);

    // Rótulo do ano no eixo X
    svg.appendChild(svgEl('text', {
      x: p.x, y: altura - 8,
      'text-anchor': 'middle',
      'font-size': 11, fill: '#93a692', 'font-family': "'IBM Plex Sans', sans-serif"
    })).textContent = labels[i];
  });

  container.innerHTML = ''; // limpa o conteúdo anterior, se houver
  container.appendChild(svg);
}

desenharGraficoLinha('chartEvolucao', anos, valores);


/* ==========================================================================
   TABELA — EVOLUÇÃO ANUAL
   Preenche a tabela HTML (#tabelaEvolucao) com os mesmos dados do gráfico
   acima, calculando também a variação percentual em relação ao ano anterior.
   ========================================================================== */

const tbody = document.querySelector('#tabelaEvolucao tbody');

anos.forEach((ano, i) => {
  const v = valores[i];        // valor do ano atual
  const prev = valores[i - 1]; // valor do ano anterior (undefined para o 1º ano)

  const tr = document.createElement('tr');

  // Por padrão, mostra um travessão (não há ano anterior para comparar)
  let deltaCell = '<td class="num">—</td>';

  if (prev !== undefined) {
    const pct = ((v - prev) / prev) * 100;
    const cls = pct < 0 ? 'down' : 'up';   // verde para queda, vermelho para alta
    const arrow = pct < 0 ? '↓' : '↑';
    deltaCell = `<td class="num delta ${cls}">${arrow} ${Math.abs(pct).toFixed(1)}%</td>`;
  }

  tr.innerHTML = `<td>${ano}</td><td class="num">${formatKm2(v)}</td>${deltaCell}`;
  tbody.appendChild(tr);
});


/* ==========================================================================
   GRÁFICO 2 — DESMATAMENTO POR ESTADO EM 2024 (barras horizontais)
   ========================================================================== */

const estados2024 = [
  { nome: 'Pará',           valor: 2217 },
  { nome: 'Mato Grosso',    valor: 1271 },
  { nome: 'Amazonas',       valor: 1143 },
  { nome: 'Outros estados', valor: 1657 } // soma dos demais estados da Amazônia Legal
];

/**
 * Desenha um gráfico de barras horizontais dentro do elemento containerId.
 * @param {string} containerId
 * @param {Array<{nome:string, valor:number}>} itens
 * @param {Array<string>} cores - uma cor por barra
 */
function desenharGraficoBarrasH(containerId, itens, cores) {
  const container = document.getElementById(containerId);

  const largura = 640;
  const alturaPorBarra = 46;
  const altura = alturaPorBarra * itens.length + 20;
  const margem = { esquerda: 118, direita: 60, topo: 10 };
  const larguraUtil = largura - margem.esquerda - margem.direita;

  const valorMax = Math.max(...itens.map(it => it.valor));

  const svg = svgEl('svg', {
    viewBox: `0 0 ${largura} ${altura}`,
    width: '100%',
    height: '100%',
    preserveAspectRatio: 'none'
  });

  itens.forEach((item, i) => {
    const y = margem.topo + i * alturaPorBarra;
    const alturaBarra = 22;
    const larguraBarra = (item.valor / valorMax) * larguraUtil;

    // Nome do estado, à esquerda
    svg.appendChild(svgEl('text', {
      x: margem.esquerda - 12, y: y + alturaBarra / 2 + 4,
      'text-anchor': 'end',
      'font-size': 12, fill: '#eceae0', 'font-family': "'IBM Plex Sans', sans-serif"
    })).textContent = item.nome;

    // Trilho de fundo (mostra a largura total disponível)
    svg.appendChild(svgEl('rect', {
      x: margem.esquerda, y: y,
      width: larguraUtil, height: alturaBarra,
      rx: 2, fill: '#17281c'
    }));

    // Barra preenchida, proporcional ao valor
    const barra = svgEl('rect', {
      x: margem.esquerda, y: y,
      width: larguraBarra, height: alturaBarra,
      rx: 2, fill: cores[i % cores.length]
    });
    const dica = svgEl('title', {});
    dica.textContent = `${item.nome}: ${formatKm2(item.valor)} km²`;
    barra.appendChild(dica);
    svg.appendChild(barra);

    // Valor em km², à direita da barra
    svg.appendChild(svgEl('text', {
      x: margem.esquerda + larguraUtil + 10, y: y + alturaBarra / 2 + 4,
      'text-anchor': 'start',
      'font-size': 11, fill: '#93a692', 'font-family': "'IBM Plex Mono', monospace"
    })).textContent = formatKm2(item.valor) + ' km²';
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

desenharGraficoBarrasH('chartEstados', estados2024, ['#e3a542', '#c98a3a', '#a97a3e', '#5f7361']);


/* ==========================================================================
   LISTA DE ESTADOS (versão em HTML, ao lado do gráfico de barras)
   Gera dinamicamente as linhas com nome do estado, barra de proporção
   e valor em km², reaproveitando os mesmos dados do gráfico acima.
   ========================================================================== */

const stateList = document.getElementById('stateList');
const maxEstado = Math.max(...estados2024.map(e => e.valor));

estados2024.forEach(e => {
  const row = document.createElement('div');
  row.className = 'state-row';

  const larguraPercentual = (e.valor / maxEstado * 100).toFixed(0);

  row.innerHTML = `
    <div class="name">${e.nome}</div>
    <div class="bar-track">
      <div class="bar-fill" style="width:${larguraPercentual}%"></div>
    </div>
    <div class="val">${formatKm2(e.valor)} km²</div>`;

  stateList.appendChild(row);
});


/* ==========================================================================
   GRÁFICO 3 — AMAZÔNIA × CERRADO (barras agrupadas)
   Compara os dois biomas em 2023 e 2024.
   ========================================================================== */

const categoriasBiomas = ['2023', '2024'];
const seriesBiomas = [
  { nome: 'Amazônia Legal', cor: '#e3a542', dados: [9064, 6288] },
  { nome: 'Cerrado',        cor: '#6fa287', dados: [11011, 8174] }
];

function desenharGraficoBarrasAgrupadas(containerId, categorias, series) {
  const container = document.getElementById(containerId);

  const largura = 640;
  const altura = 300;
  const margem = { topo: 24, direita: 18, baixo: 34, esquerda: 46 };
  const larguraUtil = largura - margem.esquerda - margem.direita;
  const alturaUtil = altura - margem.topo - margem.baixo;

  // Maior valor entre todas as séries, para definir a escala do eixo Y
  const valorMax = Math.max(...series.flatMap(s => s.dados)) * 1.15;
  const escalaY = (v) => margem.topo + alturaUtil - (v / valorMax) * alturaUtil;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${largura} ${altura}`,
    width: '100%',
    height: '100%',
    preserveAspectRatio: 'none'
  });

  // ---- Linhas de grade horizontais + rótulos do eixo Y ----
  const numLinhasGrade = 4;
  for (let i = 0; i <= numLinhasGrade; i++) {
    const valorGrade = (valorMax / numLinhasGrade) * i;
    const y = escalaY(valorGrade);
    svg.appendChild(svgEl('line', {
      x1: margem.esquerda, x2: largura - margem.direita,
      y1: y, y2: y,
      stroke: 'rgba(236,234,224,0.07)', 'stroke-width': 1
    }));
    svg.appendChild(svgEl('text', {
      x: margem.esquerda - 8, y: y + 4,
      'text-anchor': 'end',
      'font-size': 10, fill: '#93a692', 'font-family': "'IBM Plex Mono', monospace"
    })).textContent = formatMil(Math.round(valorGrade / 100) * 100);
  }

  // ---- Barras: cada categoria (ano) recebe uma "fatia" de largura igual;
  // dentro de cada fatia, as barras das duas séries ficam lado a lado ----
  const larguraFatia = larguraUtil / categorias.length;
  const larguraBarra = larguraFatia / (series.length + 1.5); // deixa espaço entre grupos
  const espacoEntreBarras = larguraBarra * 0.25;

  categorias.forEach((categoria, iCat) => {
    const inicioFatia = margem.esquerda + iCat * larguraFatia;
    const larguraGrupo = series.length * larguraBarra + (series.length - 1) * espacoEntreBarras;
    const inicioGrupo = inicioFatia + (larguraFatia - larguraGrupo) / 2;

    series.forEach((serie, iSerie) => {
      const valor = serie.dados[iCat];
      const x = inicioGrupo + iSerie * (larguraBarra + espacoEntreBarras);
      const y = escalaY(valor);
      const alturaBarra = margem.topo + alturaUtil - y;

      const barra = svgEl('rect', {
        x: x, y: y,
        width: larguraBarra, height: alturaBarra,
        rx: 2, fill: serie.cor
      });
      const dica = svgEl('title', {});
      dica.textContent = `${serie.nome} (${categoria}): ${formatKm2(valor)} km²`;
      barra.appendChild(dica);
      svg.appendChild(barra);

      // Valor acima da barra
      svg.appendChild(svgEl('text', {
        x: x + larguraBarra / 2, y: y - 6,
        'text-anchor': 'middle',
        'font-size': 10, fill: '#eceae0', 'font-family': "'IBM Plex Mono', monospace"
      })).textContent = formatKm2(valor);
    });

    // Rótulo do ano, centralizado sob o grupo de barras
    svg.appendChild(svgEl('text', {
      x: inicioFatia + larguraFatia / 2, y: altura - 8,
      'text-anchor': 'middle',
      'font-size': 12, fill: '#93a692', 'font-family': "'IBM Plex Sans', sans-serif"
    })).textContent = categoria;
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

desenharGraficoBarrasAgrupadas('chartBiomas', categoriasBiomas, seriesBiomas);
