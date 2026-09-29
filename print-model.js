/* Funções sem DOM, compartilhadas pelo montador e pelos testes. Medidas em mm. */
(() => {
  "use strict";
  const WIDTH = 186, HEIGHT = 273, LABEL = 7, GAP = 3;
  function restore(raw, byId) {
    if (!raw || typeof raw !== "object") raw = {};
    return {
      ids: [...new Set(Array.isArray(raw.ids) ? raw.ids.filter(id => typeof id === "string" && byId.has(id)) : [])],
      title: typeof raw.title === "string" ? raw.title.slice(0, 120) : "Lista de exercícios",
      className: typeof raw.className === "string" ? raw.className.slice(0, 80) : "",
      date: typeof raw.date === "string" ? raw.date.slice(0, 30) : "",
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
  function blocksFor(q, index) {
    if (!q.recortes?.length) throw new Error(`A questão ${q.id} não tem recortes disponíveis.`);
    return q.recortes.map((crop, part) => {
        if (!(crop.largura > 0 && crop.altura > 0)) throw new Error(`Recorte inválido: ${q.id}`);
        const scale = Math.min(WIDTH / crop.largura, (HEIGHT - 40 - LABEL - GAP) / crop.altura);
        return { id: q.id, cge: q.cge, numero: q.numero, index: index + 1,
          crop, part: part + 1, parts: q.recortes.length,
          width: crop.largura * scale, height: crop.altura * scale,
          total: crop.altura * scale + LABEL + GAP };
    });
  }
  function appendQuestion(pages, blocks) {
    const newPage = () => { const page = { items: [], used: 14 }; pages.push(page); return page; };
    const total = blocks.reduce((sum, block) => sum + block.total, 0);
    let page = pages[pages.length - 1];
    if (page.items.length && total <= HEIGHT - 14 && page.used + total > HEIGHT) page = newPage();
    for (const block of blocks) {
      if (page.used + block.total > HEIGHT + .01) page = newPage();
      page.items.push(block); page.used += block.total;
    }
  }
  function pack(questions) {
    if (!questions.length) return [];
    const pages = [{ items: [], used: 40 }];
    questions.forEach((q, index) => appendQuestion(pages, blocksFor(q, index)));
    return pages;
  }

  function organize(questions, mode) {
    if (!["subject", "space", "subject-space"].includes(mode)) throw new Error("Organização desconhecida.");
    const subjects = ["Língua Portuguesa", "Matemática", "Ciências"];
    const grouped = mode !== "space";
    const baseline = questions.slice();
    if (grouped) baseline.sort((a, b) => {
      const rank = q => subjects.includes(q.disciplina) ? subjects.indexOf(q.disciplina) : subjects.length;
      return rank(a) - rank(b) || (a.disciplina || "").localeCompare(b.disciplina || "", "pt-BR");
    });
    if (mode === "subject" || baseline.length < 2) return baseline;
    const entries = baseline.map((q, index) => {
      const blocks = blocksFor(q, index);
      return { q, blocks, total: blocks.reduce((sum, block) => sum + block.total, 0) };
    });
    const groups = [];
    for (const entry of entries) {
      if (!groups.length || (grouped && groups[groups.length - 1][0].q.disciplina !== entry.q.disciplina)) groups.push([]);
      groups[groups.length - 1].push(entry);
    }
    // Compara ordens inteiras: nunca intercala partes de questões nem reduz imagens para economizar papel.
    const score = ordered => {
      const pages = pack(ordered);
      return [pages.length, pages.slice(0, -1).reduce((sum, page) => sum + HEIGHT - page.used, 0)];
    };
    let best = baseline, bestScore = score(best);
    for (const strategy of ["largest", "smallest", "original"]) {
      const pages = [{ items: [], used: 40 }], candidate = [];
      for (const group of groups) {
        const remaining = group.slice();
        while (remaining.length) {
          const available = HEIGHT - pages[pages.length - 1].used;
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
          candidate.push(entry.q);appendQuestion(pages, entry.blocks);
        }
      }
      const currentScore = score(candidate);
      if (currentScore[0] < bestScore[0] || (currentScore[0] === bestScore[0] && currentScore[1] < bestScore[1] - .01)) {
        best = candidate;bestScore = currentScore;
      }
    }
    return best;
  }
  window.SENAI_PRINT = { restore, move, answer, pack, organize };
})();
