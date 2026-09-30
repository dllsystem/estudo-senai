/* Funções sem DOM, compartilhadas pelo montador e pelos testes. Medidas em mm. */
(() => {
  "use strict";
  const GAP = 3, FRAME_BOTTOM_PADDING = 1;
  const COLUMN_GAP = GAP - FRAME_BOTTOM_PADDING; // Mesmo intervalo visível entre as bordas das questões.
  function settings(raw = {}) {
    const scale = Number(raw.scale);
    const margin = raw.margin == null || String(raw.margin).trim() === "" ? NaN : Number(raw.margin);
    return {
      orientation: raw.orientation === "landscape" ? "landscape" : "portrait",
      columns: [1, 2, 3].includes(Number(raw.columns)) ? Number(raw.columns) : 1,
      scale: Number.isFinite(scale) && scale > 0 ? Math.min(100, Math.max(25, Math.round(scale))) : 100,
      maxPerColumn: [2, 3].includes(Number(raw.maxPerColumn)) ? Number(raw.maxPerColumn) : 0,
      showHeader: raw.showHeader !== false,
      repeatHeader: raw.repeatHeader === true,
      margin: Number.isFinite(margin) ? Math.min(30, Math.max(5, Math.round(margin))) : 12,
      questionBorder: raw.questionBorder !== false,
      imagesPerRow: [2, 3].includes(Number(raw.imagesPerRow)) ? Number(raw.imagesPerRow) : 1,
    };
  }
  function headerHeight(options, first) {
    return first ? (options.showHeader !== false ? 40 : 0) : (options.repeatHeader === true ? 14 : 0);
  }
  function layout(raw) {
    const options = settings(raw);
    const pageWidth = options.orientation === "landscape" ? 297 : 210;
    const pageHeight = options.orientation === "landscape" ? 210 : 297;
    const width = pageWidth - 2 * options.margin, height = pageHeight - 2 * options.margin;
    const columnWidth = (width - COLUMN_GAP * (options.columns - 1)) / options.columns;
    const originWidth = Math.min(54, width - 104);
    return { ...options, pageWidth, pageHeight, width, height, columnWidth,
      keyColumnWidths: [32, originWidth, width - originWidth - 60, 28],
      footerTop: pageHeight - options.margin / 2 - 2,
      labelHeight: columnWidth < 140 ? 10 : 7, badgeWidth: columnWidth < 140 ? 18 : 26 };
  }
  function restore(raw, byId) {
    if (!raw || typeof raw !== "object") raw = {};
    return {
      ids: [...new Set(Array.isArray(raw.ids) ? raw.ids.filter(id => typeof id === "string" && byId.has(id)) : [])],
      title: typeof raw.title === "string" ? raw.title.slice(0, 120) : "Lista de exercícios",
      className: typeof raw.className === "string" ? raw.className.slice(0, 80) : "",
      date: typeof raw.date === "string" ? raw.date.slice(0, 30) : "",
      ...settings(raw),
    };
  }
  function move(ids, index, direction) {
    const result = ids.slice(), target = index + direction;
    if (index >= 0 && index < result.length && target >= 0 && target < result.length) {
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }
  function answer(q) {
    return q.gabarito === "anulada" ? "Anulada" : q.gabarito === "válida" && /^[A-E]$/.test(q.resposta) ? q.resposta : "Sem gabarito";
  }
  function blocksFor(q, index, format) {
    if (!q.recortes?.length) throw new Error(`A questão ${q.id} não tem recortes disponíveis.`);
    const count = Math.min(format.imagesPerRow, q.recortes.length);
    const cellWidth = (format.columnWidth - GAP * (count - 1)) / count;
    const images = q.recortes.map((crop, part) => {
        if (!(crop.largura > 0 && crop.altura > 0)) throw new Error(`Recorte inválido: ${q.id}`);
        const scale = Math.min(cellWidth / crop.largura,
          (format.height - Math.max(headerHeight(format, true), headerHeight(format, false)) - format.labelHeight - GAP) / crop.altura) * format.scale / 100;
        return { id: q.id, cge: q.cge, numero: q.numero, index: index + 1,
          crop, part: part + 1, parts: q.recortes.length,
          width: crop.largura * scale, height: crop.altura * scale,
          columnWidth: cellWidth, labelHeight: format.labelHeight, badgeWidth: format.badgeWidth,
          total: crop.altura * scale + format.labelHeight + GAP };
    });
    const rows = [];
    for (let start = 0; start < images.length; start += count) {
      const items = images.slice(start, start + count);
      const height = Math.max(...items.map(item => item.height));
      rows.push({...items[0], items, columnWidth: format.columnWidth, height,
        lastPart: items[items.length - 1].part, total: height + format.labelHeight + GAP});
    }
    return rows;
  }
  function makePage(format, first = false) {
    const used = headerHeight(format, first);
    return { items: [], rows: [], used, columnIndex: 0,
      columns: Array.from({length: format.columns}, () => ({used, items: [], rows: [], questionCount: 0, lastId: null})) };
  }
  function appendQuestion(pages, blocks, format) {
    const advance = () => {
      let page = pages[pages.length - 1];
      if (page.columnIndex + 1 < format.columns) page.columnIndex++;
      else { page = makePage(format); pages.push(page); }
      return page;
    };
    const total = blocks.reduce((sum, block) => sum + block.total, 0);
    let page = pages[pages.length - 1];
    let column = page.columns[page.columnIndex];
    if ((format.maxPerColumn && column.questionCount >= format.maxPerColumn) ||
        (column.items.length && total <= format.height - headerHeight(format, false) && column.used + total > format.height)) {
      page = advance(); column = page.columns[page.columnIndex];
    }
    for (const block of blocks) {
      if (column.used + block.total > format.height + .01) { page = advance(); column = page.columns[page.columnIndex]; }
      const row = {...block, column: page.columnIndex,
        x: page.columnIndex * (format.columnWidth + COLUMN_GAP), y: column.used};
      row.items = block.items.map((image, i) => ({...image, column: row.column,
        x: row.x + i * (image.columnWidth + GAP), y: row.y}));
      if (column.lastId !== row.id) { column.questionCount++; column.lastId = row.id; }
      page.rows.push(row); column.rows.push(row);
      page.items.push(...row.items); column.items.push(...row.items); column.used += block.total;
      page.used = Math.max(page.used, column.used);
    }
  }
  function pack(questions, options) {
    if (!questions.length) return [];
    const format = layout(options), pages = [makePage(format, true)];
    questions.forEach((q, index) => appendQuestion(pages, blocksFor(q, index, format), format));
    return pages;
  }
  function keyPages(questions, options) {
    const format = layout(options), pages = [];
    for (let start = 0; start < questions.length;) {
      const size = Math.floor((format.height - headerHeight(format, start === 0) - 7) / 7);
      pages.push({ start, questions: questions.slice(start, start + size) }); start += size;
    }
    return pages;
  }
  function caption(item) {
    const part = item.lastPart > item.part ? `Imagens ${item.part}-${item.lastPart}/${item.parts}` :
      `${item.crop.tipo === "apoio" ? "Apoio" : "Questão"}${item.parts > 1 ? ` · parte ${item.part}/${item.parts}` : ""}`;
    return item.columnWidth < 140 ? [`CGE ${item.cge} · ${item.columnWidth < 65 ? "nº" : "original"} ${item.numero}`, part] :
      [`Questão ${item.index} · CGE ${item.cge} / original ${item.numero} · ${part}`];
  }
  function questionFrames(page) {
    const frames = [];
    for (const item of page.rows) {
      const previous = frames[frames.length - 1];
      const bottom = item.y + item.labelHeight + item.height + FRAME_BOTTOM_PADDING;
      if (previous && previous.id === item.id && previous.column === item.column) {
        previous.height = Math.max(previous.height, bottom - previous.y);
      } else frames.push({id: item.id, index: item.index, column: item.column,
        x: item.x, y: item.y, width: item.columnWidth, height: bottom - item.y});
    }
    return frames;
  }

  function organize(questions, mode, options) {
    if (!["subject", "space", "subject-space"].includes(mode)) throw new Error("Organização desconhecida.");
    const subjects = ["Língua Portuguesa", "Matemática", "Ciências"];
    const grouped = mode !== "space";
    const baseline = questions.slice();
    if (grouped) baseline.sort((a, b) => {
      const rank = q => subjects.includes(q.disciplina) ? subjects.indexOf(q.disciplina) : subjects.length;
      return rank(a) - rank(b) || (a.disciplina || "").localeCompare(b.disciplina || "", "pt-BR");
    });
    if (mode === "subject" || baseline.length < 2) return baseline;
    const format = layout(options);
    const entries = baseline.map((q, index) => {
      const blocks = blocksFor(q, index, format);
      return { q, blocks, total: blocks.reduce((sum, block) => sum + block.total, 0) };
    });
    const groups = [];
    for (const entry of entries) {
      if (!groups.length || (grouped && groups[groups.length - 1][0].q.disciplina !== entry.q.disciplina)) groups.push([]);
      groups[groups.length - 1].push(entry);
    }
    // Compara ordens inteiras, preservando partes e a escala escolhida pelo usuário.
    const score = ordered => {
      const pages = pack(ordered, options);
      return [pages.length, pages.slice(0, -1).reduce((sum, page) =>
        sum + page.columns.reduce((space, column) => space + format.height - column.used, 0), 0)];
    };
    let best = baseline, bestScore = score(best);
    for (const strategy of ["largest", "smallest", "original"]) {
      const pages = [makePage(format, true)], candidate = [];
      for (const group of groups) {
        const remaining = group.slice();
        while (remaining.length) {
          const page = pages[pages.length - 1], column = page.columns[page.columnIndex];
          const available = format.maxPerColumn && column.questionCount >= format.maxPerColumn ? 0 : format.height - column.used;
          let chosen = -1;
          // Preenche o espaço restante com a maior questão completa que cabe nele.
          for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].total <= available && (chosen < 0 || remaining[i].total > remaining[chosen].total)) chosen = i;
          }
          if (chosen < 0) {
            chosen = 0;
            for (let i = 1; i < remaining.length; i++) {
              if ((strategy === "largest" && remaining[i].total > remaining[chosen].total) ||
                  (strategy === "smallest" && remaining[i].total < remaining[chosen].total)) chosen = i;
            }
          }
          const [entry] = remaining.splice(chosen, 1);
          candidate.push(entry.q);appendQuestion(pages, entry.blocks, format);
        }
      }
      const currentScore = score(candidate);
      if (currentScore[0] < bestScore[0] || (currentScore[0] === bestScore[0] && currentScore[1] < bestScore[1] - .01)) {
        best = candidate;bestScore = currentScore;
      }
    }
    return best;
  }
  window.SENAI_PRINT = { settings, headerHeight, layout, restore, move, answer, pack, keyPages, caption, questionFrames, organize };
})();
