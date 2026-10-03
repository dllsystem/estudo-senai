/* Filtros da Biblioteca sobre os dados locais, sem chamadas externas. */
(() => {
  "use strict";
  const plain = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const defaults = () => ({ search: "", subject: "", topic: "", sub: "", exam: "", skill: "", method: "", context: "", extra: "", review: "", selectedOnly: false, page: 1 });
  function createModel({ questions, topics, exams, classification }) {
    const records = new Map((classification?.questoes || []).map(r => [r.id, r]));
    const subs = classification?.taxonomia?.subassuntos || [];
    const topicById = new Map(topics.map(t => [String(t.id), t]));
    const subById = new Map(subs.map(s => [String(s.id), s]));
    const vocabulary = classification?.vocabulario || {};
    const searchTexts = new Map(questions.map(q => [q.id, plain([q.id, q.cge, q.enunciado, q.contexto, ...Object.values(q.alternativas)].join(" "))]));
    const topicName = id => topicById.get(String(id).replace(/^t/, ""))?.nome || ({ outro: "Fora do programa listado", insuficiente: "Informação insuficiente" }[id] || id);
    const subName = id => {
      const sub = subById.get(String(id));
      return sub ? sub.nome + (subs.filter(s => s.nome === sub.nome).length > 1 ? ` — ${topicName(sub.assunto_id)}` : "") : id;
    };
    const reviewOptions = [["review", "Precisa de revisão"], ["source", "Conferir fonte original"], ["different", "Diverge da referência de tema"], ["outside", "Fora do programa listado"]];
    const options = (key, filters = defaults()) => {
      if (key === "subject") return [...new Set(questions.map(q => q.disciplina))].map(s => [s, s]);
      if (key === "topic") return topics.filter(t => !filters.subject || t.disciplina === filters.subject).map(t => [String(t.id), t.nome]);
      if (key === "sub") return subs.filter(s => (!filters.topic || String(s.assunto_id) === String(filters.topic)) && (!filters.subject || topicById.get(String(s.assunto_id))?.disciplina === filters.subject)).map(s => [String(s.id), subName(s.id)]);
      if (key === "exam") return exams.map(e => [String(e.cge), `CGE ${e.cge} · ${e.ano}`]);
      if (key === "review") return reviewOptions;
      return Object.entries(vocabulary[{ skill: "habilidade", method: "metodo", context: "contexto", extra: "extra" }[key]] || {});
    };
    function change(filters, key, value) {
      const next = { ...filters, [key]: value, page: 1 };
      if (key === "subject" || key === "topic") {
        if (next.topic && !options("topic", next).some(([id]) => id === String(next.topic))) next.topic = "";
        if (next.sub && !options("sub", next).some(([id]) => id === String(next.sub))) next.sub = "";
      }
      return next;
    }
    function filter(filters, selectedIds = []) {
      const f = { ...defaults(), ...filters }, selected = new Set(selectedIds), needle = plain(f.search.trim());
      return questions.filter(q => {
        const r = records.get(q.id);
        return (!f.subject || q.disciplina === f.subject) &&
          (!f.topic || (r ? r.principal === `t${f.topic}` || r.assuntos.includes(`t${f.topic}`) : q.temas.includes(Number(f.topic)))) &&
          (!f.sub || r?.subassuntos.includes(String(f.sub))) &&
          (!f.exam || String(q.cge) === String(f.exam)) &&
          (!f.skill || r?.habilidades.includes(f.skill)) &&
          (!f.method || r?.metodo === f.method) &&
          (!f.context || r?.contexto === f.context) &&
          (!f.extra || r?.extras.includes(f.extra)) &&
          (!f.review || (f.review === "review" && r?.revisar) || (f.review === "source" && r?.precisa_fonte) || (f.review === "different" && r?.concorda_referencia === false) || (f.review === "outside" && r?.principal === "outro")) &&
          (!f.selectedOnly || selected.has(q.id)) && (!needle || searchTexts.get(q.id).includes(needle));
      });
    }
    return { defaults, records, subs, vocabulary, classification, options, change, filter, topicName, subName,
      label: (key, value) => options(key).find(([id]) => id === String(value))?.[1] || String(value),
      hasClassification: records.size > 0 };
  }
  window.SENAI_LIBRARY = { createModel, defaults };
})();
